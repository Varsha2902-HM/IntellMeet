
import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";

import authRoutes from "./routes/authRoutes";
import meetingRoutes from "./routes/meetingRoutes";
import { ensureDatabase } from "./dbMiddleware";

const app = express();

// Allowed frontend origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  ...(process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean),
];

// CORS configuration
app.use(
  cors({
    origin(origin, callback) {
      const normalizedOrigin = origin?.replace(/\/$/, "");

      if (
        !normalizedOrigin ||
        allowedOrigins.includes(normalizedOrigin)
      ) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

// Security and request parsing
app.use(helmet());
app.use(express.json());

// API status
app.get("/", (_req, res) => {
  res.json({
    message: "IntellMeet API is running successfully!",
  });
});

// Database health status
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

// Connect to MongoDB before processing API requests
app.use("/api", ensureDatabase);

// Authentication routes
app.use("/api/auth", authRoutes);

// Meeting routes
app.use("/api/meetings", meetingRoutes);

export default app;
