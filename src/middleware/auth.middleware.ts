import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../data-source";
import { User } from "../entities/User";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";

interface TokenPayload {
  sub: number;
  username: string;
  roles?: string[];
  iat?: number;
  exp?: number;
}

const extractRoles = (user: User): string[] => {
  if (!user.userRoles) {
    return [];
  }
  return user.userRoles
    .map((userRole) => userRole.role?.name)
    .filter((roleName): roleName is string => Boolean(roleName));
};

const sanitizeUser = (user: User, roles: string[]) => ({
  id: user.id,
  username: user.username,
  roles,
});

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization header missing" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;

    const user = await AppDataSource.getRepository(User).findOne({
      where: { id: payload.sub },
      relations: ["userRoles", "userRoles.role"],
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const roles = extractRoles(user);
    req.user = sanitizeUser(user, roles);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const authorizeRoles =
  (...allowedRoles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (allowedRoles.length === 0) {
      return next();
    }

    const normalizedAllowed = allowedRoles.map((role) => role.toLowerCase());
    const hasRole = req.user.roles.some((role: string) =>
      normalizedAllowed.includes(role.toLowerCase())
    );
    if (!hasRole) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    return next();
  };
