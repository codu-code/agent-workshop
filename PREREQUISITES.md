# Prerequisites

> **Note:** Complete these steps **before** the workshop begins. This is pre-course setup, not part of the main curriculum.

---

## Required Software

### Node.js (v18 or higher)

**Why:** Node.js is the JavaScript runtime that powers Next.js and all the development tools we'll use.

- Download: https://nodejs.org/en/download
- npm (Node Package Manager) comes bundled with Node.js - no separate installation needed
- Verify installation: `node --version` and `npm --version`

### Git

**Why:** Version control for cloning the workshop repository and tracking your changes.

- Download: https://git-scm.com/book/en/v2/Getting-Started-Installing-Git
- Verify installation: `git --version`

### Docker Desktop

**Why:** We use Docker to run MongoDB locally via docker-compose. This gives everyone a consistent database setup without manual MongoDB installation.

- Download: https://docs.docker.com/get-started/introduction/get-docker-desktop/
- Available for Windows, macOS, and Linux
- Verify installation: `docker --version`

### Code Editor (VS Code Recommended)

**Why:** VS Code provides the best developer experience for TypeScript and Next.js with excellent extensions and IntelliSense support.

- Download: https://code.visualstudio.com/download
- Recommended extensions:
  - ESLint
  - Tailwind CSS IntelliSense
  - Prettier - Code formatter

---

## Accounts Required

### GitHub Account

**Why:** You'll clone the workshop repository and may want to push your work or contribute.

- Sign up: https://github.com/signup

### Vercel Account

**Why:** Vercel hosts our app and provides access to the AI Gateway for calling AI models.

- Sign up: https://vercel.com/signup
- Free tier is sufficient for this workshop

### Vercel AI Gateway Setup

**Why:** The AI Gateway gives you access to 100+ AI models (including Claude, GPT-4, etc.) without managing separate API keys. It handles rate limiting, fallbacks, and provides a unified interface.

- Documentation: https://vercel.com/docs/ai-gateway/getting-started
- You get $5 of free credits monthly to try any model
- Setup: Create an API key in your Vercel dashboard under **Settings → AI Gateway**

### Vercel Blob Storage

**Why:** Used for storing file uploads from the chat interface (images, documents).

- Documentation: https://vercel.com/docs/vercel-blob
- Free tier: 1GB storage, 10GB transfer/month
- Setup: Create a Blob store in your Vercel project under **Storage → Create Database → Blob**

### MongoDB Atlas (Alternative to Docker)

**Why:** If you prefer not to use Docker, MongoDB Atlas offers a free cloud-hosted database that works great for development.

- Setup guide: https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/
- Free tier: 512MB storage (plenty for the workshop)
- Choose the M0 Sandbox tier (free forever)

---

## Clone the Workshop Repository

Once you have the required software installed, clone the workshop repository and set up the starting branch:

```bash
# Clone the repository
git clone https://github.com/codu-code/agent-workshop.git
cd agent-workshop

# Checkout the starting branch for Chapter 0
git checkout chapter-0

# Install dependencies
npm install
```

### Branch Structure

The workshop uses Git branches for each chapter. You'll start on `chapter-0` and can check out completed solutions:

| Branch | Description |
|--------|-------------|
| `chapter-0` | Starting point - basic chat setup |
| `chapter-1` | After adding first tool (weather) |
| `chapter-2` | After adding Tutor agent |
| `chapter-3` | After adding all agents |
| `chapter-4` | After adding artifacts |
| `chapter-5` | Complete implementation |
| `main` | Latest complete version |

To switch branches: `git checkout chapter-X`

---

## Environment Variables

Create a `.env.local` file in the project root with these variables:

| Variable | Description | How to get it |
|----------|-------------|---------------|
| `AUTH_SECRET` | NextAuth.js secret for session encryption | Run: `openssl rand -base64 32` |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key | Vercel Dashboard → Settings → AI Gateway |
| `MONGODB_URI` | MongoDB connection string | Docker: `mongodb://localhost:27017` or Atlas connection string |
| `MONGODB_DB` | Database name | Use: `gitnation` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token | Vercel Dashboard → Storage → Blob |

### Example `.env.local` file

```bash
AUTH_SECRET=your-generated-secret-here
AI_GATEWAY_API_KEY=your-ai-gateway-key-here
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=gitnation
BLOB_READ_WRITE_TOKEN=your-blob-token-here
```

---

## Start the Development Environment

```bash
# Make sure you're on chapter-0 branch
git checkout chapter-0

# Start MongoDB (Docker must be running)
npm run docker:up

# Start the development server
npm run dev
```

Then open http://localhost:3000 in your browser!

---

## Verification Checklist

Before the workshop, verify everything is working:

| Command / Action | Expected Result |
|------------------|-----------------|
| `node --version` | v18 or higher |
| `npm --version` | v9 or higher |
| `git --version` | Any version works |
| `docker --version` | Any version works |
| Docker Desktop | Running (whale icon in menu bar) |
| Clone repository | From https://github.com/codu-code/agent-workshop |
| `git branch` | Shows `* chapter-0` |
| Vercel account | Created at vercel.com |
| AI Gateway API key | Generated in Vercel dashboard |
| `.env.local` file | Created with all variables |
| `npm run docker:up` | MongoDB starts successfully |
| `npm run dev` | App runs at http://localhost:3000 |

---

## Useful Documentation

### Vercel AI SDK

The AI SDK is the TypeScript toolkit we use for building the chatbot. It provides a unified API for multiple AI providers.

- Introduction: https://ai-sdk.dev/docs/introduction
- Getting Started: https://ai-sdk.dev/docs/getting-started
- GitHub: https://github.com/vercel/ai

### Next.js 16

Our frontend framework with App Router and Server Components. This workshop uses the latest Next.js 16 features.

- Documentation: https://nextjs.org/docs
- App Router: https://nextjs.org/docs/app/getting-started
- Learn Next.js: https://nextjs.org/learn

---

## Troubleshooting

### Setup Issues

**Docker won't start / MongoDB connection refused**
```bash
# Make sure Docker Desktop is running, then:
npm run docker:down
npm run docker:up
npm run docker:logs  # Check for errors
```

**"AI Gateway requires activation" error**
- Check that `AI_GATEWAY_API_KEY` is set in `.env.local`
- Verify the key is valid in Vercel Dashboard → Settings → AI Gateway

**"Module not found" errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Can't checkout branch / "branch not found"**
```bash
# Fetch all branches from remote
git fetch --all
git checkout chapter-0
```

### Database Issues

**Can't save documents / "Database error"**
1. Verify MongoDB is running: `docker ps` should show MongoDB container
2. Check connection string in `.env.local`
3. Inspect database with Mongo Express: http://localhost:8082

---

## Need Help?

If you run into any issues during setup or have questions after the workshop:

1. Check the troubleshooting section above
2. **During the event**: Ask in the [GitNation Discord](https://discord.com/invite/TGh5XkeJmn) - I'll be monitoring the workshop channel
3. **After the event**: Join the [Codú Discord](https://www.codu.co) (free registration) to connect with me and the community
4. Raise your hand during the workshop and we'll help you out!

---

**Ready?** Once setup is complete, proceed to [Chapter 0: The Starting Point](/course/0) to begin the workshop!
