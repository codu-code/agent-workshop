# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a workshop project for learning to build production-ready AI chatbots with Next.js 16 and the AI SDK. Part of the GitNation React Summit US workshop series. It features real-time streaming, document artifacts (text, code, spreadsheets), version control, and multimodal capabilities.

**Tech Stack:**
- Next.js 16 (App Router, PPR enabled)
- AI SDK with multiple providers via AI Gateway (Anthropic Claude, OpenAI)
- MongoDB (native driver)
- NextAuth.js v5 (beta)
- Biome for linting/formatting (via Ultracite)
- npm package manager

## Development Commands

```bash
# Install dependencies
npm install

# Database operations (Docker)
npm run docker:up           # Start MongoDB and other services
npm run docker:down         # Stop all services
npm run docker:logs         # View service logs

# Development
npm run dev                 # Start dev server with Turbo mode

# Linting and formatting (Biome via Ultracite)
npm run lint                # Check for issues (npx ultracite@latest check)
npm run format              # Auto-fix issues (npx ultracite@latest fix)

# Production
npm run build               # Build for production
npm run start               # Start production server
```

## Architecture Overview

### Route Structure

The app uses Next.js App Router with route groups:

- `app/(chat)/` - Main chat interface and APIs
  - `/` - Chat page (streaming, artifacts, multimodal input)
  - `/chat/[id]` - Individual chat sessions
  - `/api/chat` - Main streaming endpoint
  - `/api/document`, `/api/vote`, `/api/history`, `/api/suggestions`, `/api/files/upload`

- `app/(auth)/` - Authentication routes
  - `/login`, `/register` - Auth pages
  - `/api/auth/[...nextauth]` - NextAuth handlers
  - `/api/auth/guest` - Guest user creation

### AI Integration Flow

**Request Path:** User message → `/api/chat` → `createUIMessageStream` → `streamText` → AI Gateway → AI models

**Key Files:**
- `lib/ai/providers.ts` - Model configuration and AI Gateway setup
- `lib/ai/models.ts` - Model definitions for UI selectors
- `lib/ai/prompts.ts` - System prompts for different contexts
- `lib/ai/entitlements.ts` - Rate limits (guest: 20/day, regular: 100/day)
- `app/(chat)/api/chat/route.ts` - Main streaming handler

**AI Models:**
- `chat-model`: Claude 3.5 Haiku (multimodal, with tool calling)
- `chat-model-reasoning`: Claude 3.5 Haiku (optimized for complex analysis)
- `title-model`: GPT-4o Mini (generates chat titles)
- `artifact-model`: GPT-4o Mini (generates artifact content)

**Tools Available (non-reasoning models):**
- `getWeather` - Example weather data tool
- `createDocument` - Creates artifacts (text/code/sheets)
- `updateDocument` - Updates existing artifacts
- `requestSuggestions` - Suggests improvements to documents

### Artifacts System

Artifacts are interactive documents that appear alongside chat (text documents, Python code with execution, spreadsheets, images).

**Architecture:**
1. **Server handlers** (`artifacts/*/server.ts`) - Generate content with AI
2. **Client definitions** (`artifacts/*/client.tsx`) - Define UI and interactions
3. **Coordination** (`lib/artifacts/server.ts`) - Orchestrates creation/updates

**Data Flow:**
1. AI calls `createDocument` tool with title + kind
2. Server handler streams content generation from `artifact-model`
3. Each delta written to data stream as `data-{kind}Delta`
4. `DataStreamHandler` processes deltas, updates `useArtifact` state
5. On completion, document saved to DB with full content
6. `data-finish` signal sets artifact status to "idle"

**Code Artifacts Special Features:**
- Pyodide (Python in browser) loaded in `app/(chat)/layout.tsx`
- Executes Python code with matplotlib support
- Captures stdout and renders base64 images
- Monaco-style editor with syntax highlighting

**Key Files:**
- `components/artifact.tsx` - Main artifact modal UI
- `components/data-stream-handler.tsx` - Processes streaming data parts
- `components/create-artifact.ts` - Artifact class definition pattern
- `hooks/use-artifact.ts` - Global artifact state (SWR-based)

### Study Buddy Multi-Agent System

The chatbot uses a **tool-as-agent** pattern where specialized agents are implemented as AI SDK tools. The main chat model (orchestrator) routes to agents based on user intent.

