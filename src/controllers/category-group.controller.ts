import { Request, Response } from "express";
import { In, Not } from "typeorm";
import { AppDataSource } from "../data-source";
import { CategoryGroup } from "../entities/CategoryGroup";
import { Category } from "../entities/Category";
import { Post } from "../entities/Post";

const categoryGroupRepository = () => AppDataSource.getRepository(CategoryGroup);
const categoryRepository = () => AppDataSource.getRepository(Category);
const postRepository = () => AppDataSource.getRepository(Post);

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

export const getCategoryGroups = async (_: Request, res: Response) => {
  try {
    const groups = await categoryGroupRepository().find({
      relations: ["categories"],
      order: { display_order: "ASC", created_at: "DESC" },
    });

    const groupsWithCounts = groups.map((group) => ({
      ...group,
      categoryCount: group.categories?.length ?? 0,
    }));

    return res.json(groupsWithCounts);
  } catch (error) {
    return handleError(res, error, "Failed to fetch category groups");
  }
};

export const getCategoryGroupById = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid category group id" });
  }

  try {
    const group = await categoryGroupRepository().findOne({
      where: { id },
      relations: ["categories"],
    });

    if (!group) {
      return res.status(404).json({ message: "Category group not found" });
    }

    return res.json({
      ...group,
      categoryCount: group.categories?.length ?? 0,
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch category group");
  }
};

export const createCategoryGroup = async (req: Request, res: Response) => {
  const payload = req.body as Partial<CategoryGroup>;

  const requiredFields: Array<keyof CategoryGroup> = ["name", "slug"];
  const missing = requiredFields.filter((field) => !payload[field]);
  if (missing.length > 0) {
    return res.status(400).json({
      message: `Missing required fields: ${missing.join(", ")}`,
    });
  }

  try {
    const repo = categoryGroupRepository();
    const group = repo.create(payload);

    const saved = await repo.save(group);
    const withRelations = await repo.findOne({
      where: { id: saved.id },
      relations: ["categories"],
    });

    return res.status(201).json(withRelations ?? saved);
  } catch (error) {
    return handleError(res, error, "Failed to create category group");
  }
};

export const updateCategoryGroup = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid category group id" });
  }

  const payload = req.body as Partial<CategoryGroup>;

  try {
    const repo = categoryGroupRepository();
    const existing = await repo.findOne({
      where: { id },
      relations: ["categories"],
    });

    if (!existing) {
      return res.status(404).json({ message: "Category group not found" });
    }

    const merged = repo.merge(existing, payload);
    const saved = await repo.save(merged);
    const withRelations = await repo.findOne({
      where: { id: saved.id },
      relations: ["categories"],
    });

    return res.json(withRelations ?? saved);
  } catch (error) {
    return handleError(res, error, "Failed to update category group");
  }
};

export const assignCategoriesToGroup = async (req: Request, res: Response) => {
  const groupId = parseId(req.params.id);
  if (!groupId) {
    return res.status(400).json({ message: "Invalid category group id" });
  }

  // Debug: Log request body để kiểm tra
  console.log("Request body:", JSON.stringify(req.body));
  console.log("Content-Type:", req.headers["content-type"]);
  
  const payload = req.body || {};
  
  // Hỗ trợ cả category_ids (snake_case) và categoryIds (camelCase)
  const categoryIds = payload.category_ids || payload.categoryIds;
  
  if (!categoryIds) {
    return res.status(400).json({
      message: "category_ids is required and must be an array of category IDs",
      received: payload,
      hint: "Please send a JSON body with 'category_ids' field containing an array of numbers, e.g., { \"category_ids\": [1, 2, 3] }",
    });
  }
  
  if (!Array.isArray(categoryIds)) {
    return res.status(400).json({
      message: "category_ids must be an array of category IDs",
      received: typeof categoryIds,
      value: categoryIds,
    });
  }

  if (categoryIds.length === 0) {
    return res.status(400).json({
      message: "category_ids array cannot be empty",
    });
  }

  try {
    const groupRepo = categoryGroupRepository();
    const categoryRepo = categoryRepository();

    const group = await groupRepo.findOneBy({ id: groupId });
    if (!group) {
      return res.status(404).json({ message: "Category group not found" });
    }

    const validCategoryIds = categoryIds.map((id) => Number(id)).filter(
      (id) => Number.isInteger(id) && id > 0
    );

    if (validCategoryIds.length === 0) {
      return res.status(400).json({
        message: "No valid category IDs provided",
        received: categoryIds,
      });
    }

    const categories = await categoryRepo.find({
      where: { id: In(validCategoryIds) },
    });
    
    if (categories.length !== validCategoryIds.length) {
      const foundIds = categories.map((c) => c.id);
      const missingIds = validCategoryIds.filter((id) => !foundIds.includes(id));
      return res.status(404).json({
        message: `Some categories not found: ${missingIds.join(", ")}`,
      });
    }

    categories.forEach((category) => {
      category.categoryGroup = group;
    });

    await categoryRepo.save(categories);

    const updatedGroup = await groupRepo.findOne({
      where: { id: groupId },
      relations: ["categories"],
    });

    return res.json({
      message: `Successfully assigned ${categories.length} categories to group`,
      group: updatedGroup,
    });
  } catch (error) {
    return handleError(res, error, "Failed to assign categories to group");
  }
};

