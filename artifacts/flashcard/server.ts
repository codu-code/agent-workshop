// TODO CHAPTER 4: Implement flashcard server handler
//
// This file should:
// 1. Define FlashcardData type schema
// 2. Create document handler for flashcard artifacts
// 3. Handle creation and updates of flashcard quizzes
//
// See CHAPTER-4.md for the complete implementation.

import { z } from "zod";

/**
 * Schema for flashcard quiz data
 */
export const flashcardSchema = z.object({
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

export type FlashcardData = z.infer<typeof flashcardSchema>;

// TODO: Add createDocumentHandler for flashcard artifacts
// export const flashcardDocumentHandler = createDocumentHandler<"flashcard">({
//   kind: "flashcard",
//   onCreateDocument: async ({ title, dataStream }) => { ... },
//   onUpdateDocument: async ({ document, description, dataStream }) => { ... },
// });
