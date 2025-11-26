# Chapter 0: The Starting Point

Welcome to the AI Chatbot Workshop! In this chapter, we'll explore the foundation of our application - a basic chat interface powered by Next.js and the AI SDK.

> **Branch**: `workshop/chapter-00-starting-point`
> ```bash
> git checkout workshop/chapter-00-starting-point
> ```

---

## Teaching Notes for Presenters

### React Parallels

| AI SDK Concept | React Equivalent | Key Insight |
|----------------|------------------|-------------|
| `useChat` hook | `useState` + `useEffect` | Manages message state + side effects in one hook |
| `streamText` | Server Action with streaming | Similar to `generateStaticParams` but for runtime AI |
| Message history | Component state array | Just like managing a list of items in React state |
| Data streaming | React Suspense boundaries | Progressive loading, but for tokens instead of components |

### Key Talking Points

1. **"The AI SDK is just React patterns applied to AI"**
   - `useChat` is essentially `useSWR` or `useQuery` specialized for chat
   - Streaming is like Progressive Hydration but for text generation
   - The chat API route is a standard Next.js Route Handler

2. **"Tokens, not characters"**
   - LLMs generate tokens (word pieces), not individual characters
   - This is why text appears in chunks, not letter-by-letter
   - Cost is measured in tokens (~4 chars/token for English)

3. **"Messages are immutable"**
   - Just like React state, we never mutate message arrays
   - Each message gets a unique ID (like React keys)
   - History grows by adding, never modifying

### Common Questions

- **"Why streaming?"** - UX feels faster (first token in ~200ms vs 5s for complete response)
- **"What's the system prompt?"** - Like a component's defaultProps, but for AI behavior
- **"Can I use a different AI?"** - Yes! Just change the provider in `lib/ai/providers.ts`

---

## Learning Objectives

By the end of this chapter, you'll understand:
- The basic project structure
- How the chat API route works
- How streaming responses work with the AI SDK
- The message format and data flow

## Project Structure Overview

```
ai-chatbot/
├── app/
│   ├── (auth)/           # Authentication routes
│   │   ├── auth.ts       # NextAuth configuration
│   │   ├── login/        # Login page
│   │   └── register/     # Registration page
│   └── (chat)/           # Main chat application
│       ├── api/
│       │   └── chat/     # Chat streaming endpoint
│       │       └── route.ts
│       ├── page.tsx      # Main chat page
│       └── layout.tsx    # Chat layout
├── components/           # React components
├── lib/
│   ├── ai/              # AI configuration
│   │   ├── providers.ts # Model setup
│   │   └── prompts.ts   # System prompts
│   └── db/              # Database layer
├── hooks/               # React hooks
└── docker/              # Docker configuration
```

## The Chat API Route

The heart of the application is `/app/(chat)/api/chat/route.ts`. This is where messages are sent to the AI and responses are streamed back.

### Basic Chat Flow

<details>
<summary>📄 <strong>Code: Basic Chat API Route</strong> (click to expand)</summary>

```typescript
// app/(chat)/api/chat/route.ts (simplified)
import { streamText } from "ai";
import { myProvider } from "@/lib/ai/providers";
import { systemPrompt } from "@/lib/ai/prompts";

export async function POST(request: Request) {
  const { messages } = await request.json();

  // Stream the AI response
  const result = streamText({
    model: myProvider.languageModel("chat-model"),
    system: systemPrompt(),
    messages,
  });

  return result.toDataStreamResponse();
}
```

</details>

### Key Concepts

1. **`streamText`**: The AI SDK function that sends messages to the model and streams the response token by token.
2. **`myProvider`**: Our configured AI provider (Claude Haiku via AI Gateway).
3. **`systemPrompt`**: Instructions that tell the AI how to behave.
4. **`toDataStreamResponse`**: Converts the stream into a format the frontend can consume.

## How Streaming Works

When you send a message:

```
┌─────────────────────────────────────────────────────────┐
│ 1. User types message in chat input                     │
│                           ↓                             │
│ 2. Frontend sends POST to /api/chat                     │
│                           ↓                             │
│ 3. streamText sends messages to AI model                │
│                           ↓                             │
│ 4. AI generates response token by token                 │
│                           ↓                             │
│ 5. Each token streams back to frontend                  │
│                           ↓                             │
│ 6. UI updates in real-time as tokens arrive             │
└─────────────────────────────────────────────────────────┘
```

## The Frontend Chat Hook

The frontend uses `useChat` from the AI SDK React package:

<details>
<summary>📄 <strong>Code: useChat Hook Usage</strong> (click to expand)</summary>

```typescript
// Simplified usage in a chat component
import { useChat } from "@ai-sdk/react";

export function Chat() {
  const { messages, input, handleSubmit, handleInputChange } = useChat();

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          <strong>{message.role}:</strong> {message.content}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

</details>

> 💡 **React Parallel**: `useChat` is like combining `useState` for messages, `useReducer` for state transitions, and `useSWR` for the API call - all in one hook.

The `useChat` hook handles:
- Managing message history
- Sending messages to the API
- Streaming response updates
- Input state management

## Message Format

Messages follow this structure:

```typescript
type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  // Can also contain parts for multimodal content
  parts?: MessagePart[];
};
```

## The System Prompt

The system prompt shapes the AI's personality and behavior:

<details>
<summary>📄 <strong>Code: System Prompt</strong> (click to expand)</summary>

```typescript
// lib/ai/prompts.ts
export const systemPrompt = () => `
You are a helpful AI assistant. Be concise and helpful.
Today's date is ${new Date().toLocaleDateString()}.
`;
```

</details>

> 💡 **React Parallel**: Think of the system prompt as `defaultProps` or the initial context value - it sets the baseline behavior that all messages inherit.

## Exercise: Trace a Message

1. Start the development server: `npm run dev`
2. Open the browser console (F12)
3. Send a message like "Hello!"
4. Watch the Network tab to see the streaming response
5. Notice how the text appears token by token

## What's Next

In Chapter 1, we'll add our first **tool** - giving the AI the ability to do more than just respond with text. We'll start with a simple weather tool that demonstrates how AI can call functions to retrieve information.

## Key Files to Explore

Before moving on, familiarize yourself with these files:

| File | Purpose |
|------|---------|
| `app/(chat)/api/chat/route.ts` | Main streaming endpoint |
| `lib/ai/providers.ts` | AI model configuration |
| `lib/ai/prompts.ts` | System prompts |
| `components/chat.tsx` | Chat UI component |
| `components/message.tsx` | Message rendering |

## Running the Application

```bash
# Start MongoDB
npm run docker:up

# Start the dev server
npm run dev

# Visit http://localhost:3000
```

You should see a chat interface. Send a message and watch the AI respond!
