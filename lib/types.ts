import type { UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/artifact";
import type { WeatherAtLocation } from "@/components/weather";
import type { Suggestion } from "./db/types";
import type { AppUsage } from "./usage";

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

// Tool type definitions for UI rendering
// These are placeholders in Chapter 0 - tools not registered in the API
// UITools expects { input, output } shape for each tool
type DocumentResult = {
  id: string;
  title: string;
  kind: ArtifactKind;
};

export type ChatTools = {
  getWeather: {
    input: { latitude: number; longitude: number };
    output: WeatherAtLocation;
  };
  createDocument: {
    input: { title: string; kind: ArtifactKind };
    output: DocumentResult | { error: string };
  };
  updateDocument: {
    input: { id: string; description: string };
    output: DocumentResult | { error: string };
  };
  requestSuggestions: {
    input: { documentId: string };
    output: DocumentResult | { error: string };
  };
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  error: string;
  usage: AppUsage;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};
