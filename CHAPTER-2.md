# Chapter 2: Your First Agent - The Tutor

In this chapter, we'll create our first **agent** - a specialized AI that can make its own decisions and generate rich responses. We'll build a Tutor agent that explains concepts with different teaching approaches.

## Learning Objectives

By the end of this chapter, you'll understand:
- The difference between tools and agents
- The "tool-as-agent" pattern
- How agents can make their own AI calls
- How to return structured agent results

## Tools vs Agents

| Feature | Tool | Agent |
|---------|------|-------|
| Purpose | Fetch/compute data | Generate intelligent responses |
| AI calls | None (just function) | Can call AI models |
| Complexity | Simple input → output | Can reason and decide |
| Example | Get weather data | Explain quantum physics |

**Key insight**: Agents are tools that contain their own AI logic. The orchestrator (main chat model) decides which agent to call, but the agent decides HOW to respond.

## The Tool-as-Agent Pattern

```
┌─────────────────────────────────────────────────────────┐
│                    Orchestrator                          │
│              (Main Chat Model - Haiku)                   │
│                         │                                │
│    "Explain photosynthesis"                              │
│                         ↓                                │
│    Decides: "Use the tutor tool"                         │
│                         │                                │
├─────────────────────────┼───────────────────────────────┤
│                         ↓                                │
│                  ┌─────────────┐                         │
│                  │ Tutor Agent │                         │
│                  │  (Tool)     │                         │
│                  │             │                         │
│                  │ Makes own   │                         │
│                  │ AI call to  │                         │
│                  │ generate    │                         │
│                  │ explanation │                         │
│                  └─────────────┘                         │
└─────────────────────────────────────────────────────────┘
```

## Agent Types and Results

First, let's define the structure for our agents:

### File: `lib/ai/agents/types.ts`

```typescript
import type { Session } from "next-auth";
import type { DataStreamWriter } from "ai";

// Props passed to every agent creator
export type CreateAgentProps = {
  session: Session | null;
  dataStream: DataStreamWriter;
};

// Result returned by every agent
export type AgentResult = {
  agentName: string;
  success: boolean;
  summary: string;
  data?: Record<string, unknown>;
};
```

## Model Configuration

Before building agents, understand what `"chat-model"` means. The app uses named models configured in `lib/ai/providers.ts`:

| Model Alias | Actual Model | Purpose |
|-------------|--------------|---------|
| `chat-model` | Claude 3.5 Haiku | Main chat with tool calling |
| `chat-model-reasoning` | Claude 3.5 Haiku | Complex analysis (no tools) |
| `artifact-model` | GPT-4o Mini | Content generation for artifacts |
| `title-model` | GPT-4o Mini | Generating chat titles |

**Why different models?**
- **Claude Haiku** is fast and great for tool calling (routing to agents)
- **GPT-4o Mini** is cost-effective for content generation
- You can change these in `lib/ai/providers.ts` to use different models

```typescript
// lib/ai/providers.ts (simplified)
export const myProvider = customProvider({
  languageModels: {
    "chat-model": anthropic("claude-3-5-haiku-20241022"),
    "artifact-model": openai("gpt-4o-mini"),
    // Add your own model aliases here
  },
});
```

## The Tutor Agent

The Tutor agent explains concepts using different teaching approaches:

### File: `lib/ai/agents/tutor.ts`

```typescript
import { generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../providers";
import type { AgentResult, CreateAgentProps } from "./types";

/**
 * Tutor Agent - Explains concepts with different teaching approaches
 *
 * Triggers: "explain", "teach me", "how does X work", "what is"
 * Output: Detailed text explanation streamed to chat
 */
export const createTutorAgent = ({ session, dataStream }: CreateAgentProps) =>
  tool({
    description:
      "Explain a concept or topic in depth. Use when the user wants to learn or understand something. " +
      "Triggers: explain, teach me, how does X work, what is, help me understand.",
    inputSchema: z.object({
      topic: z.string().describe("The topic or concept to explain"),
      approach: z
        .enum(["eli5", "technical", "analogy", "step-by-step"])
        .default("step-by-step")
        .describe(
          "Teaching approach: eli5 (simple), technical (detailed), analogy (comparisons), step-by-step"
        ),
      priorKnowledge: z
        .string()
        .optional()
        .describe("What the user already knows about the topic"),
    }),
    execute: async ({
      topic,
      approach,
      priorKnowledge,
    }): Promise<AgentResult> => {
      console.log(`[Tutor] Explaining "${topic}" using ${approach} approach`);

      const approachInstructions = {
        eli5: "Explain like I'm 5 years old. Use simple words, fun comparisons, and relatable examples.",
        technical:
          "Give a thorough technical explanation with precise terminology, underlying mechanisms, and edge cases.",
        analogy:
          "Explain primarily through analogies and metaphors that connect to everyday experiences.",
        "step-by-step":
          "Break down the concept into clear, numbered steps. Start from basics and build up.",
      };

      const prompt = `You are an expert tutor. Explain the following topic:

**Topic**: ${topic}

**Teaching Approach**: ${approachInstructions[approach]}

${priorKnowledge ? `**User's Prior Knowledge**: ${priorKnowledge}` : ""}

Provide a clear, engaging explanation. Use examples where helpful.
Format with markdown for readability.`;

      try {
        const { text } = await generateText({
          model: myProvider.languageModel("chat-model"),
          prompt,
        });

        console.log(`[Tutor] Generated explanation (${text.length} chars)`);

        return {
          agentName: "tutor",
          success: true,
          summary: text,
          data: {
            topic,
            approach,
            characterCount: text.length,
          },
        };
      } catch (error) {
        console.error(`[Tutor] Error:`, error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        return {
          agentName: "tutor",
          success: false,
          summary: `I had trouble explaining "${topic}". Please try again.`,
          data: { error: errorMessage },
        };
      }
    },
  });
```

