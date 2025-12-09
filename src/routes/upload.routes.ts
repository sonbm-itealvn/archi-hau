import { Router } from "express";
import {
  deleteUpload,
  getUpload,
  listUploads,
  uploadSingleMiddleware,
  uploadToCloudinary,
} from "../controllers/upload.controller";
import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware";

const router = Router();

router.get(
  "/",
  authenticate,
  authorizeRoles("editor", "manager"),
  listUploads
);

router.get(
  "/:id",
  authenticate,
  authorizeRoles("editor", "manager"),
  getUpload
);

router.post(
  "/",
  authenticate,
  authorizeRoles("editor", "manager"),
  uploadSingleMiddleware,
  uploadToCloudinary
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("editor", "manager"),
  deleteUpload
);

export default router;

