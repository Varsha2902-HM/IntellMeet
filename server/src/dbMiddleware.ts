

import { Request, Response, NextFunction } from "express";
import { connectDB } from "./config/db";

export async function ensureDatabase(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("MongoDB connection error:", error);

    res.status(503).json({
      message: "Database is temporarily unavailable",
    });
  }
}
