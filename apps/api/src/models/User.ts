import mongoose, { Schema } from "mongoose";
import { UserDTO } from "@trip-master/shared";

export interface UserDocument extends mongoose.Document {
  email: string;
  name: string;
  passwordHash: string;
  settings: {
    llmProvider: string;
    llmModel?: string;
    encryptedApiKeys?: {
      openai?: string;
      anthropic?: string;
      gemini?: string;
      mock?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    settings: {
      llmProvider: { type: String, default: "mock" },
      llmModel: { type: String },
      encryptedApiKeys: {
        openai: String,
        anthropic: String,
        gemini: String,
        mock: String
      }
    }
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<UserDocument>("User", userSchema);

export function toUserDTO(user: UserDocument): UserDTO {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}
