import { tool } from "ai";
import { z } from "zod";

import type { AgentResult, CreateAgentProps } from "./types";

// TODO CHAPTER 3: Implement the Analyst Agent
//
// The Analyst analyzes content and extracts key insights.
// It should:
// 1. Accept content and analysis type (summary, key-points, deep-analysis, study-notes)
// 2. Use generateText to analyze the content
// 3. Return structured analysis or summary
//
// Triggers: "analyze", "summarize", "key points", "what's important"
//
// See CHAPTER-3.md for the complete implementation.

/**
 * Analyst Agent - Analyzes content and extracts insights
 *
 * @param _props - Agent props (session, dataStream)
 * @returns AI SDK tool that analyzes and summarizes content
 */
export const createAnalystAgent = (_props: CreateAgentProps) =>
  tool({
    description:
      "Analyze content, extract key insights, and create summaries. " +
      "Use when the user wants to understand, summarize, or extract key points. " +
      "Triggers: analyze, summarize, key points, main ideas, extract insights.",
    inputSchema: z.object({
      content: z.string().describe("The text or content to analyze"),
      analysisType: z
        .enum(["summary", "key-points", "deep-analysis", "study-notes"])
        .default("summary")
        .describe("Type of analysis to perform"),
      focusOn: z
        .string()
        .optional()
        .describe("Specific aspect to focus the analysis on"),
      outputLength: z
        .enum(["brief", "moderate", "detailed"])
        .default("moderate")
        .describe("Desired length of the analysis output"),
    }),
    execute: async ({ analysisType }): Promise<AgentResult> => {
      // TODO: Implement in Chapter 3
      // 1. Build prompt based on analysis type
      // 2. Use generateText to analyze content
      // 3. Return structured analysis result

      console.log(`[Analyst] TODO: Perform ${analysisType} analysis`);

      // Placeholder await to satisfy linter (remove when implementing)
      await Promise.resolve();

      return {
        agentName: "analyst",
        success: false,
        summary: `TODO: Implement analyst in Chapter 3 to perform ${analysisType} analysis`,
      };
    },
  });
