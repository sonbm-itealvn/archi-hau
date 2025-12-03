import { Request, Response } from "express";
import fetch from "node-fetch";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

const DEFAULT_CHANNEL_ID = process.env.YOUTUBE_DEFAULT_CHANNEL_ID;

const parseLimit = (value?: unknown): number => {
  if (!value) {
    return DEFAULT_LIMIT;
  }
  if (Array.isArray(value)) {
    return parseLimit(value[0]);
  }
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(num, MAX_LIMIT);
};

const buildVideoDetailsUrl = (videoIds: string[]): string => {
  const url = new URL(`${YOUTUBE_API_BASE}/videos`);
  url.searchParams.set("key", YOUTUBE_API_KEY ?? "");
  url.searchParams.set("id", videoIds.join(","));
  url.searchParams.set("part", "snippet,contentDetails");
  return url.toString();
};

export const getYoutubeChannelPosts = async (req: Request, res: Response) => {
  if (!YOUTUBE_API_KEY) {
    return res.status(500).json({
      message: "Missing YOUTUBE_API_KEY configuration",
    });
  }

  const { channelId } = req.query;
  const effectiveChannelId =
    typeof channelId === "string" && channelId.trim().length > 0
      ? channelId.trim()
      : DEFAULT_CHANNEL_ID;

  if (!effectiveChannelId) {
    return res.status(400).json({
      message: "channelId query parameter is required",
    });
  }

  const limit = parseLimit(req.query.limit);

  try {
    const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
    searchUrl.searchParams.set("key", YOUTUBE_API_KEY);
    searchUrl.searchParams.set("channelId", effectiveChannelId);
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("order", "date");
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("maxResults", limit.toString());

    const searchResponse = await fetch(searchUrl.toString());
    if (!searchResponse.ok) {
      const text = await searchResponse.text();
      return res.status(searchResponse.status).json({
        message: "Failed to fetch channel videos",
        details: text,
      });
    }

    const searchPayload = (await searchResponse.json()) as {
      items: Array<{ id: { videoId: string }; snippet: Record<string, unknown> }>;
    };

    const videoIds = searchPayload.items
      .map((item) => item.id?.videoId)
      .filter((id): id is string => Boolean(id));

    if (videoIds.length === 0) {
      return res.json([]);
    }

    const detailsResponse = await fetch(buildVideoDetailsUrl(videoIds));
    if (!detailsResponse.ok) {
      const text = await detailsResponse.text();
      return res.status(detailsResponse.status).json({
        message: "Failed to load video details",
        details: text,
      });
    }

    const detailsPayload = (await detailsResponse.json()) as {
      items: Array<{
        id: string;
        snippet: {
          title: string;
          description: string;
          publishedAt: string;
          thumbnails?: Record<
            string,
            { url: string; width?: number; height?: number }
          >;
        };
        contentDetails?: {
          duration?: string;
        };
      }>;
    };

    const videos = detailsPayload.items.map((item) => ({
      id: item.id,
      title: item.snippet?.title ?? "",
      description: item.snippet?.description ?? "",
      publishedAt: item.snippet?.publishedAt ?? null,
      thumbnails: item.snippet?.thumbnails ?? {},
      duration: item.contentDetails?.duration ?? null,
      url: `https://www.youtube.com/watch?v=${item.id}`,
    }));

    return res.json(videos);
  } catch (error) {
    return res.status(500).json({
      message: "Unable to fetch channel videos",
      details: error instanceof Error ? error.message : error,
    });
  }
};
