import { tool } from "ai";
import { z } from "zod";

import type { AgentResult, CreateAgentProps } from "./types";

// TODO CHAPTER 3: Implement the Quiz Master Agent
//
// The Quiz Master creates interactive quizzes to test knowledge.
// It should:
// 1. Accept a topic, number of questions, and difficulty level
// 2. Use generateObject to create structured quiz data
// 3. Return quiz questions with multiple choice options
//
// In Chapter 4, this will create a flashcard artifact instead of text.
//
// Triggers: "quiz me", "test my knowledge", "practice questions"
//
// See CHAPTER-3.md for the complete implementation.

/**
 * Quiz Master Agent - Creates quizzes to test knowledge
 *
 * @param _props - Agent props (session, dataStream)
 * @returns AI SDK tool that generates quiz questions
 */
export const createQuizMasterAgent = (_props: CreateAgentProps) =>
  tool({
    description:
      "Create a quiz to test knowledge on a topic. " +
      "Use when the user wants to be quizzed, test their knowledge, or practice. " +
      "Triggers: quiz me, test me, practice questions, assessment, flashcards.",
    inputSchema: z.object({
      topic: z.string().describe("The topic to create quiz questions about"),
      numberOfQuestions: z
        .number()
        .min(1)
        .max(10)
        .default(5)
        .describe("Number of questions to generate"),
      difficulty: z
        .enum(["easy", "medium", "hard", "mixed"])
        .default("medium")
        .describe("Difficulty level of the questions"),
    }),
    execute: async ({ topic }): Promise<AgentResult> => {
      // TODO: Implement in Chapter 3
      // 1. Use generateObject with a quiz schema
      // 2. Generate questions with options and explanations
      // 3. Format as markdown or create artifact in Chapter 4

      console.log(`[QuizMaster] TODO: Create quiz about "${topic}"`);

      // Placeholder await to satisfy linter (remove when implementing)
      await Promise.resolve();

      return {
        agentName: "quiz-master",
        success: false,
        summary: `TODO: Implement quiz master in Chapter 3 to create quiz about "${topic}"`,
      };
    },
  });
