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

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:5176",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

app.use(helmet());
app.use(express.json());

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
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

  /*
   * ============================================================
   * JOIN MEETING
   * ============================================================
   *
   * Frontend sends:
   *
   * socket.emit("join-meeting", {
   *   meetingId
   * });
   *
   * So the server must receive an object.
   */
  socket.on("join-meeting", async (data: JoinMeetingPayload) => {
    console.log("join-meeting received:", data);

    if (
      !data ||
      typeof data.meetingId !== "string" ||
      !data.meetingId.trim()
    ) {
      console.log("Invalid meeting ID received");
      return;
    }

    const roomId = data.meetingId.trim();

    try {
      // Avoid joining the same meeting repeatedly.
      if (socket.data.meetingId === roomId) {
        console.log(
          `Socket ${socket.id} is already in meeting ${roomId}`
        );
        return;
      }

      // Leave previous meeting if the socket was already in one.
      const previousRoom = socket.data.meetingId as
        | string
        | undefined;

      if (previousRoom) {
        socket.leave(previousRoom);

        socket.to(previousRoom).emit("participant-left", {
          socketId: socket.id,
        });
      }

      /*
       * Get participants who are already inside the room.
       *
       * IMPORTANT:
       * This is done BEFORE the new socket joins the room.
       */
      const existingParticipants = await io
        .in(roomId)
        .allSockets();

      // Join the new meeting room.
      await socket.join(roomId);

      socket.data.meetingId = roomId;

      console.log(
        `Socket ${socket.id} joined meeting ${roomId}`
      );

      console.log(
        "Existing participants:",
        Array.from(existingParticipants)
      );

      /*
       * Tell the NEW participant who was already in the meeting.
       */
      socket.emit("existing-participants", {
        meetingId: roomId,
        participants: Array.from(existingParticipants),
      });

      /*
       * Tell EVERY OTHER participant that a new participant joined.
       */
      socket.to(roomId).emit("participant-joined", {
        socketId: socket.id,
      });

      /*
       * Send confirmation to the joining client.
       */
      socket.emit("meeting-joined", {
        meetingId: roomId,
        socketId: socket.id,
      });
    } catch (error) {
      console.error("Unable to join meeting room:", error);

      socket.emit("meeting-error", {
        message: "Unable to join the meeting room.",
      });
    }
  });

  /*
   * ============================================================
   * WEBRTC OFFER
   * ============================================================
   */
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
      console.log(
        `Socket ${socket.id} attempted to send offer outside its meeting`
      );
      return;
    }

    console.log(
      `Relaying WebRTC offer from ${socket.id} to ${data.targetSocketId}`
    );

    io.to(data.targetSocketId).emit("webrtc-offer", {
      meetingId: data.meetingId,
      fromSocketId: socket.id,
      offer: data.offer,
    });
  });

  /*
   * ============================================================
   * WEBRTC ANSWER
   * ============================================================
   */
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
      console.log(
        `Socket ${socket.id} attempted to send answer outside its meeting`
      );
      return;
    }

    console.log(
      `Relaying WebRTC answer from ${socket.id} to ${data.targetSocketId}`
    );

    io.to(data.targetSocketId).emit("webrtc-answer", {
      meetingId: data.meetingId,
      fromSocketId: socket.id,
      answer: data.answer,
    });
  });

  /*
   * ============================================================
   * WEBRTC ICE CANDIDATE
   * ============================================================
   */
  socket.on(
    "webrtc-ice-candidate",
    (data: SignalPayload) => {
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
        console.log(
          `Socket ${socket.id} attempted to send ICE outside its meeting`
        );
        return;
      }

      io.to(data.targetSocketId).emit(
        "webrtc-ice-candidate",
        {
          meetingId: data.meetingId,
          fromSocketId: socket.id,
          candidate: data.candidate,
        }
      );
    }
  );

  /*
   * ============================================================
   * MEETING CHAT
   * ============================================================
   */
  socket.on(
    "meeting-message",
    (data: MeetingMessage) => {
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

      console.log(
        `Chat message from ${socket.id}: ${data.message}`
      );

      socket.to(data.meetingId).emit(
        "meeting-message",
        {
          message: data.message.trim(),
          sender: data.sender || "Participant",
          socketId: socket.id,
          timestamp: new Date().toISOString(),
        }
      );
    }
  );

  /*
   * ============================================================
   * LEAVE MEETING
   * ============================================================
   */
  socket.on("leave-meeting", () => {
    const meetingId = socket.data.meetingId as
      | string
      | undefined;

    if (!meetingId) {
      return;
    }

    socket.to(meetingId).emit("participant-left", {
      socketId: socket.id,
    });

    socket.leave(meetingId);

    delete socket.data.meetingId;

    console.log(
      `Socket ${socket.id} left meeting ${meetingId}`
    );
  });

  /*
   * ============================================================
   * DISCONNECT
   * ============================================================
   */
  socket.on("disconnect", () => {
    const meetingId = socket.data.meetingId as
      | string
      | undefined;

    if (meetingId) {
      socket.to(meetingId).emit("participant-left", {
        socketId: socket.id,
      });
    }

    console.log(
      "Socket disconnected:",
      socket.id
    );
  });
});

/*
 * ============================================================
 * START SERVER
 * ============================================================
 */
async function startServer() {
  try {
    if (!MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is not defined in .env"
      );
    }

    await mongoose.connect(MONGODB_URI);

    console.log(
      "MongoDB connected successfully"
    );

    httpServer.listen(PORT, () => {
      console.log(
        `IntellMeet server running on http://localhost:${PORT}`
      );

      console.log(
        `Socket.IO server ready on port ${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Server startup failed:",
      error
    );

    process.exit(1);
  }
}

void startServer();