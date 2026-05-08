import mongoose from "mongoose";

export interface IVideoHistory {
  _id: string;
  userId: string;
  prompt: string;
  model: string;
  ratio: string;
  videoUrl: string;
  isFavorited: boolean;
  createdAt: Date;
}

const videoHistorySchema = new mongoose.Schema<IVideoHistory>({
  userId: { type: String, required: true, index: true },
  prompt: { type: String, required: true },
  model: { type: String, required: true },
  ratio: { type: String, required: true },
  videoUrl: { type: String, required: true },
  isFavorited: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const VideoHistory = mongoose.models.VideoHistory || mongoose.model<IVideoHistory>("VideoHistory", videoHistorySchema);
