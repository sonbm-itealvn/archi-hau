import { Router } from "express";
import {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  getLatestPosts,
  getLatestPostsByCategorySlug,
} from "../controllers/post.controller";
import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware";

const router = Router();

router.get("/", getPosts);
router.get("/latest", getLatestPosts);
router.get("/category/:slug/latest", getLatestPostsByCategorySlug);
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
