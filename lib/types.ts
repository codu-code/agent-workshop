import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/artifact";
import type {
  createAnalystAgent,
  createPlannerAgent,
  createQuizMasterAgent,
  createTutorAgent,
} from "./ai/agents";
import type { getWeather } from "./ai/tools/get-weather";
import type { Suggestion } from "./db/types";
import type { AppUsage } from "./usage";

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

// Tool types - inferred from actual tool definitions
type weatherTool = InferUITool<typeof getWeather>;

// Agent tool types
type tutorTool = InferUITool<ReturnType<typeof createTutorAgent>>;
type quizMasterTool = InferUITool<ReturnType<typeof createQuizMasterAgent>>;
type plannerTool = InferUITool<ReturnType<typeof createPlannerAgent>>;
type analystTool = InferUITool<ReturnType<typeof createAnalystAgent>>;

// Placeholder types for tools not yet implemented
// UITools expects { input, output } shape for each tool
type DocumentResult = {
  id: string;
  title: string;
  kind: ArtifactKind;
};

export type ChatTools = {
  getWeather: weatherTool;
  // Study buddy agents
  tutor: tutorTool;
  quizMaster: quizMasterTool;
  planner: plannerTool;
  analyst: analystTool;
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
  flashcardDelta: string;
  studyPlanDelta: string;
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