export const removeCategoriesFromGroup = async (req: Request, res: Response) => {
  const groupId = parseId(req.params.id);
  if (!groupId) {
    return res.status(400).json({ message: "Invalid category group id" });
  }

  const payload = (req.body || {}) as { category_ids?: number[] | string[] };
  
  try {
    const groupRepo = categoryGroupRepository();
    const categoryRepo = categoryRepository();

    const group = await groupRepo.findOneBy({ id: groupId });
    if (!group) {
      return res.status(404).json({ message: "Category group not found" });
    }

    if (payload && payload.category_ids && Array.isArray(payload.category_ids) && payload.category_ids.length > 0) {
      const categoryIds = payload.category_ids.map((id) => Number(id)).filter(
        (id) => Number.isInteger(id) && id > 0
      );

      if (categoryIds.length === 0) {
        return res.status(400).json({
          message: "No valid category IDs provided",
        });
      }

      const categories = await categoryRepo.find({
        where: { id: In(categoryIds) },
        relations: ["categoryGroup"],
      });

      categories.forEach((category) => {
        if (category.categoryGroup?.id === groupId) {
          category.categoryGroup = null;
        }
      });

      await categoryRepo.save(categories);

      const updatedGroup = await groupRepo.findOne({
        where: { id: groupId },
        relations: ["categories"],
      });

      return res.json({
        message: `Successfully removed ${categories.length} categories from group`,
        group: updatedGroup,
      });
    } else {
      const categories = await categoryRepo.find({
        where: { categoryGroup: { id: groupId } },
        relations: ["categoryGroup"],
      });

      categories.forEach((category) => {
        category.categoryGroup = null;
      });

      await categoryRepo.save(categories);

      const updatedGroup = await groupRepo.findOne({
        where: { id: groupId },
        relations: ["categories"],
      });

      return res.json({
        message: `Successfully removed all categories from group`,
        group: updatedGroup,
      });
    }
  } catch (error) {
    return handleError(res, error, "Failed to remove categories from group");
  }
};

export const deleteCategoryGroup = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid category group id" });
  }

  try {
    const repo = categoryGroupRepository();
    const group = await repo.findOne({
      where: { id },
      relations: ["categories"],
    });

    if (!group) {
      return res.status(404).json({ message: "Category group not found" });
    }

    if (group.categories && group.categories.length > 0) {
      return res.status(400).json({
        message:
          "Cannot delete category group that still has associated categories",
      });
    }

    await repo.softRemove(group);
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error, "Failed to delete category group");
  }
};

