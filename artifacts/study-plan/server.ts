import { generateObject } from "ai";
import { z } from "zod";
import { myProvider } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";

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

export type StudyPlanData = z.infer<typeof studyPlanSchema>;

export const studyPlanDocumentHandler = createDocumentHandler<"study-plan">({
  kind: "study-plan",
  onCreateDocument: async ({ title, dataStream }) => {
    const { object } = await generateObject({
      model: myProvider.languageModel("artifact-model"),
      schema: studyPlanSchema,
      prompt: `Create a structured study plan for: "${title}"

Create a practical, actionable study plan that includes:
- A clear overview of what will be learned
- Weekly breakdown with specific goals
- Daily tasks with estimated durations
- Recommended resources (types of materials, not specific URLs)
- Tips for staying on track

Make it realistic and achievable. Default to a 2-week plan unless specified otherwise.`,
    });

    const content = JSON.stringify(object, null, 2);

    dataStream.write({
      type: "data-studyPlanDelta",
      data: content,
      transient: true,
    });

    return content;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    const currentData = JSON.parse(document.content || "{}") as StudyPlanData;

    const { object } = await generateObject({
      model: myProvider.languageModel("artifact-model"),
      schema: studyPlanSchema,
      prompt: `Update this study plan based on the request: "${description}"

Current plan:
${JSON.stringify(currentData, null, 2)}

Make the requested changes while maintaining the plan structure.`,
    });

    const content = JSON.stringify(object, null, 2);

    dataStream.write({
      type: "data-studyPlanDelta",
      data: content,
      transient: true,
    });

    return content;
  },
});
