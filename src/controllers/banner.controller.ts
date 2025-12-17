import { Request, Response } from "express";
import { FindOptionsWhere } from "typeorm";
import { AppDataSource } from "../data-source";
import { Banner } from "../entities/Banner";
import { Upload } from "../entities/Upload";
import {
  isCloudinaryConfigured,
  uploadFileFromUrlToCloudinary,
} from "../utils/cloudinary";
import { User } from "../entities/User";

const bannerRepository = () => AppDataSource.getRepository(Banner);
const uploadRepository = () => AppDataSource.getRepository(Upload);

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

const parseBooleanQuery = (value: unknown): boolean | null => {
  if (value === undefined) return null;
  if (typeof value === "string") {
    if (["true", "1"].includes(value.toLowerCase())) return true;
    if (["false", "0"].includes(value.toLowerCase())) return false;
  }
  return null;
};

const isCloudinaryUrl = (url: string) =>
  url.includes("res.cloudinary.com") || url.includes("cloudinary.com");

const uploadUrlAndRecord = async (url: string, userId?: number) => {
  const folder = process.env.CLOUDINARY_FOLDER || undefined;
  const result = await uploadFileFromUrlToCloudinary(url, {
    folder,
    resourceType: "auto",
  });

  const record = uploadRepository().create({
    public_id: result.public_id,
    url: result.secure_url ?? result.url,
    resource_type: result.resource_type,
    bytes: result.bytes ?? null,
    width: result.width ?? null,
    height: result.height ?? null,
    format: result.format ?? null,
    folder: result.folder ?? null,
    original_filename: result.original_filename ?? null,
    uploaded_by: userId ? ({ id: userId } as User) : null,
  });
  await uploadRepository().save(record);
  return record.url;
};

const uploadImageIfNeeded = async (
  imageUrl?: string | null,
  userId?: number
): Promise<string | undefined> => {
  if (!imageUrl || !imageUrl.startsWith("http")) {
    return imageUrl ?? undefined;
  }
  if (!isCloudinaryConfigured() || isCloudinaryUrl(imageUrl)) {
    return imageUrl;
  }
  return uploadUrlAndRecord(imageUrl, userId);
};

const deactivateAllOtherBanners = async (excludeId?: number) => {
  const repo = bannerRepository();
  // TypeORM doesn't support $ne, so we need to use query builder
  const qb = repo
    .createQueryBuilder()
    .update(Banner)
    .set({ is_active: false })
    .where("is_active = :isActive", { isActive: true });
  
  if (excludeId) {
    qb.andWhere("id != :excludeId", { excludeId });
  }
  
  await qb.execute();
};

export const getBanners = async (req: Request, res: Response) => {
  try {
    const active = parseBooleanQuery(req.query.active);
    if (req.query.active !== undefined && active === null) {
      return res.status(400).json({ message: "Invalid active query param" });
    }

    let where: FindOptionsWhere<Banner> | undefined;
    if (active !== null) {
      where = { is_active: active };
    }

    const banners = await bannerRepository().find({
      where,
      order: { display_order: "ASC", created_at: "DESC" },
    });
    return res.json(banners);
  } catch (error) {
    return handleError(res, error, "Failed to fetch banners");
  }
};

export const getBannerById = async (req: Request, res: Response) => {
  // Nếu id là "active", không xử lý ở đây (sẽ được route /active xử lý)
  if (req.params.id === "active") {
    return res.status(400).json({ message: "Use GET /banners/active endpoint" });
  }

  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid banner id" });
  }

  try {
    const banner = await bannerRepository().findOneBy({ id });
    if (!banner) {
      return res.status(404).json({ message: "Banner not found" });
    }
    return res.json(banner);
  } catch (error) {
    return handleError(res, error, "Failed to fetch banner");
  }
};

export const createBanner = async (req: Request, res: Response) => {
  const payload = req.body as Partial<Banner>;
  const requiredFields: Array<keyof Banner> = ["title", "image_url"];
  const missing = requiredFields.filter((field) => !payload[field]);
  if (missing.length > 0) {
    return res.status(400).json({
      message: `Missing required fields: ${missing.join(", ")}`,
    });
  }

  try {
    if (payload.image_url) {
      try {
        payload.image_url = await uploadImageIfNeeded(
          payload.image_url,
          req.user?.id
        );
      } catch (err) {
        return res
          .status(502)
          .json({ message: "Failed to upload banner", details: `${err}` });
      }
    }

    // Nếu banner mới được set is_active = true, thì deactivate tất cả banner khác
    if (payload.is_active === true) {
      await deactivateAllOtherBanners();
    }

    const banner = bannerRepository().create(payload);
    const saved = await bannerRepository().save(banner);
    return res.status(201).json(saved);
  } catch (error) {
    return handleError(res, error, "Failed to create banner");
  }
};

export const updateBanner = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid banner id" });
  }

  try {
    const repo = bannerRepository();
    const existing = await repo.findOneBy({ id });
    if (!existing) {
      return res.status(404).json({ message: "Banner not found" });
    }

    const updates = req.body as Partial<Banner>;
    delete (updates as Partial<Banner> & { id?: number }).id;

    if (updates.image_url) {
      try {
        updates.image_url = await uploadImageIfNeeded(
          updates.image_url,
          req.user?.id
        );
      } catch (err) {
        return res
          .status(502)
          .json({ message: "Failed to upload banner", details: `${err}` });
      }
    }

    // Nếu banner được update với is_active = true, thì deactivate tất cả banner khác
    if (updates.is_active === true) {
      await deactivateAllOtherBanners(id);
    }

    const merged = repo.merge(existing, updates);
    const saved = await repo.save(merged);
    return res.json(saved);
  } catch (error) {
    return handleError(res, error, "Failed to update banner");
  }
};

export const deleteBanner = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid banner id" });
  }

  try {
    const repo = bannerRepository();
    const existing = await repo.findOneBy({ id });
    if (!existing) {
      return res.status(404).json({ message: "Banner not found" });
    }

    await repo.softRemove(existing);
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error, "Failed to delete banner");
  }
};

export const getActiveBanner = async (req: Request, res: Response) => {
  try {
    const banner = await bannerRepository().findOne({
      where: { is_active: true },
      order: { display_order: "ASC", created_at: "DESC" },
    });
    
    if (!banner) {
      return res.status(404).json({ message: "No active banner found" });
    }
    
    return res.json(banner);
  } catch (error) {
    return handleError(res, error, "Failed to fetch active banner");
  }
};

