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

Here's the complete weather tool implementation with city name geocoding:

### File: `lib/ai/tools/get-weather.ts`

```typescript
import { tool } from "ai";
import { z } from "zod";

// Helper function to convert city names to coordinates
async function geocodeCity(
  city: string
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return null;
    }

    const result = data.results[0];
    return {
      latitude: result.latitude,
      longitude: result.longitude,
    };
  } catch {
    return null;
  }
}

export const getWeather = tool({
  description:
    "Get the current weather at a location. You can provide either coordinates or a city name.",
  inputSchema: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    city: z
      .string()
      .describe("City name (e.g., 'San Francisco', 'New York', 'London')")
      .optional(),
  }),
  execute: async (input) => {
    let latitude: number;
    let longitude: number;

    // If city name provided, geocode it to coordinates
    if (input.city) {
      const coords = await geocodeCity(input.city);
      if (!coords) {
        return {
          error: `Could not find coordinates for "${input.city}". Please check the city name.`,
        };
      }
      latitude = coords.latitude;
      longitude = coords.longitude;
    } else if (input.latitude !== undefined && input.longitude !== undefined) {
      latitude = input.latitude;
      longitude = input.longitude;
    } else {
      return {
        error:
          "Please provide either a city name or both latitude and longitude coordinates.",
      };
    }

    // Fetch weather data from Open-Meteo API
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`
    );

    const weatherData = await response.json();

    // Include city name in response if provided
    if ("city" in input) {
      weatherData.cityName = input.city;
    }

    return weatherData;
  },
});
```

### Key Features

1. **Geocoding**: The `geocodeCity` helper converts city names to coordinates using the free Open-Meteo Geocoding API
2. **Flexible Input**: Accepts either a city name OR latitude/longitude coordinates
3. **Error Handling**: Returns helpful error messages if geocoding fails
4. **Real Data**: Uses the Open-Meteo Weather API for actual weather data

## Wiring Tools into the Chat Route

Add the tool to your chat route. The route already has streaming set up - you just need to add the tool:

### File: `app/(chat)/api/chat/route.ts`

```typescript
// Add this import at the top
import { getWeather } from "@/lib/ai/tools/get-weather";

// Inside the POST handler, the streamText call should include:
const result = streamText({
  model: myProvider.languageModel(selectedChatModel),
  system: systemPrompt({ selectedChatModel, requestHints }),
  messages: convertToModelMessages(uiMessages),
  // Stop after 5 tool call steps
  stopWhen: stepCountIs(5),
  // Disable tools for reasoning models
  experimental_activeTools:
    selectedChatModel === "chat-model-reasoning" ? [] : ["getWeather"],
  experimental_transform: smoothStream({ chunking: "word" }),
  // Add tools here!
  tools: {
    getWeather,
  },
});
```

The full route handler uses `createUIMessageStream` with `JsonToSseTransformStream` for streaming - the key thing is adding `getWeather` to the `tools` object and `"getWeather"` to `experimental_activeTools`.

### Key Configuration

- **`stopWhen: stepCountIs(5)`**: Limits tool call chains to 5 steps
- **`experimental_activeTools`**: Conditionally enables/disables tools (disabled for reasoning model)
- **`tools`**: Object containing all available tools
- **`requestHints`**: Contains user's location (useful for "What's the weather?" without a city)

## How Tool Calling Works

```
┌─────────────────────────────────────────────────────────┐
│ User: "What's the weather in Paris?"                    │
│                           ↓                             │
│ AI thinks: "I should use the getWeather tool"           │
│                           ↓                             │
│ AI generates tool call:                                 │
│   { name: "getWeather", args: { city: "Paris" }}        │
│                           ↓                             │
│ Tool executes:                                          │
│   1. geocodeCity("Paris") → { lat: 48.8, lon: 2.3 }     │
│   2. fetch weather data from Open-Meteo API             │
│   3. returns: { temperature: 18, cityName: "Paris" }    │
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
  current: {
    temperature_2m: number;
  };
  current_units: {
    temperature_2m: string;
  };
  cityName?: string;
};

export function Weather({ current, current_units, cityName }: WeatherProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border p-4">
      <span className="text-2xl">🌡️</span>
      <div>
        <p className="font-semibold">
          {cityName ? `Weather in ${cityName}` : "Current Weather"}
        </p>
        <p className="text-3xl">
          {current.temperature_2m}
          {current_units.temperature_2m}
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

## Updating the System Prompt (Optional)

The AI will use tools based on their `description` field, so you don't *need* to update the system prompt. However, you can optionally add tool documentation to help the AI understand when to use tools.

The system prompt is built from multiple parts. The simplest way to add tool info is to update the `regularPrompt` constant:

```typescript
// lib/ai/prompts.ts

// Update this constant to include tool documentation
export const regularPrompt = `You are a friendly study buddy assistant! Keep your responses concise and helpful.

## Tools Available
- **getWeather**: Use this when users ask about weather conditions.
  You can provide a city name like "Paris" or "Tokyo".
`;

// The systemPrompt function combines regularPrompt with location hints
// No need to change this function - it already works!
export const systemPrompt = ({
  selectedChatModel,
  requestHints,
}: {
  selectedChatModel: string;
  requestHints: RequestHints;
}) => {
  const requestPrompt = getRequestPromptFromHints(requestHints);
  return `${regularPrompt}\n\n${requestPrompt}`;
};
```

**Note**: The `requestHints` add the user's location context (city, country, lat/lon), which is useful for the weather tool - the AI can use the user's location as a default if they just say "What's the weather?"

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
- If the city isn't found, try using a more common spelling or a larger nearby city
- Check the browser console for any API errors

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
