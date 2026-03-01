# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
# Development
npm run dev          # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint
npm run format        # Format code with Prettier
npm run format:check  # Check formatting without modifying
npm run clean:logs    # Remove all console.log/console.error statements

# Database (requires .env file)
npm run db:generate   # Generate Prisma client
npm run db:migrate   # Run database migrations
npm run db:push      # Push schema to database
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio

# Docker
npm run docker:up         # Start PostgreSQL container
npm run docker:down       # Stop PostgreSQL container
npm run docker:logs       # View PostgreSQL logs
npm run docker:restart    # Restart PostgreSQL container
```

## Project Architecture

This is a **Next.js 15** full-stack AI chat application (Linums) with React 19 and TypeScript.

### Directory Structure

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js App Router - pages, API routes, and server actions |
| `components/` | Shared UI (Radix UI primitives, layouts) |
| `features/` | Feature-based modules organized by domain (auth, chat, conversation, voice, setting, share) |
| `server/` | Backend services, repositories, and business logic |
| `lib/` | Shared utilities, hooks, and Zustand stores |
| `prisma/` | Database schema and migrations |

### Key Patterns

**Feature-based organization** (`features/`): Each feature (auth, chat, conversation) contains its own components, hooks, services, stores, and types. This keeps related code together.

**Layered backend** (`server/`): Services handle business logic, repositories handle data access. Use repositories for DB operations, services for complex logic.

**State management**: Uses Zustand for client-side state (chat store, conversation store, UI store).

**AI Integration**: Custom gateway in `server/services/ai/` supports multiple providers (OpenRouter, SiliconFlow, BigModel) with tool/function calling support.

**Tools system**: AI tools are registered in `server/services/tools/registry.ts` - includes image generation, web search, and function calling.

### API Routes

Located in `app/api/`:
- `/api/chat` - Main chat endpoint with SSE streaming
- `/api/auth/*` - Authentication (NextAuth.js)
- `/api/conversations/*` - Conversation CRUD
- `/api/messages/*` - Message operations
- `/api/image/generate` - Image generation
- `/api/speech` / `/api/tts` - Speech/TTS
- `/api/share/*` - Shared conversation links
- `/api/modelzoo/*` - AI model provider routes

### Database

PostgreSQL with Prisma ORM. Main models: User, Account, Session, Conversation, Message, AuditLog.

### Environment Setup

Copy `.env.example` to `.env` and configure:
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - NextAuth secret key
- `SILICONFLOW_API_KEY` - AI provider API key
- Optional: OAuth credentials (Google, GitHub)
