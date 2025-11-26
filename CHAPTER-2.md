# Chapter 2: Your First Agent - The Tutor

In this chapter, we'll create our first **agent** - a specialized AI that can make its own decisions and generate rich responses. We'll build a Tutor agent that explains concepts with different teaching approaches.

> **Branch**: `workshop/chapter-02-tutor-agent`
> ```bash
> git checkout workshop/chapter-02-tutor-agent
> ```

---

## Teaching Notes for Presenters

### React Parallels

| AI SDK Concept | React Equivalent | Key Insight |
|----------------|------------------|-------------|
| Agent as tool | Higher-order component (HOC) | Wraps additional logic around a base component |
| `generateText` | Async `fetch` in useEffect | Awaits a result, doesn't stream |
| `CreateAgentProps` | React Context value | Passes session and dataStream to all agents |
| `AgentResult` | Custom hook return type | Standardized shape for all agent outputs |

### Key Talking Points

1. **"Agents are tools that think"**
   - Regular tools: fetch data, return it
   - Agents: make their own AI call, generate content
   - The orchestrator decides WHICH agent, the agent decides HOW to respond

2. **"The tool-as-agent pattern"**
   - Agents ARE tools (same interface)
   - But they have a brain (call `generateText` internally)
   - Think: React component that fetches its own data

3. **"Why not just use the main model?"**
   - Separation of concerns (each agent has focused expertise)
   - Different prompts for different tasks
   - Can use different models per agent (fast for routing, smart for generation)

### Live Demo Tips

- Ask for the same explanation with different approaches ("explain like I'm 5" vs "technical deep-dive")
- Show the console logs to trace the agent flow
- Demonstrate that the orchestrator still responds naturally after the agent

### Common Questions

- **"Can agents call other agents?"** - Not directly in this pattern, but the orchestrator can chain them
- **"Why `generateText` not `streamText`?"** - Agents return complete results; streaming happens at orchestrator level
- **"What's the session for?"** - Personalization, rate limiting, saving user progress

---

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

<details>
<summary>📄 <strong>Code: Agent Type Definitions</strong> (click to expand)</summary>

```typescript
import type { UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import type { ChatMessage } from "@/lib/types";

/**
 * Context passed to all specialized agents
 * Contains session info, data stream for real-time updates, and chat ID
 */
export type AgentContext = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  chatId: string;
};

/**
 * Standard result returned by all agents
 * Provides consistent interface for orchestrator to handle agent responses
 */
export type AgentResult = {
  agentName: string;
  success: boolean;
  summary: string;
  data?: Record<string, unknown>;
};

/**
 * Props for creating an agent tool
 * Same pattern as existing tools (createDocument, requestSuggestions)
 */
export type CreateAgentProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};
```

</details>

> 💡 **React Parallel**: `CreateAgentProps` is like a Context value - it's the same data passed to every agent, just like how React Context provides the same value to all consumers.

## Model Configuration

Before building agents, understand what `"chat-model"` means. The app uses named models configured in `lib/ai/providers.ts`:

| Model Alias | Actual Model | Purpose |
|-------------|--------------|---------|
| `chat-model` | Claude 3.5 Haiku | Main chat with tool calling |
| `chat-model-reasoning` | Claude 3.5 Haiku | Complex analysis (no tools) |
| `artifact-model` | Claude 3.5 Haiku | Content generation for artifacts |
| `title-model` | Claude 3.5 Haiku | Generating chat titles |

**Why use AI Gateway?**
- Unified API across different model providers
- Easy switching between models
- Built-in monitoring and rate limiting
- You can change these in `lib/ai/providers.ts` to use different models

```typescript
// lib/ai/providers.ts
import { gateway } from "@ai-sdk/gateway";
import { customProvider } from "ai";

export const myProvider = customProvider({
  languageModels: {
    // Multimodal model - supports images, cheap and fast
    "chat-model": gateway.languageModel("anthropic/claude-3-5-haiku-latest"),
    // Reasoning model - using Haiku (no special reasoning tags needed)
    "chat-model-reasoning": gateway.languageModel(
      "anthropic/claude-3-5-haiku-latest"
    ),
    // Simple/cheap model for titles - using Haiku for consistency
    "title-model": gateway.languageModel("anthropic/claude-3-5-haiku-latest"),
    // Simple/cheap model for artifacts - using Haiku for consistency
    "artifact-model": gateway.languageModel(
      "anthropic/claude-3-5-haiku-latest"
    ),
  },
});
```