**Architecture:**
```
User Message
     ↓
[Orchestrator: Claude Haiku]
     ↓
Tool selection based on intent
     ↓
+--------+--------+--------+--------+
↓        ↓        ↓        ↓        ↓
tutor   quiz    planner  analyst  general
agent   master   agent   agent    chat
```

**Agents (`lib/ai/agents/`):**

| Agent | Tool Name | Triggers | Output |
|-------|-----------|----------|--------|
| Tutor | `tutor` | "explain", "teach me", "how does X work" | Streamed text explanation |
| Quiz Master | `quizMaster` | "quiz me", "test my knowledge", "flashcards" | `flashcard` artifact |
| Planner | `planner` | "study plan", "learning roadmap", "schedule" | `study-plan` artifact |
| Analyst | `analyst` | "summarize", "analyze", "key points" | Text analysis/summary |

**Agent Pattern:**
```typescript
// lib/ai/agents/tutor.ts
export const createTutorAgent = ({ session, dataStream }) =>
  tool({
    description: "Explain concepts with examples and analogies",
    inputSchema: z.object({
      topic: z.string(),
      approach: z.enum(["eli5", "technical", "analogy"]),
    }),
    execute: async ({ topic, approach }): Promise<AgentResult> => {
      // Agent can use generateText for text responses
      // Or generateObject + dataStream for artifacts
      const { text } = await generateText({ ... });
      return { agentName: "tutor", success: true, summary: text };
    },
  });
```

**Custom Artifact Types:**

| Kind | Server Handler | Client Component | Data Stream Type |
|------|----------------|------------------|------------------|
| `flashcard` | `lib/ai/agents/quiz-master.ts` | `artifacts/flashcard/client.tsx` | `data-flashcardDelta` |
| `study-plan` | `lib/ai/agents/planner.ts` | `artifacts/study-plan/client.tsx` | `data-studyPlanDelta` |

**Flashcard Schema:**
```typescript
{
  topic: string,
  questions: [{
    question: string,
    options: string[4],
    correctAnswer: number, // 0-3
    explanation: string
  }]
}
```

**Study Plan Schema:**
```typescript
{
  topic: string,
  duration: string,
  overview: string,
  weeks: [{
    week: number,
    title: string,
    goals: string[],
    tasks: [{ task: string, duration: string, completed: boolean }],
    resources: string[]
  }],
  tips: string[]
}
```

### Database Schema

**Key Collections (lib/db/types.ts):**
- `users` - User accounts (regular and guest)
- `chats` - Chat sessions with metadata
- `messages` - Message history with parts and attachments
- `documents` - Artifacts with versioning (same id, different createdAt)
- `suggestions` - Document improvement suggestions
- `votes` - Message upvotes/downvotes
- `streams` - Stream IDs for resumable streams (MongoDB-based)

**All queries centralized in `lib/db/queries.ts`**
**Connection helper in `lib/db/mongodb.ts`**

### Authentication

**NextAuth.js v5 Configuration (app/(auth)/auth.ts):**
- Credentials provider for email/password
- Separate guest provider (creates `guest-{timestamp}@email`)
- JWT extended with user `id` and `type` fields
- Session includes user `id` and `type`

**Middleware (middleware.ts):**
- Protects all routes except static assets and auth endpoints
- Redirects unauthenticated → guest creation
- Redirects authenticated non-guests away from login/register
- Guest detection: `/^guest-\d+$/` pattern

### Message Parts Architecture

Messages use AI SDK's parts system (not just strings):
- Part types: `text`, `tool-call`, `tool-result`, `image`, `file`
- Enables multimodal conversations
- Clean message history (transient artifact data not persisted)

### Data Stream Pattern

**Custom data types** flow through AI streams:
- Content: `data-textDelta`, `data-codeDelta`, `data-sheetDelta`, `data-flashcardDelta`, `data-studyPlanDelta`
- Metadata: `data-id`, `data-title`, `data-kind`
- Control: `data-clear`, `data-finish`
- Analytics: `data-usage` (TokenLens-enriched with costs)

**Processing:** `useDataStream` → `DataStreamHandler` → artifact-specific handlers → `useArtifact`

## Code Conventions

