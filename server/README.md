# xTRA Server

This is the backend server for [CTDL xTRA](../README.md). It's built with
Fastify and provides the API endpoints and background processing capabilities
for the application.

## Components

- **Dependencies and tooling**: pnpm, TypeScript, vitest
- **API server**: Fastify and tRPC
- **Background processing**: BullMQ
- **Web scraping**: Puppeteer
- **Email**: React Email for templating and Nodemailer for sending
- **Database**: PostgreSQL with Drizzle ORM
- **Error monitoring**: Airbrake

## Setup

1. Install [node.js](https://nodejs.org/en) (20+) and [pnpm](https://pnpm.io/)

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

```bash
cp .env.example .env # edit your env vars in .env
```

## Development

Run the development server:

```bash
pnpm run dev
```

Start the background worker:

```bash
pnpm run dev:worker
```

Run the email preview server:

```bash
pnpm run dev:email
```

## Database

The application uses PostgreSQL with Drizzle ORM for database management.

Generate database migrations:

```bash
pnpm run db:generate
```

Apply migrations:

```bash
pnpm run db:migrate
```

## Testing

Run tests:
```bash
pnpm run test
```

Note that tests currently act more like model evals than standard
unit/integration tests. They will call the real OpenAI API.
