# Chapter 3: Multi-Agent Orchestration

In this chapter, we'll add multiple specialized agents and see how they work together. We'll create a Quiz Master that tests knowledge and a Planner that creates study schedules.

> **Branch**: `workshop/chapter-03-multi-agent`
> ```bash
> git checkout workshop/chapter-03-multi-agent
> ```

---

## Teaching Notes for Presenters

### React Parallels

| AI SDK Concept | React Equivalent | Key Insight |
|----------------|------------------|-------------|
| Multiple agents | Multiple context providers | Each provides specialized functionality |
| Orchestrator routing | React Router | Picks the right component based on input |
| `generateObject` | Form state with Zod | Returns typed, validated data structures |
| Agent descriptions | Route matching patterns | AI matches intent to description, like URL patterns |

### Key Talking Points

1. **"The AI is your router"**
   - Just like React Router matches URLs to components
   - The orchestrator matches user intent to agents
   - Good descriptions = accurate routing

2. **"`generateObject` is like a smart form submission"**
   - You define the schema (like form fields)
   - AI fills it in with valid data
   - Returns typed JSON, not free-form text

3. **"Agents should be single-purpose"**
   - One agent = one job (Single Responsibility)
   - Overlapping descriptions = confused routing
   - Clear triggers = predictable behavior

### Live Demo Tips

- Ask for a quiz, then a study plan, then an explanation - show all three agents
- Try chained requests: "Explain React hooks, then quiz me on them"
- Show the Zod schema and how it enforces structure

### Common Questions

- **"What if two agents could handle the request?"** - Most specific description wins
- **"Can I have too many agents?"** - Yes! Each adds complexity. Start with 3-5
- **"Why `generateObject` for quiz but `generateText` for tutor?"** - Quiz needs structured data; tutor needs free-form text

---

## Learning Objectives

By the end of this chapter, you'll understand:
- How to create multiple specialized agents
- How the orchestrator routes between agents
- Agent design principles for clear responsibilities
- How agents can work together in a conversation

## The Multi-Agent Architecture

```
                    ┌─────────────────────┐
                    │    Orchestrator     │
                    │  (Claude Haiku)     │
                    │                     │
                    │ Analyzes user intent│
                    │ Picks the right tool│
                    └──────────┬──────────┘
                               │
       ┌───────────────┬───────┴───────┬───────────────┐
       ↓               ↓               ↓               ↓
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   Tutor     │ │ Quiz Master │ │  Planner    │ │  Analyst    │
│   Agent     │ │   Agent     │ │   Agent     │ │   Agent     │
│             │ │             │ │             │ │             │
│ "explain X" │ │ "quiz me"   │ │"study plan" │ │ "summarize" │
│ "teach me"  │ │ "test me"   │ │"schedule"   │ │ "key points"│
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

## Agent Design Principles

1. **Clear Triggers**: Each agent should have obvious keywords that activate it
2. **Distinct Purpose**: No overlap between agent responsibilities
3. **Helpful Descriptions**: The AI reads descriptions to decide which tool to use
4. **Graceful Errors**: Always return something useful, even on failure

## The Quiz Master Agent

Creates interactive flashcard quizzes that appear as artifacts:

### File: `lib/ai/agents/quiz-master.ts`

```typescript
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
```

**Key patterns for artifact-creating agents:**
1. Generate a unique `documentId` upfront
2. Send `data-id`, `data-title`, `data-kind`, and `data-clear` to open the artifact panel
3. Use `generateObject` with a schema for structured output
4. Stream the content with the appropriate delta type (e.g., `data-flashcardDelta`)
5. **Always** send `data-finish` to unblock the UI (even on errors!)
6. Save to database for persistence

## The Planner Agent

Creates interactive study plans with progress tracking that appear as artifacts:

### File: `lib/ai/agents/planner.ts`

```typescript
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
```

## The Analyst Agent

Analyzes content and extracts key insights (returns text, not an artifact):

### File: `lib/ai/agents/analyst.ts`

```typescript
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
```

**Key difference from Tutor**: The Analyst focuses on breaking down existing content, while the Tutor generates new explanations. Use Analyst for "summarize this article" and Tutor for "explain quantum physics".

**Key difference from Quiz/Planner**: The Analyst returns text directly in the `summary` field (like the Tutor), while Quiz Master and Planner create artifacts with `dataStream.write()` calls.

## Wiring All Agents Together

### File: `app/(chat)/api/chat/route.ts`

The route handler uses `createUIMessageStream` and barrel imports from `@/lib/ai/agents`:

```typescript
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { auth } from "@/app/(auth)/auth";
import {
  createAnalystAgent,
  createPlannerAgent,
  createQuizMasterAgent,
  createTutorAgent,
} from "@/lib/ai/agents";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { getWeather } from "@/lib/ai/tools/get-weather";

