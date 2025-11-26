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

Creates interactive quizzes to test knowledge:

### File: `lib/ai/agents/quiz-master.ts`

```typescript
import { generateObject, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../providers";
import type { AgentResult, CreateAgentProps } from "./types";

// Schema for quiz questions
const quizSchema = z.object({
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
 * Quiz Master Agent - Creates interactive quizzes
 *
 * Triggers: "quiz me", "test my knowledge", "practice questions"
 * Output: Structured quiz data (later: flashcard artifact)
 */
export const createQuizMasterAgent = ({
  session,
  dataStream,
}: CreateAgentProps) =>
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
      focusAreas: z
        .array(z.string())
        .optional()
        .describe("Specific areas within the topic to focus on"),
    }),
    execute: async ({
      topic,
      numberOfQuestions,
      difficulty,
    }): Promise<AgentResult> => {
      console.log(
        `[QuizMaster] Creating ${numberOfQuestions} ${difficulty} questions about "${topic}"`
      );

      try {
        const { object } = await generateObject({
          model: myProvider.languageModel("chat-model"),
          schema: quizSchema,
          prompt: `Create a quiz with ${numberOfQuestions} multiple choice questions about: "${topic}"
Difficulty level: ${difficulty}

Each question should:
- Test understanding, not just memorization
- Have 4 options (A, B, C, D)
- Have exactly one correct answer
- Include a brief explanation of why the answer is correct

For mixed difficulty, vary the questions from easy to hard.`,
        });

        console.log(
          `[QuizMaster] Generated ${object.questions.length} questions`
        );

        // Format as readable text for now
        // In Chapter 4, we'll create a proper flashcard artifact
        const quizText = object.questions
          .map(
            (q, i) => `
**Question ${i + 1}**: ${q.question}

A) ${q.options[0]}
B) ${q.options[1]}
C) ${q.options[2]}
D) ${q.options[3]}

<details>
<summary>Show Answer</summary>

**Correct: ${["A", "B", "C", "D"][q.correctAnswer]}**

${q.explanation}
</details>
`
          )
          .join("\n---\n");

        return {
          agentName: "quiz-master",
          success: true,
          summary: `# Quiz: ${topic}\n\n${quizText}`,
          data: {
            topic,
            questionCount: object.questions.length,
            difficulty,
          },
        };
      } catch (error) {
        console.error(`[QuizMaster] Error:`, error);
        return {
          agentName: "quiz-master",
          success: false,
          summary: `I couldn't create a quiz about "${topic}". Please try again.`,
          data: { error: String(error) },
        };
      }
    },
  });
```

## The Planner Agent

Creates structured study plans:

### File: `lib/ai/agents/planner.ts`

```typescript
import { generateObject, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../providers";
import type { AgentResult, CreateAgentProps } from "./types";

// Schema for study plans
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
 * Planner Agent - Creates study plans and learning roadmaps
 *
 * Triggers: "study plan", "learning roadmap", "how should I learn"
 * Output: Structured study plan (later: study-plan artifact)
 */
export const createPlannerAgent = ({
  session,
  dataStream,
}: CreateAgentProps) =>
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
    execute: async ({
      topic,
      timeframe,
      hoursPerDay,
      currentLevel,
    }): Promise<AgentResult> => {
      console.log(
        `[Planner] Creating ${timeframe} study plan for "${topic}" (${hoursPerDay}h/day, ${currentLevel})`
      );

      try {
        const { object } = await generateObject({
          model: myProvider.languageModel("chat-model"),
          schema: studyPlanSchema,
          prompt: `Create a structured study plan for learning "${topic}".

Student profile:
- Current level: ${currentLevel}
- Available time: ${hoursPerDay} hours per day
- Timeframe: ${timeframe}

Create a practical, actionable study plan that includes:
- A clear overview of what will be learned
- Weekly breakdown with specific goals
- Daily tasks with estimated durations
- Recommended resources (types of materials, not specific URLs)
- Tips for staying on track

Make it realistic and achievable.`,
        });

        console.log(
          `[Planner] Generated plan with ${object.weeks.length} weeks`
        );

        // Format as readable text
        const planText = `
# Study Plan: ${object.topic}
**Duration**: ${object.duration}

## Overview
${object.overview}

${object.weeks
  .map(
    (week) => `
## Week ${week.week}: ${week.title}

**Goals:**
${week.goals.map((g) => `- ${g}`).join("\n")}

**Tasks:**
${week.tasks.map((t) => `- [ ] ${t.task} (${t.duration})`).join("\n")}

**Resources:**
${week.resources.map((r) => `- ${r}`).join("\n")}
`
  )
  .join("\n")}

## Tips for Success
${object.tips.map((t) => `- ${t}`).join("\n")}
`;

        return {
          agentName: "planner",
          success: true,
          summary: planText,
          data: {
            topic,
            timeframe,
            weeksCount: object.weeks.length,
          },
        };
      } catch (error) {
        console.error(`[Planner] Error:`, error);
        return {
          agentName: "planner",
          success: false,
          summary: `I couldn't create a study plan for "${topic}". Please try again.`,
          data: { error: String(error) },
        };
      }
    },
  });
