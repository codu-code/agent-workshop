import { generateObject } from "ai";
import { z } from "zod";
import { myProvider } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";

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

export type FlashcardData = z.infer<typeof flashcardSchema>;

export const flashcardDocumentHandler = createDocumentHandler<"flashcard">({
  kind: "flashcard",
  onCreateDocument: async ({ title, dataStream }) => {
    const { object } = await generateObject({
      model: myProvider.languageModel("artifact-model"),
      schema: flashcardSchema,
      prompt: `Create a quiz with 5 multiple choice questions about: "${title}"

Each question should:
- Test understanding, not just memorization
- Have 4 options (A, B, C, D)
- Have a clear correct answer
- Include a brief explanation of why the answer is correct

Return the quiz as structured JSON.`,
    });

    const content = JSON.stringify(object, null, 2);

    // Stream the content as a single delta
    dataStream.write({
      type: "data-flashcardDelta",
      data: content,
      transient: true,
    });

    return content;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    const currentData = JSON.parse(document.content || "{}") as FlashcardData;

    const { object } = await generateObject({
      model: myProvider.languageModel("artifact-model"),
      schema: flashcardSchema,
      prompt: `Update this quiz based on the request: "${description}"

Current quiz:
${JSON.stringify(currentData, null, 2)}

Make the requested changes while maintaining the quiz structure.`,
    });

    const content = JSON.stringify(object, null, 2);

    dataStream.write({
      type: "data-flashcardDelta",
      data: content,
      transient: true,
    });

    return content;
  },
});
