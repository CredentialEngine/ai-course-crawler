# xTRA Client

This is the frontend client for [CTDL xTRA](../README.md).
It's built with React (Vite template) and provides the user interface for
configuring and managing extractions.

## Components

- **Framework**: React with TypeScript and Vite
- **Styling**: TailwindCSS with shadcn/ui components
- **State management**: TanStack Query (React Query)
- **API communication**: tRPC client
- **Form handling**: React Hook Form with Zod validation
- **Routing**: Wouter
- **Data visualization**: Recharts

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

The development server includes HMR (Hot Module Replacement) and will be
available at `http://localhost:5173` by default.

## Building

Build for production:

```bash
pnpm run build
```

Preview the production build:

```bash
pnpm run preview
```

## Linting

Run the linter:

```bash
pnpm run lint
```

The project uses ESLint with TypeScript support and includes rules for React
hooks and refresh.

## Type Checking

The project uses TypeScript for type safety. Type checking is performed during
the build process, but you can also run it separately using:

```bash
tsc
```
