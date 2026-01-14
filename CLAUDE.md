# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

All tasks should be run through Nx rather than underlying tooling directly:

```bash
# Install dependencies
pnpm install

# Build all projects
nx run-many -t build

# Build a specific project
nx build @org/api
nx build @org/web

# Run development servers
nx serve @org/api       # NestJS API on port 3000 (default)
nx serve @org/web       # React web app on port 4200

# Lint
nx run-many -t lint
nx lint @org/api

# Run tests
nx run-many -t test
nx test @org/api        # Jest tests for API
nx test @org/web        # Vitest tests for web

# Run a single test file
nx test @org/api -- --testPathPattern=app.controller.spec
nx test @org/web -- src/app/app.spec.tsx

# Type checking
nx run-many -t typecheck
nx typecheck @org/api

# E2E tests
nx e2e @org/api-e2e     # Jest-based API e2e tests
nx e2e @org/web-e2e     # Playwright-based web e2e tests

# Run affected projects only (useful for CI/large changes)
nx affected -t build
nx affected -t test
```

## Architecture Overview

This is an Nx monorepo with pnpm workspaces containing a full-stack application:

### Projects

- **@org/api** (`apps/api/`) - NestJS backend API
  - Bundled with Webpack
  - Tests with Jest
  - Entry point: `src/main.ts`
  - Standard NestJS module structure: `app.module.ts`, `app.controller.ts`, `app.service.ts`

- **@org/web** (`apps/web/`) - React 19 frontend
  - Bundled with Vite
  - Tests with Vitest
  - Styles: SCSS
  - Entry point: `src/main.tsx`

- **@org/api-e2e** (`apps/api-e2e/`) - API integration tests (Jest)
- **@org/web-e2e** (`apps/web-e2e/`) - Web E2E tests (Playwright)

### Key Configuration Files

- `nx.json` - Nx workspace configuration and plugin setup
- `tsconfig.base.json` - Shared TypeScript configuration
- `eslint.config.mjs` - Root ESLint flat config with Nx module boundaries
- `pnpm-workspace.yaml` - pnpm workspace definition

### Technology Stack

- **Package Manager**: pnpm with workspaces
- **Monorepo**: Nx 22.x with inferred tasks via plugins
- **Backend**: NestJS 11 + Express
- **Frontend**: React 19 + Vite 7 + react-router-dom
- **Testing**: Jest (API), Vitest (Web), Playwright (E2E)
- **Linting**: ESLint 9 with flat config

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## Guidelines for working with Nx

- When running tasks, always prefer running through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->
