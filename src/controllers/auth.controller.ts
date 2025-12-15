import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { Role } from "../entities/Role";
import { UserRole } from "../entities/UserRole";
import { hashPassword, verifyPassword } from "../utils/password";

const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET ?? process.env.JWT_SECRET ?? "dev-secret";
const REFRESH_TOKEN_SECRET =
  process.env.JWT_REFRESH_SECRET ??
  process.env.REFRESH_TOKEN_SECRET ??
  process.env.JWT_SECRET ??
  "dev-secret";
const ACCESS_TOKEN_EXPIRES_IN =
  process.env.ACCESS_TOKEN_EXPIRES_IN ?? process.env.JWT_EXPIRES_IN ?? "30m";
const REFRESH_TOKEN_EXPIRES_IN =
  process.env.REFRESH_TOKEN_EXPIRES_IN ?? "1d";
const DEFAULT_ROLE = process.env.DEFAULT_USER_ROLE ?? "editor";

const userRepository = () => AppDataSource.getRepository(User);
const roleRepository = () => AppDataSource.getRepository(Role);
const userRoleRepository = () => AppDataSource.getRepository(UserRole);

const handleAuthError = (res: Response, error: unknown, message: string) => {
  console.error(message, error);
  return res.status(500).json({ message });
};

const extractRoles = (user: User): string[] => {
  if (!user.userRoles) {
    return [];
  }
  return user.userRoles
    .map((ur) => ur.role?.name)
    .filter((role): role is string => Boolean(role));
};

const sanitizeUser = (user: User, roles: string[]) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  full_name: user.full_name,
  status: user.status,
  avatar_url: user.avatar_url,
  roles,
});

const signAccessToken = (user: User, roles: string[]) =>
  jwt.sign(
    {
      sub: user.id,
      username: user.username,
      roles,
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );

const signRefreshToken = (user: User, roles: string[]) =>
  jwt.sign(
    {
      sub: user.id,
      username: user.username,
      roles,
    },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );

const issueTokens = (user: User, roles: string[]) => ({
  access_token: signAccessToken(user, roles),
  refresh_token: signRefreshToken(user, roles),
});

interface TokenPayload {
  sub: number;
  username: string;
  roles?: string[];
  iat?: number;
  exp?: number;
}

export const register = async (req: Request, res: Response) => {
  const { username, email, password, full_name, avatar_url } = req.body as {
    username?: string;
    email?: string;
    password?: string;
    full_name?: string;
    avatar_url?: string;
  };

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ message: "username, email and password are required" });
  }

  try {
    const existing = await userRepository().findOne({
      where: [{ username }, { email }],
    });

    if (existing) {
      return res
        .status(409)
        .json({ message: "Username or email already registered" });
    }

    const passwordHash = await hashPassword(password);
    const user = userRepository().create({
      username,
      email,
      password_hash: passwordHash,
      full_name,
      avatar_url,
    });

    const savedUser = await userRepository().save(user);

    const defaultRole = await roleRepository().findOne({
      where: { name: DEFAULT_ROLE },
    });
    if (defaultRole) {
      const userRole = userRoleRepository().create({
        user: savedUser,
        role: defaultRole,
        user_id: savedUser.id,
        role_id: defaultRole.id,
      });
      await userRoleRepository().save(userRole);
    }

    const freshUser = await userRepository().findOne({
      where: { id: savedUser.id },
      relations: ["userRoles", "userRoles.role"],
    });

    const roles = extractRoles(freshUser ?? savedUser);
    const tokens = issueTokens(savedUser, roles);

    return res.status(201).json({
      ...tokens,
      user: sanitizeUser(freshUser ?? savedUser, roles),
    });
  } catch (error) {
    return handleAuthError(res, error, "Failed to register user");
  }
};

export const login = async (req: Request, res: Response) => {
  const { identifier, password } = req.body as {
    identifier?: string;
    password?: string;
  };

  if (!identifier || !password) {
    return res
      .status(400)
      .json({ message: "identifier and password are required" });
  }

  try {
    const user = await userRepository().findOne({
      where: [{ username: identifier }, { email: identifier }],
      relations: ["userRoles", "userRoles.role"],
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const roles = extractRoles(user);
    const tokens = issueTokens(user, roles);

    return res.json({
      ...tokens,
      user: sanitizeUser(user, roles),
    });
  } catch (error) {
    return handleAuthError(res, error, "Failed to login");
  }
};

export const getProfile = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const user = await userRepository().findOne({
      where: { id: req.user.id },
      relations: ["userRoles", "userRoles.role"],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const roles = extractRoles(user);
    return res.json({ user: sanitizeUser(user, roles) });
  } catch (error) {
    return handleAuthError(res, error, "Failed to load profile");
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  const { refresh_token, refreshToken: camelRefresh } = req.body as {
    refresh_token?: string;
    refreshToken?: string;
  };
  const token = refresh_token ?? camelRefresh;

  if (!token) {
    return res
      .status(400)
      .json({ message: "refresh_token is required in request body" });
  }

  try {
    const payload = jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload;

    const user = await userRepository().findOne({
      where: { id: payload.sub },
      relations: ["userRoles", "userRoles.role"],
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const roles = extractRoles(user);
    const tokens = issueTokens(user, roles);

    return res.json({
      ...tokens,
      user: sanitizeUser(user, roles),
    });
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Invalid or expired refresh token" });
  }
};
