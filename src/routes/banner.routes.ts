import { Router } from "express";
import {
  getBanners,
  getBannerById,
  getActiveBanner,
  createBanner,
  updateBanner,
  deleteBanner,
} from "../controllers/banner.controller";
import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware";

const router = Router();

router.get("/active", getActiveBanner);
router.get("/", getBanners);
router.get("/:id", getBannerById);
router.post("/", authenticate, authorizeRoles("manager"), createBanner);
router.put("/:id(\\d+)", authenticate, authorizeRoles("manager"), updateBanner);
router.delete("/:id(\\d+)", authenticate, authorizeRoles("manager"), deleteBanner);

export default router;

