import { generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../providers";
import type { AgentResult, CreateAgentProps } from "./types";

const TUTOR_SYSTEM_PROMPT = `You are a patient, encouraging tutor who excels at explaining complex topics.

Your teaching approach:
- Start with what the student likely already knows
- Use relatable analogies and real-world examples
- Break complex ideas into digestible steps
- Include brief knowledge checks when appropriate
- Encourage curiosity and questions
- Adapt explanation depth based on the topic complexity

Structure your explanations with:
1. A simple overview (1-2 sentences)
2. The main explanation with examples
3. Key takeaways or summary points

Keep responses focused and educational. Avoid unnecessary fluff.`;

/**
 * Tutor Agent - Explains concepts with examples and analogies
 *
 * Triggers: "explain", "teach me", "how does X work", "what is"
 * Output: Returns explanation text that the orchestrator will present
 *
 * Note: We use generateText instead of streaming because tool results
 * are displayed in the chat UI, not the artifact panel. The orchestrator
 * (main chat model) can then present the explanation conversationally.
 */
export const createTutorAgent = (_props: CreateAgentProps) =>
  tool({
    description:
      "Explain a concept, topic, or idea in detail with examples and analogies. Use when the user asks to understand, learn about, or needs explanation of something. Triggers: explain, teach me, how does X work, what is X.",
    inputSchema: z.object({
      topic: z.string().describe("The topic or concept to explain"),
      depth: z
        .enum(["beginner", "intermediate", "advanced"])
        .default("intermediate")
        .describe("The depth of explanation needed based on user context"),
      context: z
        .string()
        .optional()
        .describe(
          "Additional context about what the user already knows or specific aspects to focus on"
        ),
    }),
    execute: async ({ topic, depth, context }): Promise<AgentResult> => {
      const prompt = `Explain "${topic}" at a ${depth} level.${
        context ? `\n\nAdditional context: ${context}` : ""
      }`;

      const { text } = await generateText({
        model: myProvider.languageModel("chat-model"),
        system: TUTOR_SYSTEM_PROMPT,
        prompt,
      });

      return {
        agentName: "tutor",
        success: true,
        summary: text,
        data: { topic, depth, contentLength: text.length },
      };
    },
  });
