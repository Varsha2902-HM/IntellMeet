import { Request, Response } from "express";
import Meeting from "../models/Meeting";

export const createMeeting = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      startTime,
      endTime,
    } = req.body;

    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!title || !startTime) {
      return res.status(400).json({
        message: "Title and start time are required",
      });
    }

    const meetingLink = `meeting-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}`;

    const meeting = await Meeting.create({
      title,
      description,
      host: userId,
      participants: [userId],
      startTime,
      endTime,
      status: "scheduled",
      meetingLink,
    });

    return res.status(201).json({
      message: "Meeting created successfully",
      meeting,
    });
  } catch (error) {
    console.error("Create meeting error:", error);

    return res.status(500).json({
      message: "Server error while creating meeting",
    });
  }
};

export const getMeetings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const meetings = await Meeting.find({
      $or: [
        { host: userId },
        { participants: userId },
      ],
    })
      .populate("host", "name email")
      .populate("participants", "name email")
      .sort({ startTime: 1 });

    return res.status(200).json({
      message: "Meetings fetched successfully",
      meetings,
    });
  } catch (error) {
    console.error("Get meetings error:", error);

    return res.status(500).json({
      message: "Server error while fetching meetings",
    });
  }
};

export const getMeetingById = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    const meeting = await Meeting.findById(id)
      .populate("host", "name email")
      .populate("participants", "name email");

    if (!meeting) {
      return res.status(404).json({
        message: "Meeting not found",
      });
    }

    return res.status(200).json({
      message: "Meeting fetched successfully",
      meeting,
    });
  } catch (error) {
    console.error("Get meeting error:", error);

    return res.status(500).json({
      message: "Server error while fetching meeting",
    });
  }
};