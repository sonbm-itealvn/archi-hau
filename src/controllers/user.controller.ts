import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { Role } from "../entities/Role";
import { UserRole } from "../entities/UserRole";
import { hashPassword } from "../utils/password";

const userRepository = () => AppDataSource.getRepository(User);
const roleRepository = () => AppDataSource.getRepository(Role);
const userRoleRepository = () => AppDataSource.getRepository(UserRole);
const userRelations = ["userRoles", "userRoles.role", "posts"];

const parseId = (value: string): number | null => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
};

const handleError = (res: Response, error: unknown, message: string) => {
  const details = error instanceof Error ? error.message : error;
  console.error(message, details);
  return res.status(500).json({ message, details });
};

export const getUsers = async (_: Request, res: Response) => {
  try {
    const users = await userRepository().find({
      relations: userRelations,
      order: { created_at: "DESC" },
    });
    return res.json(users);
  } catch (error) {
    return handleError(res, error, "Failed to fetch users");
  }
};

export const getUserById = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  try {
    const user = await userRepository().findOne({
      where: { id },
      relations: userRelations,
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    return handleError(res, error, "Failed to fetch user");
  }
};

export const createUser = async (req: Request, res: Response) => {
  const payload = req.body as Partial<User> & {
    roles?: string[];
    password?: string;
  };
  const requiredFields: Array<keyof User | "password"> = [
    "username",
    "email",
  ];
  const missingFields = requiredFields.filter((field) => !payload[field]);

  if (missingFields.length > 0) {
    return res.status(400).json({
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  if (!payload.password && !payload.password_hash) {
    return res.status(400).json({
      message: "password is required",
    });
  }

  try {
    const { roles, password, password_hash, ...userPayload } = payload;

    const passwordHash = password_hash ?? (await hashPassword(password!));

    const normalizedRoles =
      roles
        ?.map((role) => role.trim().toLowerCase())
        .filter(Boolean) ?? [];
    const uniqueRoleNames = Array.from(new Set(normalizedRoles));

    const user = userRepository().create({
      ...userPayload,
      password_hash: passwordHash,
    });
    const savedUser = await userRepository().save(user);

    if (uniqueRoleNames.length > 0) {
      const roleEntities = await roleRepository()
        .createQueryBuilder("role")
        .where("LOWER(role.name) IN (:...names)", { names: uniqueRoleNames })
        .getMany();

      if (roleEntities.length !== uniqueRoleNames.length) {
        return res
          .status(404)
          .json({ message: "One or more roles do not exist" });
      }

      const userRoles = roleEntities.map((role) =>
        userRoleRepository().create({
          user: savedUser,
          role,
          user_id: savedUser.id,
          role_id: role.id,
        })
      );
      await userRoleRepository().save(userRoles);
    }

    const withRelations = await userRepository().findOne({
      where: { id: savedUser.id },
      relations: userRelations,
    });
    return res.status(201).json(withRelations ?? savedUser);
  } catch (error) {
    return handleError(res, error, "Failed to create user");
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  try {
    const repo = userRepository();
    const existing = await repo.findOne({
      where: { id },
      relations: userRelations,
    });

    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    const updates = req.body as Partial<User> & {
      roles?: string[];
      password?: string;
    };
    delete (updates as Partial<User> & { id?: number }).id;

    let roleEntities: Role[] = [];
    let shouldUpdateRoles = false;
    if (updates.roles !== undefined) {
      shouldUpdateRoles = true;
      const normalizedRoles =
        updates.roles
          ?.map((role) => role.trim().toLowerCase())
          .filter(Boolean) ?? [];
      const uniqueRoleNames = Array.from(new Set(normalizedRoles));

      if (uniqueRoleNames.length > 0) {
        roleEntities = await roleRepository()
          .createQueryBuilder("role")
          .where("LOWER(role.name) IN (:...names)", { names: uniqueRoleNames })
          .getMany();

        if (roleEntities.length !== uniqueRoleNames.length) {
          return res
            .status(404)
            .json({ message: "One or more roles do not exist" });
        }
      }
    }

    const { roles, password, password_hash, ...rest } = updates;
    let passwordHash: string | undefined;
    if (password) {
      passwordHash = await hashPassword(password);
    } else if (password_hash) {
      passwordHash = password_hash;
    }

    const updatedUser = repo.merge(existing, {
      ...rest,
      ...(passwordHash ? { password_hash: passwordHash } : {}),
    });
    const savedUser = await repo.save(updatedUser);

    if (shouldUpdateRoles) {
      await userRoleRepository().delete({ user_id: id });
      if (roleEntities.length > 0) {
        const userRoles = roleEntities.map((role) =>
          userRoleRepository().create({
            user: savedUser,
            role,
            user_id: savedUser.id,
            role_id: role.id,
          })
        );
        await userRoleRepository().save(userRoles);
      }
    }

    const withRelations = await repo.findOne({
      where: { id: savedUser.id },
      relations: userRelations,
    });
    return res.json(withRelations ?? savedUser);
  } catch (error) {
    return handleError(res, error, "Failed to update user");
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  try {
    const repo = userRepository();
    const existing = await repo.findOneBy({ id });
    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    await repo.softRemove(existing);
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error, "Failed to delete user");
  }
};

export const assignRoleToUser = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  const { role } = req.body as { role?: string };
  if (!role) {
    return res.status(400).json({ message: "role is required" });
  }

  try {
    const user = await userRepository().findOne({
      where: { id },
      relations: ["userRoles", "userRoles.role"],
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const normalizedRole = role.trim().toLowerCase();
    const existingRole = user.userRoles?.find(
      (ur) => ur.role?.name.toLowerCase() === normalizedRole
    );
    if (existingRole) {
      return res.status(409).json({ message: "User already has this role" });
    }

    const roleEntity = await roleRepository()
      .createQueryBuilder("role")
      .where("LOWER(role.name) = :name", { name: normalizedRole })
      .getOne();

    if (!roleEntity) {
      return res.status(404).json({ message: "Role not found" });
    }

    const userRole = userRoleRepository().create({
      user,
      role: roleEntity,
      user_id: user.id,
      role_id: roleEntity.id,
    });
    await userRoleRepository().save(userRole);

    const updatedUser = await userRepository().findOne({
      where: { id },
      relations: userRelations,
    });
    return res.json(updatedUser ?? user);
  } catch (error) {
    return handleError(res, error, "Failed to assign role");
  }
};

export const removeRoleFromUser = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const { roleName } = req.params;
  if (!id) {
    return res.status(400).json({ message: "Invalid user id" });
  }
  if (!roleName) {
    return res.status(400).json({ message: "roleName is required" });
  }

  try {
    const user = await userRepository().findOne({
      where: { id },
      relations: ["userRoles", "userRoles.role"],
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const normalizedRole = roleName.trim().toLowerCase();
    const targetUserRole = user.userRoles?.find(
      (ur) => ur.role?.name.toLowerCase() === normalizedRole
    );

    if (!targetUserRole) {
      return res.status(404).json({ message: "Role not assigned to user" });
    }

    await userRoleRepository().delete({
      user_id: id,
      role_id: targetUserRole.role_id ?? targetUserRole.role?.id,
    });

    const updatedUser = await userRepository().findOne({
      where: { id },
      relations: userRelations,
    });

    return res.json(updatedUser ?? user);
  } catch (error) {
    return handleError(res, error, "Failed to remove role");
  }
};
