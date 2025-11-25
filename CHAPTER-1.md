# Chapter 1: Adding Your First Tool

In this chapter, we'll give the AI the ability to **do things** beyond just responding with text. We'll add a weather tool that demonstrates how AI can call functions to retrieve real-time information.

## Learning Objectives

By the end of this chapter, you'll understand:
- What AI tools are and why they're powerful
- The anatomy of a tool (description, schema, execute)
- How the AI decides when to use tools
- How to render tool results in the UI

## What Are AI Tools?

Tools allow the AI to:
- Fetch real-time data (weather, stock prices, etc.)
- Perform calculations
- Interact with external APIs
- Execute code
- Create documents

When you ask "What's the weather in London?", instead of guessing, the AI can **call a tool** to get the actual weather data.

## Anatomy of a Tool

Every tool has three parts:

```typescript
import { tool } from "ai";
import { z } from "zod";

const myTool = tool({
  // 1. Description - tells the AI when to use this tool
  description: "Get current weather for a location",

  // 2. Input Schema - what inputs the tool accepts (Zod schema)
  inputSchema: z.object({
    location: z.string().describe("City name"),
  }),

  // 3. Execute - the function that runs when called
  execute: async ({ location }) => {
    // Fetch weather data...
    return { temperature: 72, conditions: "sunny" };
  },
});
```

## The Weather Tool

Here's the complete weather tool implementation:

### File: `lib/ai/tools/get-weather.ts`

```typescript
import { tool } from "ai";
import { z } from "zod";

export const getWeather = tool({
  description:
    "Get the current weather at a location. Use this when users ask about weather.",
  inputSchema: z.object({
    latitude: z.number().describe("Latitude coordinate"),
    longitude: z.number().describe("Longitude coordinate"),
  }),
  execute: async ({ latitude, longitude }) => {
    // In production, you'd call a real weather API
    // For demo, we return mock data based on coordinates
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`
    );

    const data = await response.json();

    return {
      temperature: data.current.temperature_2m,
      unit: data.current_units.temperature_2m,
    };
  },
});
```

## Wiring Tools into the Chat Route

Add the tool to your chat route:

### File: `app/(chat)/api/chat/route.ts`

```typescript
import { streamText } from "ai";
import { myProvider } from "@/lib/ai/providers";
import { systemPrompt } from "@/lib/ai/prompts";
import { getWeather } from "@/lib/ai/tools/get-weather";

export async function POST(request: Request) {
  const { messages } = await request.json();

  const result = streamText({
    model: myProvider.languageModel("chat-model"),
    system: systemPrompt(),
    messages,
    // Add tools here!
    tools: {
      getWeather,
    },
    // Let the AI call multiple tools if needed
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
```

## How Tool Calling Works

```
┌─────────────────────────────────────────────────────────┐
│ User: "What's the weather in Paris?"                    │
│                           ↓                             │
│ AI thinks: "I should use the getWeather tool"           │
│                           ↓                             │
│ AI generates tool call:                                 │
│   { name: "getWeather", args: { lat: 48.8, lon: 2.3 }}  │
│                           ↓                             │
│ Tool executes and returns: { temperature: 18, unit: "°C"}│
│                           ↓                             │
│ AI receives result and generates response:              │
│   "The current temperature in Paris is 18°C"            │
└─────────────────────────────────────────────────────────┘
```

## Rendering Tool Results

Tool calls and results appear as special message parts. Here's how to render them:

### File: `components/weather.tsx`

```typescript
"use client";

type WeatherProps = {
  temperature: number;
  unit: string;
};

export function Weather({ temperature, unit }: WeatherProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border p-4">
      <span className="text-2xl">🌡️</span>
      <div>
        <p className="font-semibold">Current Temperature</p>
        <p className="text-3xl">
          {temperature}
          {unit}
        </p>
      </div>
    </div>
  );
}
```

### Handling Tool Results in Messages

```typescript
// In your message rendering component
{message.parts?.map((part, index) => {
  if (part.type === "tool-result" && part.toolName === "getWeather") {
    return <Weather key={index} {...part.result} />;
  }
  // ... handle other part types
})}
```

## Updating the System Prompt

Help the AI know when to use tools:

```typescript
// lib/ai/prompts.ts
export const systemPrompt = () => `
You are a helpful AI assistant.

## Tools Available
- **getWeather**: Use this when users ask about weather conditions.
  Ask for a city name if not provided.

Today's date is ${new Date().toLocaleDateString()}.
`;
```

## Try It Out: Weather Tool

Now that you've wired up the weather tool, test it with these prompts. Click the **"What is the weather in San Francisco?"** button in the chat, or try these variations:

### Basic Weather Queries
```
What is the weather in San Francisco?
What's the weather like in Tokyo right now?
Is it cold in London today?
```

### Follow-up Queries
```
What about New York?
Compare the weather in Paris and Berlin
Should I bring an umbrella to Seattle?
```

**What to observe:**
- The AI recognizes weather-related queries and calls the `getWeather` tool
- Tool calls appear in the message stream before the final response
- The weather data is formatted nicely in the chat UI
- The AI can handle follow-up location questions

**Troubleshooting:**
- If you see "I don't have access to real-time weather", check that the tool is properly added to the `tools` object in your chat route
- If coordinates seem wrong, the AI is inferring lat/long from city names - this is expected behavior

---

## Exercise: Add a Calculator Tool

Create a simple calculator tool:

1. Create `lib/ai/tools/calculator.ts`:

```typescript
import { tool } from "ai";
import { z } from "zod";

export const calculate = tool({
  description: "Perform mathematical calculations",
  inputSchema: z.object({
    expression: z.string().describe("Math expression like '2 + 2' or '10 * 5'"),
  }),
  execute: async ({ expression }) => {
    // Simple eval for demo (use a proper math library in production!)
    const result = eval(expression);
    return { expression, result };
  },
});
```

2. Add it to the chat route alongside `getWeather`
3. Test it: "What's 15 * 7?"

## Key Concepts Recap

| Concept | Description |
|---------|-------------|
| `description` | Tells AI when to use the tool |
| `inputSchema` | Zod schema defining expected inputs |
| `execute` | Async function that runs when called |
| `maxSteps` | How many tool calls allowed per request |
| Tool Result | The data returned from execute |

## What's Next

In Chapter 2, we'll take tools further by creating our first **Agent**. Instead of just fetching data, agents can make their own AI calls - think of them as specialized assistants with their own personality and capabilities.

## Files Changed in This Chapter

| File | Changes |
|------|---------|
| `lib/ai/tools/get-weather.ts` | New file - weather tool |
| `app/(chat)/api/chat/route.ts` | Added tools to streamText |
| `lib/ai/prompts.ts` | Updated with tool documentation |
| `components/weather.tsx` | New file - weather UI |
