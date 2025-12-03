import { Router } from "express";
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller";
import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware";

const router = Router();

router.get("/", getCategories);
router.get("/:id", getCategoryById);
router.post("/", authenticate, authorizeRoles("manager"), createCategory);
router.put("/:id", authenticate, authorizeRoles("manager"), updateCategory);
router.delete("/:id", authenticate, authorizeRoles("manager"), deleteCategory);

export default router;
