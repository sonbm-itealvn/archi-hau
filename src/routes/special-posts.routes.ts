import { Router } from "express";
import {
  getLatestPostsByHoatDongKhoa,
  getRandomPostsByHoatDongKhoa,
  getLatestPostsByHopTac,
  getLatestNotifications,
  getAllNotifications,
} from "../controllers/category-group.controller";

const router = Router();

// 1. Lấy 5 bài mới nhất của nhóm hoạt động khoa
router.get("/hoat-dong-khoa/latest", getLatestPostsByHoatDongKhoa);

// 2. Lấy 6 bài ngẫu nhiên của nhóm hoạt động khoa trừ đi 5 bài mới nhất
router.get("/hoat-dong-khoa/random", getRandomPostsByHoatDongKhoa);

// 3. Lấy 5 bài mới nhất trong nhóm hợp tác
router.get("/hop-tac/latest", getLatestPostsByHopTac);

// 4. Lấy 5 thông báo mới nhất trong nhóm thông báo
router.get("/thong-bao/latest", getLatestNotifications);

// 5. Lấy toàn bộ thông báo trong nhóm thông báo
router.get("/thong-bao/all", getAllNotifications);

export default router;

