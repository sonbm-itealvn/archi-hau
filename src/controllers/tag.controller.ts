import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Tag } from "../entities/Tag";

const tagRepository = () => AppDataSource.getRepository(Tag);
const tagRelations = ["postTags"];

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

export const getTags = async (_: Request, res: Response) => {
  try {
    const tags = await tagRepository().find({
      relations: tagRelations,
      order: { name: "ASC" },
    });
    return res.json(tags);
  } catch (error) {
    return handleError(res, error, "Failed to fetch tags");
  }
};

export const getTagById = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid tag id" });
  }

  try {
    const tag = await tagRepository().findOne({
      where: { id },
      relations: tagRelations,
    });

    if (!tag) {
      return res.status(404).json({ message: "Tag not found" });
    }

    return res.json(tag);
  } catch (error) {
    return handleError(res, error, "Failed to fetch tag");
  }
};

export const createTag = async (req: Request, res: Response) => {
  const payload = req.body as Partial<Tag>;
  const requiredFields: Array<keyof Tag> = ["name", "slug"];
  const missing = requiredFields.filter((field) => !payload[field]);

  if (missing.length > 0) {
    return res.status(400).json({
      message: `Missing required fields: ${missing.join(", ")}`,
    });
  }

  try {
    const repo = tagRepository();
    const tag = repo.create(payload);
    const saved = await repo.save(tag);
    const withRelations = await repo.findOne({
      where: { id: saved.id },
      relations: tagRelations,
    });

    return res.status(201).json(withRelations ?? saved);
  } catch (error) {
    return handleError(res, error, "Failed to create tag");
  }
};

export const updateTag = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid tag id" });
  }

  try {
    const repo = tagRepository();
    const existing = await repo.findOneBy({ id });

    if (!existing) {
      return res.status(404).json({ message: "Tag not found" });
    }

    const tag = repo.merge(existing, req.body as Partial<Tag>);
    const saved = await repo.save(tag);
    const withRelations = await repo.findOne({
      where: { id: saved.id },
      relations: tagRelations,
    });

    return res.json(withRelations ?? saved);
  } catch (error) {
    return handleError(res, error, "Failed to update tag");
  }
};

export const deleteTag = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid tag id" });
  }

  try {
    const repo = tagRepository();
    const tag = await repo.findOneBy({ id });
    if (!tag) {
      return res.status(404).json({ message: "Tag not found" });
    }

    await repo.remove(tag);
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error, "Failed to delete tag");
  }
};