export async function POST(request: Request) {
  const session = await auth();
  // ... request parsing, validation, etc.

  const stream = createUIMessageStream({
    execute: ({ writer: dataStream }) => {
      const result = streamText({
        model: myProvider.languageModel(selectedChatModel),
        system: systemPrompt({ selectedChatModel, requestHints }),
        messages: convertToModelMessages(uiMessages),
        stopWhen: stepCountIs(5),
        experimental_activeTools:
          selectedChatModel === "chat-model-reasoning"
            ? []
            : ["getWeather", "tutor", "quizMaster", "planner", "analyst"],
        experimental_transform: smoothStream({ chunking: "word" }),
        tools: {
          getWeather,
          tutor: createTutorAgent({ session, dataStream }),
          quizMaster: createQuizMasterAgent({ session, dataStream }),
          planner: createPlannerAgent({ session, dataStream }),
          analyst: createAnalystAgent({ session, dataStream }),
        },
      });

      result.consumeStream();

      dataStream.merge(
        result.toUIMessageStream({
          sendReasoning: true,
        })
      );
    },
    // ... onFinish, onError handlers
  });

  return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
}
```

**Key points:**
- Use barrel import `from "@/lib/ai/agents"` (not individual files)
- `createUIMessageStream` + `JsonToSseTransformStream` for streaming
- `stepCountIs(5)` limits agent call depth
- `experimental_activeTools` disables tools for reasoning model

## Updated System Prompt

### File: `lib/ai/prompts.ts`

The system prompt is built from multiple parts and takes parameters:

```typescript
export const regularPrompt =
  "You are a friendly study buddy assistant! Keep your responses concise and helpful.";

export const agentRoutingPrompt = `
You are a Study Buddy with specialized agents available as tools. Choose the right agent based on what the user needs:

**tutor** - Explain concepts with examples and analogies
Use for: "explain", "teach me", "how does X work", "what is X", understanding concepts

**quizMaster** - Create quizzes and practice questions (creates interactive flashcard artifact)
Use for: "quiz me", "test my knowledge", "practice questions", "assessment"

**planner** - Create study plans and learning roadmaps (creates interactive study-plan artifact)
Use for: "study plan", "learning roadmap", "how should I learn", "schedule"

**analyst** - Analyze content and extract key insights
Use for: "summarize", "key points", "analyze this", "what's important"

IMPORTANT ROUTING RULES:
1. Match user intent to the most appropriate agent
2. If the request doesn't clearly match an agent, respond conversationally
3. After using an agent, suggest related follow-ups (e.g., after explaining, offer to quiz)
4. You can chain agents - explain first, then offer to create a study plan

CRITICAL: Agents (quizMaster, planner) create their own artifacts automatically. After using these agents:
- Do NOT call createDocument - the artifact is already created
- Do NOT try to display or reformat the agent's output
- Simply acknowledge the artifact was created and offer follow-up suggestions
`;

export type RequestHints = {
  latitude: Geo["latitude"];
  longitude: Geo["longitude"];
  city: Geo["city"];
  country: Geo["country"];
};

