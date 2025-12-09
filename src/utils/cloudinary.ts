import { v2 as cloudinary, UploadApiResponse, UploadApiOptions } from "cloudinary";
import { Readable } from "stream";
import fetch from "node-fetch";

type UploadOptions = {
  folder?: string;
  resourceType?: "image" | "video" | "raw" | "auto";
};

const ensureConfigured = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary credentials are not configured");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
};

export const uploadBufferToCloudinary = async (
  buffer: Buffer,
  options: UploadOptions = {}
): Promise<UploadApiResponse> => {
  ensureConfigured();

  const { folder, resourceType = "auto" } = options;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error ?? new Error("Cloudinary upload failed"));
        }
        return resolve(result);
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
};

export const uploadFileFromUrlToCloudinary = async (
  resourceUrl: string,
  options: UploadOptions = {}
): Promise<UploadApiResponse> => {
  const response = await fetch(resourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch resource: ${response.status} ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return uploadBufferToCloudinary(buffer, options);
};

export const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

export const deleteFromCloudinary = async (
  publicId: string,
  resourceType: UploadApiOptions["resource_type"] = "image"
) => {
  ensureConfigured();
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

