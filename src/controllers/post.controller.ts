import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Post } from "../entities/Post";
import { User } from "../entities/User";
import { Category } from "../entities/Category";
import { Tag } from "../entities/Tag";
import { PostCategory } from "../entities/PostCategory";
import { PostTag } from "../entities/PostTag";

const postRepository = () => AppDataSource.getRepository(Post);
const userRepository = () => AppDataSource.getRepository(User);
const categoryRepository = () => AppDataSource.getRepository(Category);
const tagRepository = () => AppDataSource.getRepository(Tag);
const postCategoryRepository = () => AppDataSource.getRepository(PostCategory);
const postTagRepository = () => AppDataSource.getRepository(PostTag);
const postRelations = ["author", "postCategories", "postCategories.category", "postTags", "postTags.tag"];

const parseId = (value: string): number | null => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
};

const normalizeIdArray = (values?: Array<number | string> | null): number[] => {
  if (!values) {
    return [];
  }
  return values
    .map((value) => Number(value))
    .filter((id) => Number.isInteger(id) && id > 0);
};

const syncPostCategories = async (postId: number, categoryIds: number[]) => {
  await postCategoryRepository().delete({ post_id: postId });
  if (categoryIds.length === 0) {
    return;
  }

  const categories = await categoryRepository()
    .createQueryBuilder("category")
    .where("category.id IN (:...ids)", { ids: categoryIds })
    .getMany();

  if (categories.length !== categoryIds.length) {
    throw new Error("One or more categories do not exist");
  }

  const records = categories.map((category, index) =>
    postCategoryRepository().create({
      post_id: postId,
      category_id: category.id,
      is_primary: index === 0,
      post: { id: postId } as Post,
      category,
    })
  );
  await postCategoryRepository().save(records);
};

const syncPostTags = async (postId: number, tagIds: number[]) => {
  await postTagRepository().delete({ post_id: postId });
  if (tagIds.length === 0) {
    return;
  }

  const tags = await tagRepository()
    .createQueryBuilder("tag")
    .where("tag.id IN (:...ids)", { ids: tagIds })
    .getMany();

  if (tags.length !== tagIds.length) {
    throw new Error("One or more tags do not exist");
  }

  const records = tags.map((tag) =>
    postTagRepository().create({
      post_id: postId,
      tag_id: tag.id,
      post: { id: postId } as Post,
      tag,
    })
  );
  await postTagRepository().save(records);
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

export const getLatestPosts = async (req: Request, res: Response) => {
  const limit = Number(req.query.limit ?? 5);
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 20) : 5;

  try {
    const posts = await postRepository().find({
      relations: postRelations,
      order: { created_at: "DESC" },
      take: safeLimit,
    });
    return res.json(posts);
  } catch (error) {
    return handleError(res, error, "Failed to fetch latest posts");
  }
};