### Import Patterns
- Use `"server-only"` import in server files to prevent client bundling
- Use `import type` for TypeScript types
- Use `export type` for type exports
- Prefer named exports over default exports

### State Management
- SWR for data fetching AND global state (see `useArtifact`)
- Optimistic updates with local state + SWR revalidation
- Server actions for simple mutations, API routes for streaming

### Error Handling
- Use `ChatSDKError` class for structured errors
- Error codes: `${ErrorType}:${Surface}`
- Surface controls visibility (response vs. log only)
- Always provide user-friendly messages

### Testing
- Manual testing with guest accounts
- Use Mongo Express (http://localhost:8082) to inspect database

### TypeScript
- Strict mode enabled
- Zod for runtime validation
- Custom types in `lib/types.ts`
- MongoDB TypeScript types in `lib/db/types.ts` for type-safe DB access

### Styling
- Tailwind CSS v4 (postcss-based)
- shadcn/ui components (Radix UI primitives)
- Geist fonts (loaded in root layout)
- Dark mode via next-themes
- Framer Motion for animations

## Environment Variables

Required environment variables (see `.env.example`):

```bash
AUTH_SECRET=****                    # Generate with: openssl rand -base64 32
AI_GATEWAY_API_KEY=****            # Only required for non-Vercel deployments
BLOB_READ_WRITE_TOKEN=****         # Vercel Blob for file storage
MONGODB_URI=****                    # MongoDB connection string
MONGODB_DB=gitnation                # MongoDB database name
```

## Important Patterns

### Document Versioning
- Each save creates new row with same `id` but new `createdAt`
- Queries order by `createdAt DESC` for latest version
- UI can navigate through versions with diff mode
- Auto-save debounced (2 seconds) for user edits

### Rate Limiting
- Checked in `/api/chat` before streaming
- Based on message count from DB + user type
- Returns `ChatSDKError` with code `ENTITLEMENT_ERROR:RESPONSE` if exceeded

### Telemetry
- TokenLens integration for cost calculations
- OpenTelemetry enabled in production
- Usage data persisted to `Chat.lastContext`

### Resumable Streams
- Enabled with MongoDB-based storage
- Stream IDs tracked in `streams` collection
- `useAutoResume` hook for recovery
- No Redis dependency required

## Biome/Ultracite Rules

This project uses Ultracite (Biome-based) for linting and formatting. Key rules enforced:

**React/Next.js:**
- No `<img>` tags (use Next.js `<Image>`)
- No `<head>` elements (use `<Metadata>`)
- Hook dependencies must be correct
- No array index in keys
- Fragment shorthand `<>` preferred

**TypeScript:**
- No `any` type
- No enums (use `as const` objects)
- No non-null assertions (`!`)
- Use `import type` for types
- Use `export type` for type exports

**Accessibility:**
- Always include `type` on buttons
- Label elements need text content
- Accompany `onClick` with keyboard handlers
- Valid ARIA roles and properties
- Alt text required for images

**Code Quality:**
- Use `for...of` instead of `Array.forEach`
- Use arrow functions over function expressions
- Use optional chaining over chained logical expressions
- Use template literals over string concatenation
- Avoid unnecessary boolean casts

Run `npm run lint` before committing. Most issues auto-fixed with `npm run format`.

## Development Workflow

1. **Database changes:**
   - Update TypeScript types in `lib/db/types.ts`
   - Add/modify queries in `lib/db/queries.ts`
   - Optionally update schema validation in `docker/mongodb/init-mongo.js`
   - Restart MongoDB container if init script changed: `npm run docker:down && npm run docker:up`

2. **Adding new artifacts:**
   - Create `artifacts/{kind}/server.ts` with handler
   - Create `artifacts/{kind}/client.tsx` with Artifact definition
   - Register in `lib/artifacts/server.ts` and `components/create-artifact.ts`
   - Update tool prompts in `lib/ai/prompts.ts`

3. **Adding new AI tools:**
   - Define tool in `/api/chat` handler
   - Add to tools array conditionally (avoid for reasoning models)
   - Update system prompt to describe when to use tool
   - Handle results in message rendering

4. **Testing changes:**
   - Ensure MongoDB is running: `npm run docker:up`
   - Run `npm run lint` to check for issues
   - Test manually with guest account
   - Use Mongo Express (http://localhost:8082) to inspect database
