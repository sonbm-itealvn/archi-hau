import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../entities/User";

const userRepository = () => AppDataSource.getRepository(User);

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
      relations: ["userRoles", "userRoles.role", "posts"],
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
      relations: ["userRoles", "userRoles.role", "posts"],
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
  const payload = req.body as Partial<User>;
  const requiredFields: Array<keyof User> = ["username", "password_hash", "email"];
  const missingFields = requiredFields.filter((field) => !payload[field]);

  if (missingFields.length > 0) {
    return res.status(400).json({
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  try {
    const user = userRepository().create(payload);
    const savedUser = await userRepository().save(user);
    return res.status(201).json(savedUser);
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
    const existing = await repo.findOneBy({ id });

    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    const updates = req.body as Partial<User>;
    delete (updates as Partial<User> & { id?: number }).id;

    const updatedUser = repo.merge(existing, updates);
    const savedUser = await repo.save(updatedUser);
    return res.json(savedUser);
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

    await repo.remove(existing);
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error, "Failed to delete user");
  }
};
