import { tool } from "ai";
import { z } from "zod";

import type { AgentResult, CreateAgentProps } from "./types";

// TODO CHAPTER 2: Implement the Tutor Agent
//
// The Tutor Agent explains concepts with different teaching approaches.
// It should:
// 1. Accept a topic and teaching approach (eli5, technical, analogy, step-by-step)
// 2. Use generateText to call the AI and create an explanation
// 3. Return a structured AgentResult with the explanation
//
// Triggers: "explain", "teach me", "how does X work", "what is"
//
// See CHAPTER-2.md for the complete implementation.

/**
 * Tutor Agent - Explains concepts with different teaching approaches
 *
 * @param _props - Agent props (session, dataStream)
 * @returns AI SDK tool that can be used in streamText
 */
export const createTutorAgent = (_props: CreateAgentProps) =>
  tool({
    description:
      "Explain a concept or topic in depth. Use when the user wants to learn or understand something. " +
      "Triggers: explain, teach me, how does X work, what is, help me understand.",
    inputSchema: z.object({
      topic: z.string().describe("The topic or concept to explain"),
      approach: z
        .enum(["eli5", "technical", "analogy", "step-by-step"])
        .default("step-by-step")
        .describe(
          "Teaching approach: eli5 (simple), technical (detailed), analogy (comparisons), step-by-step"
        ),
      priorKnowledge: z
        .string()
        .optional()
        .describe("What the user already knows about the topic"),
    }),
    execute: async ({ topic }): Promise<AgentResult> => {
      // TODO: Implement in Chapter 2
      // 1. Build a prompt with the topic and approach
      // 2. Call generateText with the prompt
      // 3. Return the result as an AgentResult

      console.log(`[Tutor] TODO: Explain "${topic}"`);

      // Placeholder await to satisfy linter (remove when implementing)
      await Promise.resolve();

      return {
        agentName: "tutor",
        success: false,
        summary: `TODO: Implement tutor agent in Chapter 2 to explain "${topic}"`,
      };
    },
  });