## Using the Session Context

Notice that agents receive a `session` prop. This contains the authenticated user's information:

```typescript
export const createTutorAgent = ({ session, dataStream }: CreateAgentProps) =>
  tool({
    // ...
    execute: async ({ topic, approach }): Promise<AgentResult> => {
      // Access user info for personalization
      const userId = session?.user?.id;
      const userType = session?.user?.type; // 'guest' or 'regular'

      // Example: Track user's learning history
      if (userId) {
        console.log(`[Tutor] User ${userId} is learning about ${topic}`);
        // Could save to database for personalized recommendations
      }

      // Example: Adjust response for guest users
      if (userType === 'guest') {
        // Shorter response for guests, prompt to sign up
      }

      // ... rest of implementation
    },
  });
```

**Common session use cases:**
- Saving user-specific data (quiz scores, progress)
- Personalizing responses based on past interactions
- Limiting features for guest users
- Tracking usage for rate limiting

## Wiring the Agent into the Chat Route

### File: `app/(chat)/api/chat/route.ts`

```typescript
import { createDataStreamResponse, streamText } from "ai";
import { myProvider } from "@/lib/ai/providers";
import { systemPrompt } from "@/lib/ai/prompts";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { createTutorAgent } from "@/lib/ai/agents/tutor";
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
          // Add the tutor agent as a tool!
          tutor: createTutorAgent({ session, dataStream }),
        },
        maxSteps: 5,
      });

      result.mergeIntoDataStream(dataStream);
    },
  });
}
```

## Updating the System Prompt

Help the orchestrator know when to use the tutor:

### File: `lib/ai/prompts.ts`

```typescript
export const systemPrompt = () => `
You are a helpful AI assistant with specialized capabilities.

## Available Tools

### tutor
Use this when users want to learn or understand something.
- "explain [topic]"
- "teach me about [topic]"
- "how does [thing] work"
- "what is [concept]"

Choose the appropriate teaching approach based on context:
- eli5: For beginners or when simplicity is requested
- technical: For advanced users or detailed explanations
- analogy: When user seems confused or wants relatable examples
- step-by-step: Default, good for most explanations

### getWeather
Use for weather queries.

Today's date is ${new Date().toLocaleDateString()}.
`;
```

## How the Agent Response Flows

```
User: "Explain how batteries work"
          ↓
Orchestrator: "I'll use the tutor tool"
          ↓
Tool Call: tutor({ topic: "how batteries work", approach: "step-by-step" })
          ↓
Tutor Agent:
  1. Builds prompt with teaching instructions
  2. Calls generateText to create explanation
  3. Returns AgentResult with the text
          ↓
Orchestrator receives result
          ↓
User sees the explanation in chat
```

## Rendering Agent Results

Agent results come back as tool results. The `summary` field contains the main response:

```typescript
// In message rendering
{message.parts?.map((part, index) => {
  if (part.type === "tool-result") {
    const result = part.result as AgentResult;
    if (result.agentName === "tutor") {
      return (
        <div key={index} className="prose dark:prose-invert">
          <ReactMarkdown>{result.summary}</ReactMarkdown>
        </div>
      );
    }
  }
  // ... handle other parts
})}
```

## Try It Out: Tutor Agent

Now test your tutor agent! Click the **"Explain how neural networks learn"** button in the chat, or try these prompts:

### Basic Explanations
```
Explain how neural networks learn
Teach me about closures in JavaScript
How does the event loop work in Node.js?
What is recursion? Give me a simple analogy
```

### Different Teaching Approaches
```
Explain React hooks like I'm 5 years old
Give me a technical deep-dive on how databases index data
Explain machine learning using cooking analogies
Teach me about APIs step by step
```

### Topic Variations
```
Explain the difference between SQL and NoSQL databases
How does Git branching work?
What is the virtual DOM and why does React use it?
Teach me about REST vs GraphQL
```

**What to observe:**
- The AI routes to the tutor agent for learning/explanation requests
- Different approaches (eli5, technical, analogy, step-by-step) produce different styles
- The explanation is well-formatted with markdown
- The agent returns a structured `AgentResult` with metadata

**Compare with Chapter 1:**
Notice the difference between the **weather tool** (fetches data, returns facts) and the **tutor agent** (makes its own AI call, generates content). This is the key distinction between tools and agents!

---

## Exercise: Customize the Tutor

1. Add a new teaching approach like "quiz" that explains, then asks questions
2. Add a `depth` parameter (shallow, medium, deep)
3. Try the tutor with different topics and approaches

## Key Concepts Recap

| Concept | Description |
|---------|-------------|
| Tool-as-Agent | Agent implemented as an AI SDK tool |
| CreateAgentProps | Session and dataStream passed to agents |
| AgentResult | Standard return format with agentName, success, summary |
| generateText | AI SDK function for non-streaming text generation |
| Orchestrator | The main model that routes to agents |

## What's Next

In Chapter 3, we'll add more agents (Quiz Master and Planner) and see how multiple agents work together to create a complete Study Buddy experience.

## Files Changed in This Chapter

| File | Changes |
|------|---------|
| `lib/ai/agents/types.ts` | New - agent type definitions |
| `lib/ai/agents/tutor.ts` | New - tutor agent implementation |
| `app/(chat)/api/chat/route.ts` | Added tutor agent, switched to createDataStreamResponse |
| `lib/ai/prompts.ts` | Added tutor tool documentation |
