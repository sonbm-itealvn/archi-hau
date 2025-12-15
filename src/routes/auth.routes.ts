import { Router } from "express";
import {
  login,
  register,
  getProfile,
  refreshToken,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.get("/me", authenticate, getProfile);

export default router;