```

## The Analyst Agent

Analyzes content and extracts key insights:

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
- Provide clear, structured summaries`;

/**
 * Analyst Agent - Analyzes documents and extracts key insights
 *
 * Triggers: "analyze this", "summarize", "key points", "what's important"
 * Output: Returns analysis that the orchestrator will present
 */
export const createAnalystAgent = (_props: CreateAgentProps) =>
  tool({
    description:
      "Analyze content, extract key insights, and create summaries. " +
      "Use when the user wants to understand, summarize, or extract key points. " +
      "Triggers: analyze, summarize, key points, main ideas, extract insights.",
    inputSchema: z.object({
      content: z
        .string()
        .describe("The text or content to analyze"),
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
      console.log(`[Analyst] Analyzing content (${analysisType})`);

      const focusContext = focusOn
        ? `\n\nFocus particularly on: ${focusOn}`
        : "";

      const lengthGuide = {
        brief: "Keep the analysis concise, around 100-200 words.",
        moderate: "Provide a balanced analysis, around 300-500 words.",
        detailed: "Provide a comprehensive analysis, around 600-800 words.",
      };

      const analysisGuide = {
        summary: "Create a clear summary highlighting the main message.",
        "key-points": "Extract and list the most important points as bullet points.",
        "deep-analysis": "Provide thorough analysis including themes and implications.",
        "study-notes": "Create study-friendly notes with headings and key terms.",
      };

      const prompt = `Analyze the following content:

---
${content}
---

Analysis type: ${analysisType}
${analysisGuide[analysisType]}
${focusContext}

${lengthGuide[outputLength]}`;

      try {
        const { text } = await generateText({
          model: myProvider.languageModel("chat-model"),
          system: ANALYST_SYSTEM_PROMPT,
          prompt,
        });

        return {
          agentName: "analyst",
          success: true,
          summary: text,
          data: { analysisType, focusOn, outputLength },
        };
      } catch (error) {
        console.error(`[Analyst] Error:`, error);
        return {
          agentName: "analyst",
          success: false,
          summary: "I couldn't analyze the content. Please try again.",
          data: { error: String(error) },
        };
      }
    },
  });
```

**Key difference from Tutor**: The Analyst focuses on breaking down existing content, while the Tutor generates new explanations. Use Analyst for "summarize this article" and Tutor for "explain quantum physics".

## Wiring All Agents Together

### File: `app/(chat)/api/chat/route.ts`

```typescript
import { createDataStreamResponse, streamText } from "ai";
import { myProvider } from "@/lib/ai/providers";
import { systemPrompt } from "@/lib/ai/prompts";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { createTutorAgent } from "@/lib/ai/agents/tutor";
import { createQuizMasterAgent } from "@/lib/ai/agents/quiz-master";
import { createPlannerAgent } from "@/lib/ai/agents/planner";
import { createAnalystAgent } from "@/lib/ai/agents/analyst";
import { auth } from "@/app/(auth)/auth";

export async function POST(request: Request) {
  const session = await auth();
  const { messages } = await request.json();

  return createDataStreamResponse({
    execute: (dataStream) => {
      const result = streamText({
        model: myProvider.languageModel("chat-model"),
        system: systemPrompt(),
        messages,
        tools: {
          getWeather,
          tutor: createTutorAgent({ session, dataStream }),
          quizMaster: createQuizMasterAgent({ session, dataStream }),
          planner: createPlannerAgent({ session, dataStream }),
          analyst: createAnalystAgent({ session, dataStream }),
        },
        maxSteps: 5,
      });

      result.mergeIntoDataStream(dataStream);
    },
  });
}
```

## Updated System Prompt

### File: `lib/ai/prompts.ts`

```typescript
export const systemPrompt = () => `
You are Study Buddy, an AI assistant that helps users learn effectively.

## Your Specialized Agents

### tutor
Use for explanations and teaching.
- "explain [topic]"
- "teach me about [topic]"
- "how does [thing] work"

### quizMaster
Use for testing knowledge.
- "quiz me on [topic]"
- "test my knowledge"
- "practice questions"

### planner
Use for creating study plans.
- "create a study plan for [topic]"
- "learning roadmap"
- "how should I learn [topic]"

### analyst
Use for analyzing and summarizing content.
- "summarize this"
- "key points from [content]"
- "analyze this article"

## Guidelines

1. **Route appropriately**: Match user intent to the right agent
2. **Suggest next steps**: After explaining, offer a quiz. After a quiz, suggest a study plan
3. **Be encouraging**: Celebrate learning progress
4. **Stay focused**: Keep responses relevant to learning

Today's date is ${new Date().toLocaleDateString()}.
`;
```

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
| Multi-step | maxSteps allows agents to be called in sequence |

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
