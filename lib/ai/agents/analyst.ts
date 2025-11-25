import { generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../providers";
import type { AgentResult, CreateAgentProps } from "./types";

const ANALYST_SYSTEM_PROMPT = `You are a document analyst who excels at extracting insights and summarizing content.

Your analysis approach:
- Identify the main themes and key points
- Extract important facts, figures, and arguments
- Note relationships between concepts
- Highlight actionable insights
- Provide clear, structured summaries

For document analysis, provide:
1. Executive summary (2-3 sentences)
2. Key points and main arguments
3. Important details and supporting evidence
4. Connections to broader context
5. Actionable takeaways or study notes

Be thorough but concise. Focus on what would be most valuable for learning and retention.`;

/**
 * Analyst Agent - Analyzes documents and extracts key insights
 *
 * Triggers: "analyze this", "summarize", "key points", "what's important"
 * Output: Returns analysis that the orchestrator will present
 */
export const createAnalystAgent = (_props: CreateAgentProps) =>
  tool({
    description:
      "Analyze content, extract key insights, and create summaries. Use when the user wants to understand, summarize, or extract key points from text, documents, or concepts. Triggers: analyze, summarize, key points, main ideas, extract insights, break down.",
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
    execute: async ({
      content,
      analysisType,
      focusOn,
      outputLength,
    }): Promise<AgentResult> => {
      const focusContext = focusOn
        ? `\n\nFocus particularly on: ${focusOn}`
        : "";

      const lengthGuide = {
        brief: "Keep the analysis concise, around 100-200 words.",
        moderate: "Provide a balanced analysis, around 300-500 words.",
        detailed: "Provide a comprehensive analysis, around 600-800 words.",
      };

      const analysisGuide = {
        summary:
          "Create a clear summary highlighting the main message and supporting points.",
        "key-points":
          "Extract and list the most important points as bullet points with brief explanations.",
        "deep-analysis":
          "Provide thorough analysis including themes, arguments, evidence, and implications.",
        "study-notes":
          "Create study-friendly notes with headings, key terms, and memorable takeaways.",
      };

      const prompt = `Analyze the following content:

---
${content}
---

Analysis type: ${analysisType}
${analysisGuide[analysisType]}
${focusContext}

${lengthGuide[outputLength]}`;

      const { text } = await generateText({
        model: myProvider.languageModel("chat-model"),
        system: ANALYST_SYSTEM_PROMPT,
        prompt,
      });

      return {
        agentName: "analyst",
        success: true,
        summary: text,
        data: {
          analysisType,
          focusOn,
          outputLength,
          contentLength: content.length,
        },
      };
    },
  });
