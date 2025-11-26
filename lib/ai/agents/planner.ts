import { tool } from "ai";
import { z } from "zod";

import type { AgentResult, CreateAgentProps } from "./types";

// TODO CHAPTER 3: Implement the Planner Agent
//
// The Planner creates personalized study plans and learning roadmaps.
// It should:
// 1. Accept a topic, timeframe, hours/day, and current level
// 2. Use generateObject to create structured study plan data
// 3. Return weekly breakdown with goals, tasks, and resources
//
// In Chapter 4, this will create a study-plan artifact with checkboxes.
//
// Triggers: "study plan", "learning roadmap", "how should I learn"
//
// See CHAPTER-3.md for the complete implementation.

/**
 * Planner Agent - Creates study plans and learning roadmaps
 *
 * @param _props - Agent props (session, dataStream)
 * @returns AI SDK tool that generates study plans
 */
export const createPlannerAgent = (_props: CreateAgentProps) =>
  tool({
    description:
      "Create a personalized study plan or learning roadmap for a topic. " +
      "Use when the user wants to plan their learning, create a study schedule, or get a structured approach. " +
      "Triggers: study plan, learning roadmap, how to learn, schedule, curriculum.",
    inputSchema: z.object({
      topic: z
        .string()
        .describe("The topic or skill to create a study plan for"),
      timeframe: z
        .string()
        .default("2 weeks")
        .describe("How long the user has to learn (e.g., '1 week', '30 days')"),
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
    }),
    execute: async ({ topic }): Promise<AgentResult> => {
      // TODO: Implement in Chapter 3
      // 1. Use generateObject with a study plan schema
      // 2. Create weekly breakdown with goals and tasks
      // 3. Format as markdown or create artifact in Chapter 4

      console.log(`[Planner] TODO: Create study plan for "${topic}"`);

      // Placeholder await to satisfy linter (remove when implementing)
      await Promise.resolve();

      return {
        agentName: "planner",
        success: false,
        summary: `TODO: Implement planner in Chapter 3 to create study plan for "${topic}"`,
      };
    },
  });
