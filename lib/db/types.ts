import type { ObjectId } from "mongodb";
import type { AppUsage } from "../usage";

// User types
export type User = {
  _id: ObjectId;
  id: string;
  email: string;
  password?: string | null;
  type?: "guest" | "user";
  createdAt: Date;
};

// Chat types
export type Chat = {
  _id: ObjectId;
  id: string;
  title: string;
  userId: string;
  visibility: "public" | "private";
  lastContext?: AppUsage | null;
  createdAt: Date;
};

// Message types
export type DBMessage = {
  _id: ObjectId;
  id: string;
  chatId: string;
  role: string;
  parts: any[];
  attachments: any[];
  createdAt: Date;
};

// Vote types
export type Vote = {
  _id: ObjectId;
  messageId: string;
  chatId: string;
  isUpvoted: boolean;
};

// Document types
export type Document = {
  _id: ObjectId;
  id: string;
  title: string;
  content?: string;
  kind: "text" | "code" | "sheet" | "flashcard" | "study-plan";
  userId: string;
  embedding?: number[];
  createdAt: Date;
};

// Suggestion types
export type Suggestion = {
  _id: ObjectId;
  id: string;
  documentId: string;
  documentCreatedAt: Date;
  originalText: string;
  suggestedText: string;
  description?: string;
  isResolved: boolean;
  userId: string;
  createdAt: Date;
};

// Stream types (for resumable streams)
export type Stream = {
  _id: ObjectId;
  id: string;
  chatId: string;
  createdAt: Date;
};
