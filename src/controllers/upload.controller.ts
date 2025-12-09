import { Request, Response } from "express";
import multer from "multer";
import { AppDataSource } from "../data-source";
import { Upload } from "../entities/Upload";
import {
  deleteFromCloudinary,
  uploadBufferToCloudinary,
} from "../utils/cloudinary";

const uploadRepository = () => AppDataSource.getRepository(Upload);

// Store file in memory; keep size reasonable to prevent abuse
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

export const uploadSingleMiddleware = upload.single("file");

export const uploadToCloudinary = async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: "file is required" });
  }

  const folder =
    (req.body?.folder as string | undefined) ||
    process.env.CLOUDINARY_FOLDER ||
    undefined;
  const resourceType =
    ((req.body?.resource_type as string | undefined) ??
      "auto") as "image" | "video" | "raw" | "auto";

  try {
    const result = await uploadBufferToCloudinary(file.buffer, {
      folder,
      resourceType,
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
      uploaded_by: req.user?.id ? ({ id: req.user.id } as any) : null,
    });

    const saved = await uploadRepository().save(record);

    return res.json(saved);
  } catch (error) {
    console.error("Failed to upload to Cloudinary", error);
    return res.status(502).json({
      message: "Failed to upload to Cloudinary",
      details: `${error}`,
    });
  }
};

export const listUploads = async (_req: Request, res: Response) => {
  try {
    const uploads = await uploadRepository().find({
      order: { created_at: "DESC" },
      relations: ["uploaded_by"],
    });
    return res.json(uploads);
  } catch (error) {
    console.error("Failed to fetch uploads", error);
    return res.status(500).json({ message: "Failed to fetch uploads" });
  }
};

export const getUpload = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid upload id" });
  }

  try {
    const upload = await uploadRepository().findOne({
      where: { id },
      relations: ["uploaded_by"],
    });
    if (!upload) {
      return res.status(404).json({ message: "Upload not found" });
    }
    return res.json(upload);
  } catch (error) {
    console.error("Failed to fetch upload", error);
    return res.status(500).json({ message: "Failed to fetch upload" });
  }
};

export const deleteUpload = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid upload id" });
  }

  try {
    const repo = uploadRepository();
    const existing = await repo.findOneBy({ id });
    if (!existing) {
      return res.status(404).json({ message: "Upload not found" });
    }

    try {
      await deleteFromCloudinary(existing.public_id, existing.resource_type as any);
    } catch (cloudErr) {
      console.error("Failed to delete from Cloudinary", cloudErr);
      return res.status(502).json({
        message: "Failed to delete from Cloudinary",
        details: `${cloudErr}`,
      });
    }

    await repo.remove(existing);
    return res.status(204).send();
  } catch (error) {
    console.error("Failed to delete upload", error);
    return res.status(500).json({ message: "Failed to delete upload" });
  }
};

