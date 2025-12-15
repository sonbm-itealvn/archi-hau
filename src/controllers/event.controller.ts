import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Event } from "../entities/Event";
import { Upload } from "../entities/Upload";
import {
  isCloudinaryConfigured,
  uploadFileFromUrlToCloudinary,
} from "../utils/cloudinary";
import { User } from "../entities/User";

const eventRepository = () => AppDataSource.getRepository(Event);
const uploadRepository = () => AppDataSource.getRepository(Upload);
type EventStatus = "upcoming" | "ongoing" | "finished";

const parseId = (value: string): number | null => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
};

const handleError = (res: Response, error: unknown, message: string) => {
  const details = error instanceof Error ? error.message : error;
  console.error(message, details);
  return res.status(500).json({ message, details });
};

const isCloudinaryUrl = (url: string) =>
  url.includes("res.cloudinary.com") || url.includes("cloudinary.com");

const uploadUrlAndRecord = async (url: string, userId?: number) => {
  const folder = process.env.CLOUDINARY_FOLDER || undefined;
  const result = await uploadFileFromUrlToCloudinary(url, {
    folder,
    resourceType: "auto",
  });

  const record = uploadRepository().create({
    public_id: result.public_id,
    url: result.secure_url ?? result.url,
    resource_type: result.resource_type,
    bytes: result.bytes ?? null,
    width: result.width ?? null,
    height: result.height ?? null,
    format: result.format ?? null,
    folder: result.folder ?? null,
    original_filename: result.original_filename ?? null,
    uploaded_by: userId ? ({ id: userId } as User) : null,
  });
  await uploadRepository().save(record);
  return record.url;
};

const uploadBannerIfNeeded = async (
  bannerUrl?: string | null,
  userId?: number
): Promise<string | undefined> => {
  if (!bannerUrl || !bannerUrl.startsWith("http")) {
    return bannerUrl ?? undefined;
  }
  if (!isCloudinaryConfigured() || isCloudinaryUrl(bannerUrl)) {
    return bannerUrl;
  }
  return uploadUrlAndRecord(bannerUrl, userId);
};

const getEventStatus = (event: Event): EventStatus => {
  const now = new Date();
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);

  if (now < start) {
    return "upcoming";
  }

  if (now > end) {
    return "finished";
  }

  return "ongoing";
};

const serializeEvent = (event: Event) => ({
  ...event,
  status: getEventStatus(event),
});

export const getEvents = async (_: Request, res: Response) => {
  try {
    const now = new Date();
    const events = await eventRepository()
      .createQueryBuilder("event")
      .where("event.start_time <= :now", { now })
      .andWhere("event.end_time >= :now", { now })
      .orderBy("event.start_time", "DESC")
      .getMany();

    return res.json(events.map(serializeEvent));
  } catch (error) {
    return handleError(res, error, "Failed to fetch events");
  }
};

export const getAllEvents = async (_: Request, res: Response) => {
  try {
    const events = await eventRepository().find({
      order: { start_time: "DESC" },
    });
    return res.json(events.map(serializeEvent));
  } catch (error) {
    return handleError(res, error, "Failed to fetch all events");
  }
};

export const getEventById = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid event id" });
  }

  try {
    const event = await eventRepository().findOneBy({ id });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    return res.json(serializeEvent(event));
  } catch (error) {
    return handleError(res, error, "Failed to fetch event");
  }
};

export const createEvent = async (req: Request, res: Response) => {
  const payload = req.body as Partial<Event>;
  const requiredFields: Array<keyof Event> = [
    "name",
    "start_time",
    "end_time",
    "title",
    "content",
    "location",
  ];
  const missing = requiredFields.filter((field) => !payload[field]);
  if (missing.length > 0) {
    return res.status(400).json({
      message: `Missing required fields: ${missing.join(", ")}`,
    });
  }

  try {
    if (payload.banner_url) {
      try {
        payload.banner_url = await uploadBannerIfNeeded(
          payload.banner_url,
          req.user?.id
        );
      } catch (err) {
        return res
          .status(502)
          .json({ message: "Failed to upload banner", details: `${err}` });
      }
    }

    const event = eventRepository().create(payload);
    const saved = await eventRepository().save(event);
    return res.status(201).json(serializeEvent(saved));
  } catch (error) {
    return handleError(res, error, "Failed to create event");
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid event id" });
  }

  try {
    const repo = eventRepository();
    const existing = await repo.findOneBy({ id });
    if (!existing) {
      return res.status(404).json({ message: "Event not found" });
    }

    const updates = req.body as Partial<Event>;
    delete (updates as Partial<Event> & { id?: number }).id;

    if (updates.banner_url) {
      try {
        updates.banner_url = await uploadBannerIfNeeded(
          updates.banner_url,
          req.user?.id
        );
      } catch (err) {
        return res
          .status(502)
          .json({ message: "Failed to upload banner", details: `${err}` });
      }
    }

    const merged = repo.merge(existing, updates);
    const saved = await repo.save(merged);
    return res.json(serializeEvent(saved));
  } catch (error) {
    return handleError(res, error, "Failed to update event");
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid event id" });
  }

  try {
    const repo = eventRepository();
    const existing = await repo.findOneBy({ id });
    if (!existing) {
      return res.status(404).json({ message: "Event not found" });
    }

    await repo.softRemove(existing);
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error, "Failed to delete event");
  }
};