export const getPostsByGroup = async (req: Request, res: Response) => {
  const groupId = parseId(req.params.id);
  if (!groupId) {
    return res.status(400).json({ message: "Invalid category group id" });
  }

  // Parse query parameters
  const status =
    typeof req.query.status === "string" ? req.query.status : undefined;
  const limit = Number(req.query.limit ?? 20);
  const safeLimit =
    Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
  const page = Number(req.query.page ?? 1);
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const offset = (safePage - 1) * safeLimit;

  try {
    const groupRepo = categoryGroupRepository();
    const group = await groupRepo.findOne({
      where: { id: groupId },
      relations: ["categories"],
    });

    if (!group) {
      return res.status(404).json({ message: "Category group not found" });
    }

    // Nếu nhóm không có categories nào, trả về mảng rỗng
    if (!group.categories || group.categories.length === 0) {
      return res.json({
        posts: [],
        pagination: {
          page: safePage,
          limit: safeLimit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // Lấy danh sách category IDs
    const categoryIds = group.categories.map((cat) => cat.id);

    // Query posts thuộc các categories trong nhóm
    const qb = postRepository()
      .createQueryBuilder("post")
      .innerJoin("post.postCategories", "postCategory")
      .where("postCategory.category_id IN (:...categoryIds)", { categoryIds })
      .andWhere("post.deleted_at IS NULL")
      .leftJoinAndSelect("post.author", "author")
      .leftJoinAndSelect("post.postCategories", "postCategories")
      .leftJoinAndSelect("postCategories.category", "category")
      .leftJoinAndSelect("post.postTags", "postTags")
      .leftJoinAndSelect("postTags.tag", "tag")
      .orderBy("post.created_at", "DESC")
      .distinct(true);

    // Filter theo status nếu có
    if (status) {
      qb.andWhere("post.status = :status", { status });
    }

    // Lấy tổng số posts (trước khi pagination)
    const total = await qb.getCount();

    // Áp dụng pagination
    const posts = await qb.skip(offset).take(safeLimit).getMany();

    return res.json({
      posts,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
      group: {
        id: group.id,
        name: group.name,
        slug: group.slug,
      },
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch posts by category group");
  }
};

// Helper function để lấy posts theo category slug
const getPostsByCategorySlug = async (
  categorySlug: string,
  limit: number,
  excludePostIds: number[] = [],
  orderBy: "DESC" | "RANDOM" = "DESC"
) => {
  const category = await categoryRepository().findOne({
    where: { slug: categorySlug },
  });

  if (!category) {
    return null;
  }

  const qb = postRepository()
    .createQueryBuilder("post")
    .innerJoin("post.postCategories", "postCategory")
    .where("postCategory.category_id = :categoryId", { categoryId: category.id })
    .andWhere("post.deleted_at IS NULL")
    .andWhere("post.status = :status", { status: "published" })
    .leftJoinAndSelect("post.author", "author")
    .leftJoinAndSelect("post.postCategories", "postCategories")
    .leftJoinAndSelect("postCategories.category", "category")
    .leftJoinAndSelect("post.postTags", "postTags")
    .leftJoinAndSelect("postTags.tag", "tag")
    .distinct(true);

  if (excludePostIds.length > 0) {
    qb.andWhere("post.id NOT IN (:...excludeIds)", { excludeIds: excludePostIds });
  }

  if (orderBy === "DESC") {
    qb.orderBy("post.created_at", "DESC");
  } else if (orderBy === "RANDOM") {
    qb.orderBy("RAND()");
  }

  return await qb.take(limit).getMany();
};

// Helper function để lấy posts theo group slug
const getPostsByGroupSlug = async (
  groupSlug: string,
  limit: number,
  excludePostIds: number[] = [],
  orderBy: "DESC" | "RANDOM" = "DESC"
) => {
  const group = await categoryGroupRepository().findOne({
    where: { slug: groupSlug },
    relations: ["categories"],
  });

  if (!group || !group.categories || group.categories.length === 0) {
    return null;
  }

  const categoryIds = group.categories.map((cat) => cat.id);

  const qb = postRepository()
    .createQueryBuilder("post")
    .innerJoin("post.postCategories", "postCategory")
    .where("postCategory.category_id IN (:...categoryIds)", { categoryIds })
    .andWhere("post.deleted_at IS NULL")
    .andWhere("post.status = :status", { status: "published" })
    .leftJoinAndSelect("post.author", "author")
    .leftJoinAndSelect("post.postCategories", "postCategories")
    .leftJoinAndSelect("postCategories.category", "category")
    .leftJoinAndSelect("post.postTags", "postTags")
    .leftJoinAndSelect("postTags.tag", "tag")
    .distinct(true);

  if (excludePostIds.length > 0) {
    qb.andWhere("post.id NOT IN (:...excludeIds)", { excludeIds: excludePostIds });
  }

  if (orderBy === "DESC") {
    qb.orderBy("post.created_at", "DESC");
  } else if (orderBy === "RANDOM") {
    qb.orderBy("RAND()");
  }

  return await qb.take(limit).getMany();
};

// 1. Lấy 5 bài mới nhất của nhóm hoạt động khoa
export const getLatestPostsByHoatDongKhoa = async (_: Request, res: Response) => {
  try {
    // "hoat-dong-su-kien" là group slug
    const posts = await getPostsByGroupSlug("hoat-dong-su-kien", 5, [], "DESC");
    
    if (posts === null) {
      return res.status(404).json({ message: "Group 'hoat-dong-su-kien' not found" });
    }

    return res.json(posts);
  } catch (error) {
    return handleError(res, error, "Failed to fetch latest posts by hoat dong khoa");
  }
};

// 2. Lấy 6 bài ngẫu nhiên của nhóm hoạt động khoa trừ đi 5 bài mới nhất
export const getRandomPostsByHoatDongKhoa = async (_: Request, res: Response) => {
  try {
    // "hoat-dong-su-kien" là group slug
    // Lấy 5 bài mới nhất để loại trừ
    const latestPosts = await getPostsByGroupSlug("hoat-dong-su-kien", 5, [], "DESC");
    
    if (latestPosts === null) {
      return res.status(404).json({ message: "Group 'hoat-dong-su-kien' not found" });
    }

    const excludeIds = latestPosts.map((post) => post.id);
    
    // Lấy 6 bài ngẫu nhiên (trừ 5 bài mới nhất)
    const randomPosts = await getPostsByGroupSlug("hoat-dong-su-kien", 6, excludeIds, "RANDOM");

    return res.json(randomPosts || []);
  } catch (error) {
    return handleError(res, error, "Failed to fetch random posts by hoat dong khoa");
  }
};

// 3. Lấy 5 bài mới nhất trong nhóm hợp tác
export const getLatestPostsByHopTac = async (_: Request, res: Response) => {
  try {
    const posts = await getPostsByGroupSlug("hop-tac-ket-noi", 5, [], "DESC");
    
    if (posts === null) {
      return res.status(404).json({ message: "Group 'hop-tac-ket-noi' not found" });
    }

    return res.json(posts);
  } catch (error) {
    return handleError(res, error, "Failed to fetch latest posts by hop tac");
  }
};

// 4. Lấy 5 thông báo mới nhất trong nhóm thông báo
export const getLatestNotifications = async (_: Request, res: Response) => {
  try {
    const posts = await getPostsByGroupSlug("thong-bao", 5, [], "DESC");
    
    if (posts === null) {
      return res.status(404).json({ message: "Group 'thong-bao' not found" });
    }

    return res.json(posts);
  } catch (error) {
    return handleError(res, error, "Failed to fetch latest notifications");
  }
};

// 5. Lấy toàn bộ thông báo trong nhóm thông báo
export const getAllNotifications = async (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : "published";
    const limit = Number(req.query.limit ?? 100);
    const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 500) : 100;
    const page = Number(req.query.page ?? 1);
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const offset = (safePage - 1) * safeLimit;

    const group = await categoryGroupRepository().findOne({
      where: { slug: "thong-bao" },
      relations: ["categories"],
    });

    if (!group) {
      return res.status(404).json({ message: "Group 'thong-bao' not found" });
    }

    if (!group.categories || group.categories.length === 0) {
      return res.json({
        posts: [],
        pagination: {
          page: safePage,
          limit: safeLimit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    const categoryIds = group.categories.map((cat) => cat.id);

    const qb = postRepository()
      .createQueryBuilder("post")
      .innerJoin("post.postCategories", "postCategory")
      .where("postCategory.category_id IN (:...categoryIds)", { categoryIds })
      .andWhere("post.deleted_at IS NULL")
      .andWhere("post.status = :status", { status })
      .leftJoinAndSelect("post.author", "author")
      .leftJoinAndSelect("post.postCategories", "postCategories")
      .leftJoinAndSelect("postCategories.category", "category")
      .leftJoinAndSelect("post.postTags", "postTags")
      .leftJoinAndSelect("postTags.tag", "tag")
      .orderBy("post.created_at", "DESC")
      .distinct(true);

    const total = await qb.getCount();
    const posts = await qb.skip(offset).take(safeLimit).getMany();

    return res.json({
      posts,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch all notifications");
  }
};

