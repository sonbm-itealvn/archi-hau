import { Router } from "express";
import { getYoutubeChannelPosts } from "../controllers/youtube.controller";

const router = Router();

router.get("/posts", getYoutubeChannelPosts);

export default router;
