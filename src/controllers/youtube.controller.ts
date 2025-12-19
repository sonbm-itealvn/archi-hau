import { Request, Response } from "express";
import fetch from "node-fetch";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const MAX_RESULTS_PER_PAGE = 50; // YouTube API limit

const DEFAULT_CHANNEL_ID = process.env.YOUTUBE_DEFAULT_CHANNEL_ID;

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

  try {
    const allVideoIds: string[] = [];
    let nextPageToken: string | undefined = undefined;

    // Lấy tất cả videos với pagination
    do {
      const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
      searchUrl.searchParams.set("key", YOUTUBE_API_KEY);
      searchUrl.searchParams.set("channelId", effectiveChannelId);
      searchUrl.searchParams.set("part", "snippet");
      searchUrl.searchParams.set("order", "date");
      searchUrl.searchParams.set("type", "video");
      searchUrl.searchParams.set("maxResults", MAX_RESULTS_PER_PAGE.toString());
      
      if (nextPageToken) {
        searchUrl.searchParams.set("pageToken", nextPageToken);
      }

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
        nextPageToken?: string;
      };

      const videoIds = searchPayload.items
        .map((item) => item.id?.videoId)
        .filter((id): id is string => Boolean(id));

      allVideoIds.push(...videoIds);
      nextPageToken = searchPayload.nextPageToken;
    } while (nextPageToken);

    if (allVideoIds.length === 0) {
      return res.json([]);
    }

    // YouTube API chỉ cho phép lấy tối đa 50 videos mỗi lần gọi details
    // Nên cần chia nhỏ thành các batch
    const allVideos: Array<{
      id: string;
      title: string;
      description: string;
      publishedAt: string | null;
      thumbnails: Record<string, { url: string; width?: number; height?: number }>;
      duration: string | null;
      url: string;
    }> = [];

    for (let i = 0; i < allVideoIds.length; i += 50) {
      const batch = allVideoIds.slice(i, i + 50);
      const detailsResponse = await fetch(buildVideoDetailsUrl(batch));
      
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

      allVideos.push(...videos);
    }

    return res.json(allVideos);
  } catch (error) {
    return res.status(500).json({
      message: "Unable to fetch channel videos",
      details: error instanceof Error ? error.message : error,
    });
  }
};
