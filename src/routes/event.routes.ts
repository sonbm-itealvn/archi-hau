import { Router } from "express";
import {
  getEvents,
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../controllers/event.controller";
import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware";

const router = Router();

router.get("/", getEvents);
router.get("/all", getAllEvents);
router.get("/:id", getEventById);
router.post("/", authenticate, authorizeRoles("manager"), createEvent);
router.put("/:id", authenticate, authorizeRoles("manager"), updateEvent);
router.delete("/:id", authenticate, authorizeRoles("manager"), deleteEvent);

export default router;
