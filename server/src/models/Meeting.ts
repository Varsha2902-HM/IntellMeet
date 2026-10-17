import mongoose, { Document, Schema } from "mongoose";

export interface IMeeting extends Document {
  title: string;
  description?: string;
  host: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  startTime: Date;
  endTime?: Date;
  status: "scheduled" | "live" | "completed";
  meetingLink: string;
  createdAt: Date;
  updatedAt: Date;
}

const meetingSchema = new Schema<IMeeting>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    host: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    startTime: {
      type: Date,
      required: true,
    },

    endTime: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["scheduled", "live", "completed"],
      default: "scheduled",
    },

    meetingLink: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

const Meeting = mongoose.model<IMeeting>(
  "Meeting",
  meetingSchema
);

export default Meeting;