import type { DataStreamWriter } from "ai";
import type { Session } from "next-auth";

// TODO CHAPTER 2: Agent type definitions
//
// These types define the contract for all agents:
// - CreateAgentProps: What gets passed to agent creators
// - AgentResult: What agents return after execution
//
// See CHAPTER-2.md for complete implementation details.

/**
 * Props passed to every agent creator function
 */
export type CreateAgentProps = {
  session: Session | null;
  dataStream: DataStreamWriter;
};

/**
 * Standard result format returned by all agents
 */
export type AgentResult = {
  agentName: string;
  success: boolean;
  summary: string;
  data?: Record<string, unknown>;
};
