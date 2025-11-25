import { generateObject, tool } from "ai";
import { z } from "zod";
import { saveDocument } from "@/lib/db/queries";
import { myProvider } from "../providers";
import type { AgentResult, CreateAgentProps } from "./types";

const studyPlanSchema = z.object({
  topic: z.string(),
  duration: z.string(),
  overview: z.string(),
  weeks: z.array(
    z.object({
      week: z.number(),
      title: z.string(),
      goals: z.array(z.string()),
      tasks: z.array(
        z.object({
          task: z.string(),
          duration: z.string(),
          completed: z.boolean().default(false),
        })
      ),
      resources: z.array(z.string()),
    })
  ),
  tips: z.array(z.string()),
});

/**
 * Planner Agent - Creates interactive study plans with progress tracking
 *
 * Triggers: "create study plan", "learning roadmap", "how should I learn", "study schedule"
 * Output: Creates a study-plan artifact for tracking learning progress
 */
export const createPlannerAgent = ({ session, dataStream }: CreateAgentProps) =>
  tool({
    description:
      "Create a personalized study plan or learning roadmap for a topic. Use when the user wants to plan their learning, create a study schedule, or get a structured approach to learning something. Triggers: study plan, learning roadmap, how to learn, schedule, curriculum.",
    inputSchema: z.object({
      topic: z
        .string()
        .describe("The topic or skill to create a study plan for"),
      timeframe: z
        .string()
        .default("2 weeks")
        .describe(
          "How long the user has to learn (e.g., '1 week', '30 days', '3 months')"
        ),
      hoursPerDay: z
        .number()
        .min(0.5)
        .max(8)
        .default(1)
        .describe("Hours available for study per day"),
      currentLevel: z
        .enum(["complete beginner", "some basics", "intermediate", "advanced"])
        .default("complete beginner")
        .describe("User's current knowledge level"),
      goals: z
        .array(z.string())
        .optional()
        .describe("Specific goals or outcomes the user wants to achieve"),
    }),
    execute: async ({
      topic,
      timeframe,
      hoursPerDay,
      currentLevel,
      goals,
    }): Promise<AgentResult> => {
      const documentId = crypto.randomUUID();
      const title = `Study Plan: ${topic}`;

      console.log(`[Planner] Starting study plan generation for "${topic}"`);
      console.log(
        `[Planner] Parameters: ${timeframe}, ${hoursPerDay}h/day, level: ${currentLevel}`
      );

      // Notify UI that we're creating an artifact (opens the panel)
      dataStream.write({ type: "data-id", data: documentId });
      dataStream.write({ type: "data-title", data: title });
      dataStream.write({ type: "data-kind", data: "study-plan" });
      dataStream.write({ type: "data-clear", data: null });

      try {
        const goalsContext = goals?.length
          ? `\n\nSpecific goals to achieve:\n${goals.map((g) => `- ${g}`).join("\n")}`
          : "";

        console.log("[Planner] Calling generateObject...");

        const { object } = await generateObject({
          model: myProvider.languageModel("artifact-model"),
          schema: studyPlanSchema,
          prompt: `Create a structured study plan for learning "${topic}".

Student profile:
- Current level: ${currentLevel}
- Available time: ${hoursPerDay} hours per day
- Timeframe: ${timeframe}${goalsContext}

Create a practical, actionable study plan that includes:
- A clear overview of what will be learned
- Weekly breakdown with specific goals
- Daily tasks with estimated durations
- Recommended resources (types of materials, not specific URLs)
- Tips for staying on track

Make it realistic and achievable.`,
        });

        const content = JSON.stringify(object, null, 2);
        console.log(
          `[Planner] Generated plan with ${object.weeks.length} weeks (${content.length} chars)`
        );

        // Stream the content to the UI
        dataStream.write({
          type: "data-studyPlanDelta",
          data: content,
          transient: true,
        });

        // Signal completion - CRITICAL: always send this
        dataStream.write({ type: "data-finish", data: null });
        console.log("[Planner] Sent data-finish signal");

        // Save to database if user is authenticated
        if (session?.user?.id) {
          await saveDocument({
            id: documentId,
            title,
            content,
            kind: "study-plan",
            userId: session.user.id,
          });
          console.log(`[Planner] Saved document ${documentId} to database`);
        }

        return {
          agentName: "planner",
          success: true,
          summary: `Created a ${timeframe} study plan for "${topic}" with ${object.weeks.length} weeks. The interactive study plan is now displayed - you can track your progress by checking off tasks as you complete them!`,
          data: {
            documentId,
            topic,
            timeframe,
            hoursPerDay,
            currentLevel,
            goals,
            weeksCount: object.weeks.length,
          },
        };
      } catch (error) {
        console.error("[Planner] Error generating study plan:", error);

        // CRITICAL: Always send finish signal to unblock UI
        dataStream.write({ type: "data-finish", data: null });
        console.log("[Planner] Sent data-finish signal after error");

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        return {
          agentName: "planner",
          success: false,
          summary: `Failed to generate study plan for "${topic}": ${errorMessage}. Please try again.`,
          data: {
            documentId,
            topic,
            error: errorMessage,
          },
        };
      }
    },
  });
