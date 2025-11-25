# Agents Workshop

> **GitNation React Summit US Workshop**
> Learn to build production-ready AI agents with Next.js and the AI SDK

## About This Workshop

This workshop teaches you how to build intelligent chatbot applications with real-time streaming, document artifacts, and multimodal capabilities. You'll learn hands-on by extending and customizing a production-ready AI chatbot built with modern web technologies.

## What You'll Learn

- Building streaming chat interfaces with the AI SDK
- Creating interactive artifacts (documents, code editors, spreadsheets)
- Implementing multimodal AI (text, images, file uploads)
- Managing conversation history and user sessions
- Integrating authentication and rate limiting
- Working with AI model providers through gateway patterns

## Tech Stack

- **[Next.js 16](https://nextjs.org)** - App Router with React Server Components
- **[AI SDK](https://ai-sdk.dev)** - Unified interface for LLM interactions
- **[AI Gateway](https://ai-sdk.dev)** - Multiple AI providers (Anthropic Claude, OpenAI)
- **[MongoDB](https://mongodb.com)** - Database for chat history and artifacts
- **[NextAuth.js v5](https://authjs.dev)** - Authentication
- **[shadcn/ui](https://ui.shadcn.com)** - UI components with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ (npm comes bundled with Node.js)
- Docker and Docker Compose (for MongoDB)
- AI Gateway API key (provided during workshop)

### Installation

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Set up environment variables:**

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
cp .env.example .env.local
```

Required variables:
- `AUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `AI_GATEWAY_API_KEY` - Your AI Gateway API key
- `MONGODB_URI` - MongoDB connection string (use Docker default)
- `BLOB_READ_WRITE_TOKEN` - For file storage

3. **Start MongoDB and services:**

```bash
npm run docker:up
```

4. **Run the development server:**

```bash
npm run dev
```

5. **Open [http://localhost:3000](http://localhost:3000)** in your browser

### MongoDB Access

- **MongoDB Port:** 27018
- **Mongo Express UI:** [http://localhost:8082](http://localhost:8082)
- **Database:** `gitnation`

## Project Structure

```
app/
├── (auth)/          # Authentication routes (login, register)
├── (chat)/          # Chat interface and API routes
│   ├── api/chat/    # Main streaming endpoint
│   └── chat/[id]/   # Individual chat sessions
components/          # React components
├── artifact.tsx     # Artifact modal and rendering
├── chat.tsx         # Main chat interface
└── ui/             # shadcn/ui components
lib/
├── ai/             # AI SDK configuration
│   ├── providers.ts # Model and gateway setup
│   └── prompts.ts  # System prompts
├── db/             # Database utilities
│   ├── mongodb.ts  # Connection helper
│   ├── queries.ts  # Database operations
│   └── types.ts    # TypeScript types
└── artifacts/      # Artifact system
    └── server.ts   # Artifact orchestration
artifacts/          # Artifact implementations
├── text/           # Text document artifacts
├── code/           # Python code artifacts
└── sheet/          # Spreadsheet artifacts
```

## Key Features

### 1. Streaming Chat Interface
Real-time AI responses with support for:
- Text streaming
- Tool calling
- Multimodal input (text, images, files)
- Message history and context

### 2. Document Artifacts
Interactive documents that appear alongside chat:
- **Text Documents** - Rich text editing with ProseMirror
- **Code Artifacts** - Python execution with Pyodide in-browser
- **Spreadsheets** - Excel-like interface with data visualization

### 3. Multimodal Capabilities
- Image uploads and analysis
- File attachments (PDF, text, etc.)
- Vision model support with Claude 3.5 Haiku

### 4. Authentication System
- Email/password authentication
- Guest user support for demos
- Session management with NextAuth.js v5

### 5. Rate Limiting
- Guest users: 20 messages/day
- Registered users: 100 messages/day
- Customizable entitlements

## Workshop Exercises

Throughout the workshop, you'll complete hands-on exercises to:

1. **Customize the AI behavior** - Modify system prompts and model parameters
2. **Create a new artifact type** - Build a custom interactive component
3. **Add a custom tool** - Extend the AI with new capabilities
4. **Implement rate limiting** - Add usage tracking and limits
5. **Style customization** - Brand the interface with your own design

## Development Commands

```bash
# Development
npm run dev                 # Start dev server
npm run build               # Build for production
npm run start               # Start production server

# Database
npm run docker:up           # Start MongoDB and services
npm run docker:down         # Stop all services
npm run docker:logs         # View service logs

# Code Quality
npm run lint                # Check for issues (Biome via Ultracite)
npm run format              # Auto-fix formatting issues
```

## AI Models

This project uses multiple AI providers through the AI Gateway:

- **Claude 3.5 Haiku** (`anthropic/claude-3-5-haiku-latest`) - Main chat model with multimodal support
- **GPT-4o Mini** (`openai/gpt-4o-mini`) - For artifact generation and title creation

### Switching Model Providers

The AI SDK makes it easy to switch providers. See `lib/ai/providers.ts` for configuration. Supported providers include:
- Anthropic (Claude models)
- OpenAI (GPT models)
- Google (Gemini models)
- xAI (Grok models)
- [Many more...](https://ai-sdk.dev/providers/ai-sdk-providers)

## Resources

- **AI SDK Documentation:** [ai-sdk.dev/docs](https://ai-sdk.dev/docs)
- **Next.js Documentation:** [nextjs.org/docs](https://nextjs.org/docs)
- **Anthropic Documentation:** [docs.anthropic.com](https://docs.anthropic.com)
- **OpenAI Documentation:** [platform.openai.com/docs](https://platform.openai.com/docs)

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
npm run docker:logs

# Restart services
npm run docker:down && npm run docker:up
```

### AI Gateway Errors
- Verify `AI_GATEWAY_API_KEY` is set in `.env.local`
- Check you're within rate limits
- Review error messages in the browser console

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Contributing

This is a workshop project! Feel free to experiment, break things, and learn. Your instructor will help you through any issues.

## License

Based on open-source templates and modified for educational purposes. See original projects for licensing details.

---

**Happy coding!** 🚀

*Workshop by Niall Maher for GitNation React Summit US*
