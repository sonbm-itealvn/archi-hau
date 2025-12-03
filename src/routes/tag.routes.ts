import { Router } from "express";
import {
  getTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
} from "../controllers/tag.controller";
import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware";

const router = Router();

router.get("/", getTags);
router.get("/:id", getTagById);
router.post(
  "/",
  authenticate,
  authorizeRoles("editor", "manager"),
  createTag
);
router.put(
  "/:id",
  authenticate,
  authorizeRoles("editor", "manager"),
  updateTag
);
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("editor", "manager"),
  deleteTag
);

export default router;
