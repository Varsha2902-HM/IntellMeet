import { Router } from "express";
import {
  createMeeting,
  getMeetings,
  getMeetingById,
} from "../controllers/meetingController";
import { protect } from "../middleware/authMiddleware";

const router = Router();

// Create a new meeting
router.post("/", protect, createMeeting);

// Get all meetings for logged-in user
router.get("/", protect, getMeetings);

// Get one meeting by ID
router.get("/:id", protect, getMeetingById);

export default router;