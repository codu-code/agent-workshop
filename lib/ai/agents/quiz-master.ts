import { generateObject, tool } from "ai";
import { z } from "zod";
import { saveDocument } from "@/lib/db/queries";
import { myProvider } from "../providers";
import type { AgentResult, CreateAgentProps } from "./types";

const flashcardSchema = z.object({
  topic: z.string(),
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).length(4),
      correctAnswer: z.number().min(0).max(3),
      explanation: z.string(),
    })
  ),
});

/**
 * Quiz Master Agent - Creates interactive flashcard quizzes
 *
 * Triggers: "quiz me", "test my knowledge", "practice questions", "assessment"
 * Output: Creates a flashcard artifact for interactive testing
 */
export const createQuizMasterAgent = ({
  session,
  dataStream,
}: CreateAgentProps) =>
  tool({
    description:
      "Create a quiz or practice questions to test knowledge on a topic. Use when the user wants to be quizzed, test their knowledge, or practice with questions. Triggers: quiz me, test me, practice questions, assessment, flashcards.",
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
      focusAreas: z
        .array(z.string())
        .optional()
        .describe("Specific areas within the topic to focus on"),
    }),
    execute: async ({
      topic,
      numberOfQuestions,
      difficulty,
      focusAreas,
    }): Promise<AgentResult> => {
      const documentId = crypto.randomUUID();
      const title = `Quiz: ${topic}`;

      console.log(`[QuizMaster] Starting quiz generation for "${topic}"`);
      console.log(
        `[QuizMaster] Parameters: ${numberOfQuestions} questions, ${difficulty} difficulty`
      );

      // Notify UI that we're creating an artifact (opens the panel)
      dataStream.write({ type: "data-id", data: documentId });
      dataStream.write({ type: "data-title", data: title });
      dataStream.write({ type: "data-kind", data: "flashcard" });
      dataStream.write({ type: "data-clear", data: null });

      try {
        const focusContext = focusAreas?.length
          ? `\n\nFocus particularly on: ${focusAreas.join(", ")}`
          : "";

        console.log("[QuizMaster] Calling generateObject...");

        const { object } = await generateObject({
          model: myProvider.languageModel("artifact-model"),
          schema: flashcardSchema,
          prompt: `Create a quiz with ${numberOfQuestions} multiple choice questions about: "${topic}"
Difficulty level: ${difficulty}${focusContext}

Each question should:
- Test understanding, not just memorization
- Have 4 options (A, B, C, D)
- Have a clear correct answer
- Include a brief explanation of why the answer is correct

Return the quiz as structured JSON.`,
        });

        const content = JSON.stringify(object, null, 2);
        console.log(
          `[QuizMaster] Generated ${object.questions.length} questions (${content.length} chars)`
        );

        // Stream the content to the UI
        dataStream.write({
          type: "data-flashcardDelta",
          data: content,
          transient: true,
        });

        // Signal completion - CRITICAL: always send this
        dataStream.write({ type: "data-finish", data: null });
        console.log("[QuizMaster] Sent data-finish signal");

        // Save to database if user is authenticated
        if (session?.user?.id) {
          await saveDocument({
            id: documentId,
            title,
            content,
            kind: "flashcard",
            userId: session.user.id,
          });
          console.log(`[QuizMaster] Saved document ${documentId} to database`);
        }

        return {
          agentName: "quiz-master",
          success: true,
          summary: `Created an interactive quiz about "${topic}" with ${object.questions.length} questions. The flashcard quiz is now displayed - click through to test your knowledge!`,
          data: {
            documentId,
            topic,
            numberOfQuestions: object.questions.length,
            difficulty,
            focusAreas,
          },
        };
      } catch (error) {
        console.error("[QuizMaster] Error generating quiz:", error);

        // CRITICAL: Always send finish signal to unblock UI
        dataStream.write({ type: "data-finish", data: null });
        console.log("[QuizMaster] Sent data-finish signal after error");

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        return {
          agentName: "quiz-master",
          success: false,
          summary: `Failed to generate quiz about "${topic}": ${errorMessage}. Please try again.`,
          data: {
            documentId,
            topic,
            error: errorMessage,
          },
        };
      }
    },
  });
