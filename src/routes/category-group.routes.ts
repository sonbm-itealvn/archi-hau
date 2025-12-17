import { Router } from "express";
import {
  getCategoryGroups,
  getCategoryGroupById,
  createCategoryGroup,
  updateCategoryGroup,
  assignCategoriesToGroup,
  removeCategoriesFromGroup,
  deleteCategoryGroup,
  getPostsByGroup,
} from "../controllers/category-group.controller";
import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware";

const router = Router();

router.get("/", getCategoryGroups);
router.get("/:id/posts", getPostsByGroup);
router.get("/:id", getCategoryGroupById);
router.post("/", authenticate, authorizeRoles("manager"), createCategoryGroup);
router.put("/:id", authenticate, authorizeRoles("manager"), updateCategoryGroup);
router.post("/:id/assign-categories", authenticate, authorizeRoles("manager"), assignCategoriesToGroup);
router.post("/:id/remove-categories", authenticate, authorizeRoles("manager"), removeCategoriesFromGroup);
router.delete("/:id", authenticate, authorizeRoles("manager"), deleteCategoryGroup);

export default router;

