import { Router } from "express";
import {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
} from "../controllers/post.controller";
import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware";

const router = Router();

router.get("/", getPosts);
router.get("/:id", getPostById);
router.post(
  "/",
  authenticate,
  authorizeRoles("editor", "manager"),
  createPost
);
router.put(
  "/:id",
  authenticate,
  authorizeRoles("editor", "manager"),
  updatePost
);
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("editor", "manager"),
  deletePost
);

export default router;
