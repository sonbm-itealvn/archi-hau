import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Category } from "../entities/Category";
import { PostCategory } from "../entities/PostCategory";

const categoryRepository = () => AppDataSource.getRepository(Category);
const postCategoryRepository = () => AppDataSource.getRepository(PostCategory);
const categoryRelations = ["parent", "children", "postCategories"];

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

export const getCategories = async (_: Request, res: Response) => {
  try {
    const categories = await categoryRepository().find({
      relations: categoryRelations,
      order: { display_order: "ASC", created_at: "DESC" },
    });

    const countsRaw = await postCategoryRepository()
      .createQueryBuilder("pc")
      .select("pc.category_id", "category_id")
      .addSelect("COUNT(pc.post_id)", "post_count")
      .groupBy("pc.category_id")
      .getRawMany<{ category_id: number; post_count: string }>();

    const countMap = new Map<number, number>();
    countsRaw.forEach((row) => {
      countMap.set(row.category_id, Number(row.post_count));
    });

    const categoriesWithCounts = categories.map((category) => ({
      ...category,
      postCount: countMap.get(category.id) ?? 0,
    }));

    return res.json(categoriesWithCounts);
  } catch (error) {
    return handleError(res, error, "Failed to fetch categories");
  }
};

export const getCategoryById = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid category id" });
  }

  try {
    const category = await categoryRepository().findOne({
      where: { id },
      relations: categoryRelations,
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const count = await postCategoryRepository().count({
      where: { category_id: id },
    });

    return res.json({ ...category, postCount: count });
  } catch (error) {
    return handleError(res, error, "Failed to fetch category");
  }
};

export const createCategory = async (req: Request, res: Response) => {
  const payload = req.body as Partial<Category> & {
    parent_id?: number | string | null;
  };

  const requiredFields: Array<keyof Category> = ["name", "slug"];
  const missing = requiredFields.filter((field) => !payload[field]);
  if (missing.length > 0) {
    return res.status(400).json({
      message: `Missing required fields: ${missing.join(", ")}`,
    });
  }

  try {
    let parent: Category | null = null;

    if (payload.parent_id !== undefined && payload.parent_id !== null) {
      const parsedParent = Number(payload.parent_id);
      if (!Number.isInteger(parsedParent) || parsedParent <= 0) {
        return res
          .status(400)
          .json({ message: "parent_id must be a positive integer" });
      }

      const parentCategory = await categoryRepository().findOneBy({
        id: parsedParent,
      });

      if (!parentCategory) {
        return res.status(404).json({ message: "Parent category not found" });
      }

      parent = parentCategory;
    }

    const repo = categoryRepository();
    const { parent_id: _parentId, ...rest } = payload;
    const category = repo.create({ ...rest, parent });

    const saved = await repo.save(category);
    const withRelations = await repo.findOne({
      where: { id: saved.id },
      relations: categoryRelations,
    });

    return res.status(201).json(withRelations ?? saved);
  } catch (error) {
    return handleError(res, error, "Failed to create category");
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid category id" });
  }

  const payload = req.body as Partial<Category> & {
    parent_id?: number | string | null;
  };
  const hasParentField = Object.prototype.hasOwnProperty.call(
    payload,
    "parent_id"
  );

  try {
    const repo = categoryRepository();
    const existing = await repo.findOne({
      where: { id },
      relations: ["parent"],
    });

    if (!existing) {
      return res.status(404).json({ message: "Category not found" });
    }

    let nextParent: Category | null | undefined;

    if (hasParentField) {
      if (payload.parent_id === null) {
        nextParent = null;
      } else if (payload.parent_id === undefined) {
        nextParent = existing.parent ?? null;
      } else {
        const parsedParent = Number(payload.parent_id);
        if (!Number.isInteger(parsedParent) || parsedParent <= 0) {
          return res
            .status(400)
            .json({ message: "parent_id must be a positive integer" });
        }
        if (parsedParent === id) {
          return res
            .status(400)
            .json({ message: "Category cannot be its own parent" });
        }

        const parentCategory = await repo.findOneBy({ id: parsedParent });
        if (!parentCategory) {
          return res.status(404).json({ message: "Parent category not found" });
        }

        nextParent = parentCategory;
      }
    }

    const { parent_id: _ignored, ...updates } = payload;
    const merged = repo.merge(existing, updates);

    if (hasParentField) {
      merged.parent = nextParent ?? null;
    }

    const saved = await repo.save(merged);
    const withRelations = await repo.findOne({
      where: { id: saved.id },
      relations: categoryRelations,
    });

    return res.json(withRelations ?? saved);
  } catch (error) {
    return handleError(res, error, "Failed to update category");
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid category id" });
  }

  try {
    const repo = categoryRepository();
    const category = await repo.findOne({
      where: { id },
      relations: ["children"],
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (category.children && category.children.length > 0) {
      return res.status(400).json({
        message: "Cannot delete category that still has child categories",
      });
    }

    await repo.remove(category);
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error, "Failed to delete category");
  }
};
