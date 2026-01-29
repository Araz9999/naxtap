# Naxtap Backend Server

Backend API server for the Naxtap marketplace application.

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Prisma CLI

## Installation

```bash
npm install
```

## Setup

1. Copy `.env.example` to `.env` and fill in your configuration
2. Generate Prisma client:
```bash
npx prisma generate
```
3. Run migrations:
```bash
npx prisma migrate deploy
```

## Development

```bash
npm run build
npm run start
```

Or use TypeScript directly:

```bash
npm run server:ts
```

## Production

```bash
npm run deploy:backend
```

## Project Structure

```
server/
├── src/
│   ├── trpc/            # tRPC routes
│   ├── routes/          # HTTP routes
│   ├── services/        # Business logic
│   ├── db/              # Database access
│   ├── middleware/      # Express/Hono middleware
│   ├── utils/           # Utility functions
│   └── server.ts        # Server entry point
├── prisma/              # Prisma schema and migrations
└── dist/                # Compiled JavaScript
```

## API Endpoints

- tRPC: `/api/trpc`
- REST API: `/api/*`
- WebSocket: `/socket.io`

## Environment Variables

See `.env.example` for required environment variables.

## Database

The project uses Prisma ORM with PostgreSQL. To view the database:

```bash
npx prisma studio
```
