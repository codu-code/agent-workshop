import type { UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import type { ChatMessage } from "@/lib/types";

/**
 * Context passed to all specialized agents
 * Contains session info, data stream for real-time updates, and chat ID
 */
export type AgentContext = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  chatId: string;
};

/**
 * Standard result returned by all agents
 * Provides consistent interface for orchestrator to handle agent responses
 */
export type AgentResult = {
  agentName: string;
  success: boolean;
  summary: string;
  data?: Record<string, unknown>;
};

/**
 * Props for creating an agent tool
 * Same pattern as existing tools (createDocument, requestSuggestions)
 */
export type CreateAgentProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};