export const getLatestPostsByCategorySlug = async (req: Request, res: Response) => {
  const slug = req.params.slug;
  if (!slug) {
    return res.status(400).json({ message: "Category slug is required" });
  }

  const limit = Number(req.query.limit ?? 5);
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 20) : 5;

  try {
    const category = await categoryRepository().findOne({
      where: { slug },
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const posts = await postRepository()
      .createQueryBuilder("post")
      .innerJoin("post.postCategories", "filterPc")
      .innerJoin("filterPc.category", "filterCategory", "filterCategory.id = :categoryId", {
        categoryId: category.id,
      })
      .leftJoinAndSelect("post.author", "author")
      .leftJoinAndSelect("post.postCategories", "postCategories")
      .leftJoinAndSelect("postCategories.category", "category")
      .leftJoinAndSelect("post.postTags", "postTags")
      .leftJoinAndSelect("postTags.tag", "tag")
      .orderBy("post.created_at", "DESC")
      .take(safeLimit)
      .getMany();

    return res.json(posts);
  } catch (error) {
    return handleError(res, error, "Failed to fetch posts by category");
  }
};

export const getPostsByTagSlug = async (req: Request, res: Response) => {
  const slug = req.params.slug;
  if (!slug) {
    return res.status(400).json({ message: "Tag slug is required" });
  }

  const limit = Number(req.query.limit ?? 20);
  const safeLimit =
    Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 20;

  try {
    const tag = await tagRepository().findOne({
      where: { slug },
    });

    if (!tag) {
      return res.status(404).json({ message: "Tag not found" });
    }

    const posts = await postRepository()
      .createQueryBuilder("post")
      .innerJoin("post.postTags", "filterPt")
      .innerJoin("filterPt.tag", "filterTag", "filterTag.id = :tagId", {
        tagId: tag.id,
      })
      .leftJoinAndSelect("post.author", "author")
      .leftJoinAndSelect("post.postCategories", "postCategories")
      .leftJoinAndSelect("postCategories.category", "category")
      .leftJoinAndSelect("post.postTags", "postTags")
      .leftJoinAndSelect("postTags.tag", "tag")
      .andWhere("post.deleted_at IS NULL")
      .orderBy("post.created_at", "DESC")
      .take(safeLimit)
      .getMany();

    return res.json(posts);
  } catch (error) {
    return handleError(res, error, "Failed to fetch posts by tag");
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
  const body = req.body as Partial<Post> & {
    author_id?: number | string;
    category_ids?: Array<number | string> | null;
    tag_ids?: Array<number | string> | null;
  };
  const authorIdRaw =
    body.author_id !== undefined ? Number(body.author_id) : req.user?.id;
  const authorId = authorIdRaw ?? null;

  if (!authorId || Number.isNaN(authorId)) {
    return res.status(400).json({ message: "author_id is required" });
  }

  const categoryIds = normalizeIdArray(body.category_ids);
  const tagIds = normalizeIdArray(body.tag_ids);

  try {
    const author = await userRepository().findOneBy({ id: authorId });
    if (!author) {
      return res.status(404).json({ message: "Author not found" });
    }

    const { author_id: _authorId, category_ids, tag_ids, ...postPayload } = body;
    const post = postRepository().create({
      ...postPayload,
      author,
    });

    const savedPost = await postRepository().save(post);

    try {
      if (categoryIds.length > 0) {
        await syncPostCategories(savedPost.id, categoryIds);
      }
      if (tagIds.length > 0) {
        await syncPostTags(savedPost.id, tagIds);
      }
    } catch (relationError) {
      await postRepository().remove(savedPost);
      if (relationError instanceof Error) {
        return res.status(404).json({ message: relationError.message });
      }
      return res.status(500).json({ message: "Failed to assign relations" });
    }

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

  const body = req.body as Partial<Post> & {
    author_id?: number | string;
    category_ids?: Array<number | string> | null;
    tag_ids?: Array<number | string> | null;
  };

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
        return res
          .status(400)
          .json({ message: "author_id must be a positive number" });
      }

      const author = await userRepository().findOneBy({ id: authorId });
      if (!author) {
        return res.status(404).json({ message: "Author not found" });
      }
      existing.author = author;
    }

    const categoryIds = body.category_ids
      ? normalizeIdArray(body.category_ids)
      : null;
    const tagIds = body.tag_ids ? normalizeIdArray(body.tag_ids) : null;

    const { author_id: _authorId, category_ids, tag_ids, ...updates } = body;

    const merged = repo.merge(existing, updates);
    const savedPost = await repo.save(merged);

    try {
      if (categoryIds !== null) {
        await syncPostCategories(savedPost.id, categoryIds);
      }
      if (tagIds !== null) {
        await syncPostTags(savedPost.id, tagIds);
      }
    } catch (relationError) {
      if (relationError instanceof Error) {
        return res.status(404).json({ message: relationError.message });
      }
      return res.status(500).json({ message: "Failed to assign relations" });
    }

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

    await repo.softRemove(existing);
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error, "Failed to delete post");
  }
};
