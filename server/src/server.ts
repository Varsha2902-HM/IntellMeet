
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { createServer } from "http";
import { Server } from "socket.io";

import authRoutes from "./routes/authRoutes";
import meetingRoutes from "./routes/meetingRoutes";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const PORT = Number(process.env.PORT) || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// Local development origins plus the deployed frontend URL.
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:5176",
  ...(process.env.FRONTEND_URL
    ?.split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean) ?? []),
];

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    // Permit requests without an Origin header, such as health checks.
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
};

app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json());

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});

app.use("/api/auth", authRoutes);
app.use("/api/meetings", meetingRoutes);

app.get("/", (_req, res) => {
  res.json({
    message: "IntellMeet API is running successfully!",
  });
});

app.set("io", io);

interface JoinMeetingPayload {
  meetingId: string;
}

interface MeetingMessage {
  meetingId: string;
  message: string;
  sender?: string;
}

interface SignalPayload {
  meetingId: string;
  targetSocketId: string;
  offer?: unknown;
  answer?: unknown;
  candidate?: unknown;
}

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join-meeting", async (data: JoinMeetingPayload) => {
    if (
      !data ||
      typeof data.meetingId !== "string" ||
      !data.meetingId.trim()
    ) {
      socket.emit("meeting-error", {
        message: "A valid meeting ID is required.",
      });
      return;
    }

    const roomId = data.meetingId.trim();

    try {
      if (socket.data.meetingId === roomId) {
        return;
      }

      const previousRoom = socket.data.meetingId as
        | string
        | undefined;

      if (previousRoom) {
        socket.leave(previousRoom);
        socket.to(previousRoom).emit("participant-left", {
          socketId: socket.id,
        });
      }

      // Get existing participants before this socket joins.
      const existingParticipants = await io.in(roomId).allSockets();

      await socket.join(roomId);
      socket.data.meetingId = roomId;

      socket.emit("existing-participants", {
        meetingId: roomId,
        participants: Array.from(existingParticipants),
      });

      socket.to(roomId).emit("participant-joined", {
        socketId: socket.id,
      });

      socket.emit("meeting-joined", {
        meetingId: roomId,
        socketId: socket.id,
      });

      console.log(`Socket ${socket.id} joined meeting ${roomId}`);
    } catch (error) {
      console.error("Unable to join meeting room:", error);

      socket.emit("meeting-error", {
        message: "Unable to join the meeting room.",
      });
    }
  });

  socket.on("webrtc-offer", (data: SignalPayload) => {
    if (
      !data ||
      typeof data.meetingId !== "string" ||
      typeof data.targetSocketId !== "string" ||
      !data.offer
    ) {
      console.log("Invalid WebRTC offer");
      return;
    }

    if (socket.data.meetingId !== data.meetingId) {
      return;
    }

    io.to(data.targetSocketId).emit("webrtc-offer", {
      meetingId: data.meetingId,
      fromSocketId: socket.id,
      offer: data.offer,
    });
  });

  socket.on("webrtc-answer", (data: SignalPayload) => {
    if (
      !data ||
      typeof data.meetingId !== "string" ||
      typeof data.targetSocketId !== "string" ||
      !data.answer
    ) {
      console.log("Invalid WebRTC answer");
      return;
    }

    if (socket.data.meetingId !== data.meetingId) {
      return;
    }

    io.to(data.targetSocketId).emit("webrtc-answer", {
      meetingId: data.meetingId,
      fromSocketId: socket.id,
      answer: data.answer,
    });
  });

  socket.on("webrtc-ice-candidate", (data: SignalPayload) => {
    if (
      !data ||
      typeof data.meetingId !== "string" ||
      typeof data.targetSocketId !== "string" ||
      !data.candidate
    ) {
      console.log("Invalid ICE candidate");
      return;
    }

    if (socket.data.meetingId !== data.meetingId) {
      return;
    }

    io.to(data.targetSocketId).emit("webrtc-ice-candidate", {
      meetingId: data.meetingId,
      fromSocketId: socket.id,
      candidate: data.candidate,
    });
  });

  socket.on("meeting-message", (data: MeetingMessage) => {
    if (
      !data ||
      typeof data.meetingId !== "string" ||
      typeof data.message !== "string" ||
      !data.message.trim()
    ) {
      return;
    }

    if (socket.data.meetingId !== data.meetingId) {
      return;
    }

    socket.to(data.meetingId).emit("meeting-message", {
      message: data.message.trim(),
      sender: data.sender || "Participant",
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("leave-meeting", () => {
    const meetingId = socket.data.meetingId as string | undefined;

    if (!meetingId) {
      return;
    }

    socket.to(meetingId).emit("participant-left", {
      socketId: socket.id,
    });

    socket.leave(meetingId);
    delete socket.data.meetingId;

    console.log(`Socket ${socket.id} left meeting ${meetingId}`);
  });

  socket.on("disconnect", () => {
    const meetingId = socket.data.meetingId as string | undefined;

    if (meetingId) {
      socket.to(meetingId).emit("participant-left", {
        socketId: socket.id,
      });
    }

    console.log("Socket disconnected:", socket.id);
  });
});

async function startServer() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not configured.");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected successfully");

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`IntellMeet server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

void startServer();