export const systemPrompt = ({
  selectedChatModel,
  requestHints,
}: {
  selectedChatModel: string;
  requestHints: RequestHints;
}) => {
  const requestPrompt = getRequestPromptFromHints(requestHints);

  if (selectedChatModel === "chat-model-reasoning") {
    return `${regularPrompt}\n\n${requestPrompt}`;
  }

  return `${regularPrompt}\n\n${agentRoutingPrompt}\n\n${requestPrompt}`;
};
```

**Key points:**
- `regularPrompt` for base personality
- `agentRoutingPrompt` for tool/agent descriptions (only for non-reasoning models)
- `requestHints` adds geolocation context
- Reasoning model gets simpler prompt (no tools)

## Agent Collaboration in Action

```
User: "Teach me about React hooks"
  → Orchestrator → Tutor Agent
  → Explanation with examples

User: "Quiz me on what I just learned"
  → Orchestrator → Quiz Master Agent
  → 5 questions about React hooks

User: "Create a study plan to master React"
  → Orchestrator → Planner Agent
  → 2-week structured learning plan

User: "What's the weather in Seattle?"
  → Orchestrator → Weather Tool
  → Current weather data
```

## Try It Out: Multi-Agent System

Now test all your agents! Use the shortcut buttons in the chat or try these prompts:

### Quiz Master Agent
Click **"Quiz me on JavaScript fundamentals"** or try:
```
Quiz me on JavaScript fundamentals
Test my knowledge of React hooks
Create a quiz about CSS flexbox
Give me practice questions on TypeScript generics
Quiz me on what you just explained
```

### Planner Agent
Click **"Create a 2-week study plan for learning React"** or try:
```
Create a 2-week study plan for learning React
Help me plan how to learn TypeScript in 30 days
I want to learn system design - create a study roadmap
Build me a 1-week crash course on GraphQL
Create a study plan for becoming a full-stack developer
```

### Analyst Agent
```
Summarize the key concepts of functional programming
What are the most important things to know about REST APIs?
Analyze the pros and cons of microservices architecture
Give me the key points about web accessibility
```

### Multi-Agent Conversations (Chaining)
Try these flows that use multiple agents in sequence:
```
Explain React useEffect, then quiz me on it
Teach me about promises, then create a study plan to master async JavaScript
Summarize machine learning basics, then create practice questions
```

**What to observe:**
- Different prompts route to different agents based on keywords
- Quiz Master generates structured multiple-choice questions
- Planner creates weekly breakdowns with tasks and resources
- Analyst extracts key points and creates summaries
- The AI suggests follow-up actions (e.g., "Would you like me to quiz you on this?")

**Agent Routing in Action:**
Watch the console logs to see which agent is being called:
- `[Tutor] Explaining "X" using Y approach`
- `[QuizMaster] Creating N questions about "X"`
- `[Planner] Creating study plan for "X"`
- `[Analyst] Analyzing content (summary)`

---

## Exercise: Add a Flashcard Review Agent

Create a new agent that helps review previously created flashcards:

1. Create `lib/ai/agents/reviewer.ts`
2. Triggers: "review flashcards", "spaced repetition", "what should I review"
3. It should track which questions were answered correctly/incorrectly
4. Suggest which topics need more practice based on performance
5. Add it to the chat route

## Key Concepts Recap

| Concept | Description |
|---------|-------------|
| Orchestrator | Main model that decides which agent to use |
| Agent Routing | Based on tool descriptions and user intent |
| generateObject | AI SDK function that returns typed data |
| Zod Schema | Defines the structure of generated data |
| stepCountIs | Limits how many agent steps can run in sequence |
| dataStream.write | Sends artifact data to UI in real-time |

## What's Next

In Chapter 4, we'll turn our quiz and plan results into **interactive artifacts** - rich UI components that appear alongside the chat and let users interact with the content.

## Files Changed in This Chapter

| File | Changes |
|------|---------|
| `lib/ai/agents/quiz-master.ts` | New - quiz generation agent |
| `lib/ai/agents/planner.ts` | New - study plan agent |
| `lib/ai/agents/analyst.ts` | New - content analysis agent |
| `app/(chat)/api/chat/route.ts` | Added all agents |
| `lib/ai/prompts.ts` | Complete Study Buddy prompt |