## The Tutor Agent

The Tutor agent explains concepts with examples and analogies:

### File: `lib/ai/agents/tutor.ts`

```typescript
import { generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../providers";
import type { AgentResult, CreateAgentProps } from "./types";

const TUTOR_SYSTEM_PROMPT = `You are a patient, encouraging tutor who excels at explaining complex topics.

Your teaching approach:
- Start with what the student likely already knows
- Use relatable analogies and real-world examples
- Break complex ideas into digestible steps
- Include brief knowledge checks when appropriate
- Encourage curiosity and questions
- Adapt explanation depth based on the topic complexity

Structure your explanations with:
1. A simple overview (1-2 sentences)
2. The main explanation with examples
3. Key takeaways or summary points

Keep responses focused and educational. Avoid unnecessary fluff.`;

/**
 * Tutor Agent - Explains concepts with examples and analogies
 *
 * Triggers: "explain", "teach me", "how does X work", "what is"
 * Output: Returns explanation text that the orchestrator will present
 *
 * Note: We use generateText instead of streaming because tool results
 * are displayed in the chat UI, not the artifact panel. The orchestrator
 * (main chat model) can then present the explanation conversationally.
 */
export const createTutorAgent = (_props: CreateAgentProps) =>
  tool({
    description:
      "Explain a concept, topic, or idea in detail with examples and analogies. Use when the user asks to understand, learn about, or needs explanation of something. Triggers: explain, teach me, how does X work, what is X.",
    inputSchema: z.object({
      topic: z.string().describe("The topic or concept to explain"),
      depth: z
        .enum(["beginner", "intermediate", "advanced"])
        .default("intermediate")
        .describe("The depth of explanation needed based on user context"),
      context: z
        .string()
        .optional()
        .describe(
          "Additional context about what the user already knows or specific aspects to focus on"
        ),
    }),
    execute: async ({ topic, depth, context }): Promise<AgentResult> => {
      const prompt = `Explain "${topic}" at a ${depth} level.${
        context ? `\n\nAdditional context: ${context}` : ""
      }`;

      const { text } = await generateText({
        model: myProvider.languageModel("chat-model"),
        system: TUTOR_SYSTEM_PROMPT,
        prompt,
      });

      return {
        agentName: "tutor",
        success: true,
        summary: text,
        data: { topic, depth, contentLength: text.length },
      };
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
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { auth } from "@/app/(auth)/auth";
import { createTutorAgent } from "@/lib/ai/agents";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { getWeather } from "@/lib/ai/tools/get-weather";

export async function POST(request: Request) {
  // ... authentication and request parsing

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
            : ["getWeather", "tutor"],
        experimental_transform: smoothStream({ chunking: "word" }),
        tools: {
          getWeather,
          // Add the tutor agent as a tool!
          tutor: createTutorAgent({ session, dataStream }),
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

Note: Agents are imported from the barrel export `@/lib/ai/agents`, not individual files.

## Updating the System Prompt

The system prompt helps the orchestrator know when to use each agent. The full prompt is built from multiple parts:

### File: `lib/ai/prompts.ts`

```typescript
export const regularPrompt =
  "You are a friendly study buddy assistant! Keep your responses concise and helpful.";

export const agentRoutingPrompt = `
You are a Study Buddy with specialized agents available as tools. Choose the right agent based on what the user needs:

**tutor** - Explain concepts with examples and analogies
Use for: "explain", "teach me", "how does X work", "what is X", understanding concepts

IMPORTANT ROUTING RULES:
1. Match user intent to the most appropriate agent
2. If the request doesn't clearly match an agent, respond conversationally
3. After using an agent, suggest related follow-ups (e.g., after explaining, offer to quiz)
`;

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
| `app/(chat)/api/chat/route.ts` | Added tutor agent to tools, added to experimental_activeTools |
| `lib/ai/prompts.ts` | Added tutor tool documentation |
