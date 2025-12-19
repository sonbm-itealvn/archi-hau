import { Router, Request, Response } from "express";
import {
  getLatestPostsByHoatDongKhoa,
  getRandomPostsByHoatDongKhoa,
  getRandomPostsByHoatDongSuKien,
  getLatestPostsByHopTac,
  getLatestNotifications,
  getAllNotifications,
} from "../controllers/category-group.controller";

const router = Router();

// Test route để kiểm tra routes có hoạt động không
router.get("/test", (_: Request, res: Response) => {
  return res.json({ message: "Special posts routes are working!" });
});

// 1. Lấy 5 bài mới nhất của nhóm hoạt động khoa
router.get("/hoat-dong-khoa/latest", getLatestPostsByHoatDongKhoa);

// 2. Lấy 6 bài ngẫu nhiên của nhóm hoạt động khoa trừ đi 5 bài mới nhất
router.get("/hoat-dong-khoa/random", getRandomPostsByHoatDongKhoa);

// Lấy 5 bài ngẫu nhiên trong nhóm hoạt động sự kiện (không loại trừ)
router.get("/hoat-dong-su-kien/random", getRandomPostsByHoatDongSuKien);

// 3. Lấy 5 bài mới nhất trong nhóm hợp tác
router.get("/hop-tac/latest", getLatestPostsByHopTac);

// 4. Lấy 5 thông báo mới nhất trong nhóm thông báo
router.get("/thong-bao/latest", getLatestNotifications);

// 5. Lấy toàn bộ thông báo trong nhóm thông báo
router.get("/thong-bao/all", getAllNotifications);

export default router;

