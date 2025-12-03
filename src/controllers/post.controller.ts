import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Post } from "../entities/Post";
import { User } from "../entities/User";

const postRepository = () => AppDataSource.getRepository(Post);
const userRepository = () => AppDataSource.getRepository(User);
const postRelations = ["author", "postCategories", "postTags"];

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

export const getPosts = async (_: Request, res: Response) => {
  try {
    const posts = await postRepository().find({
      relations: postRelations,
      order: { created_at: "DESC" },
    });
    return res.json(posts);
  } catch (error) {
    return handleError(res, error, "Failed to fetch posts");
  }
};

export const getPostById = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid post id" });
  }

  try {
    const post = await postRepository().findOne({
      where: { id },
      relations: postRelations,
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    return res.json(post);
  } catch (error) {
    return handleError(res, error, "Failed to fetch post");
  }
};

export const createPost = async (req: Request, res: Response) => {
  const body = req.body as Partial<Post> & { author_id?: number | string };
  const authorIdRaw =
    body.author_id !== undefined ? Number(body.author_id) : req.user?.id;
  const authorId = authorIdRaw ?? null;

  if (!authorId || Number.isNaN(authorId)) {
    return res.status(400).json({ message: "author_id is required" });
  }

  try {
    const author = await userRepository().findOneBy({ id: authorId });
    if (!author) {
      return res.status(404).json({ message: "Author not found" });
    }

    const { author_id: _authorId, ...postPayload } = body;
    const post = postRepository().create({
      ...postPayload,
      author,
    });

    const savedPost = await postRepository().save(post);
    const postWithRelations = await postRepository().findOne({
      where: { id: savedPost.id },
      relations: postRelations,
    });

    return res.status(201).json(postWithRelations ?? savedPost);
  } catch (error) {
    return handleError(res, error, "Failed to create post");
  }
};

export const updatePost = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid post id" });
  }

  const body = req.body as Partial<Post> & { author_id?: number | string };

  try {
    const repo = postRepository();
    const existing = await repo.findOne({
      where: { id },
      relations: ["author"],
    });

    if (!existing) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (body.author_id !== undefined) {
      const authorId = Number(body.author_id);
      if (!authorId || Number.isNaN(authorId)) {
        return res.status(400).json({ message: "author_id must be a positive number" });
      }

      const author = await userRepository().findOneBy({ id: authorId });
      if (!author) {
        return res.status(404).json({ message: "Author not found" });
      }
      existing.author = author;
    }

    const { author_id: _authorId, ...updates } = body;
    const merged = repo.merge(existing, updates);
    const savedPost = await repo.save(merged);

    const postWithRelations = await repo.findOne({
      where: { id: savedPost.id },
      relations: postRelations,
    });

    return res.json(postWithRelations ?? savedPost);
  } catch (error) {
    return handleError(res, error, "Failed to update post");
  }
};

export const deletePost = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid post id" });
  }

  try {
    const repo = postRepository();
    const existing = await repo.findOneBy({ id });
    if (!existing) {
      return res.status(404).json({ message: "Post not found" });
    }

    await repo.remove(existing);
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error, "Failed to delete post");
  }
};
