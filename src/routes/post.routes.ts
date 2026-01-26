import { Router } from "express";
import {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  getLatestPosts,
  getLatestPostsByCategorySlug,
  getPostsByTagSlug,
  getPostsByThietKeKienTruc,
  getPostsByLyThuyetChuyenNganh,
  getAllPostsByThucDia,
  getAllPostsByThucTap,
  getPostsBySanPham,
  getAllPostsByHoatDongSuKien,
} from "../controllers/post.controller";
import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware";

const router = Router();

router.get("/", getPosts);
router.get("/latest", getLatestPosts);
router.get("/category/:slug/latest", getLatestPostsByCategorySlug);
router.get("/tag/:slug", getPostsByTagSlug);
router.get("/category/thiet-ke-kien-truc", getPostsByThietKeKienTruc);
router.get("/category/ly-thuyet-chuyen-nganh", getPostsByLyThuyetChuyenNganh);
router.get("/category/thuc-dia/all", getAllPostsByThucDia);
router.get("/category/thuc-tap/all", getAllPostsByThucTap);
router.get("/category/san-pham", getPostsBySanPham);
router.get("/group/hoat-dong-su-kien/all", getAllPostsByHoatDongSuKien);
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
