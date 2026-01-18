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

## TypeScript Module Resolution (Workspace Dependencies)

This workspace uses **TypeScript project references** with **pnpm workspace dependencies** for module resolution. This approach provides incremental builds and strict project boundaries.

### Key Architecture

- `moduleResolution: nodenext` - TypeScript resolves `@org/*` packages via `node_modules` symlinks
- `workspace:*` dependencies - pnpm creates symlinks from library `node_modules/@org/*` to source directories
- `nx sync` - Automatically maintains `tsconfig.json` project references based on the dependency graph

### When Creating a New Library

1. **Add workspace dependencies** in the library's `package.json`:
   ```json
   {
     "dependencies": {
       "@org/shared-types": "workspace:*",  // If importing from shared-types
       "@org/data-access": "workspace:*"    // If importing from data-access
     }
   }
   ```

2. **Run `pnpm install`** to create workspace symlinks

3. **Run `nx sync`** to update TypeScript project references automatically

4. **Do NOT manually edit** `tsconfig.json` project references - let `nx sync` manage them

### When Importing from Another Library

If you add a new import like `import { Foo } from '@org/some-lib'`:

1. Add `"@org/some-lib": "workspace:*"` to the consuming library's `package.json` dependencies
2. Run `pnpm install`
3. Run `nx sync` (or it will prompt automatically on next `nx build`)

### Why This Matters

| Tool | Resolution Mechanism |
|------|---------------------|
| Jest/SWC | Uses `customConditions: ["@org/source"]` from package.json exports |
| `tsc --build` | Uses `moduleResolution: nodenext`, requires `node_modules` symlinks |

Without `workspace:*` dependencies, `tsc --build` fails with "Cannot find module" errors even if tests pass.

### Troubleshooting Build Failures

If you see `TS2307: Cannot find module '@org/xxx'`:

1. Check if `@org/xxx` is in the consuming library's `package.json` dependencies with `workspace:*`
2. Run `pnpm install` to create symlinks
3. Run `nx sync` to update project references
4. Verify: `ls libs/<your-lib>/node_modules/@org/` should show symlinks

## TypeScript Rules

- **Never use `any`** - Use `unknown` and narrow with type guards
- **Never use `@ts-ignore` or `@ts-expect-error`** - Fix the type issue
- **Avoid type assertions (`as`)** - Prefer type guards or generics; when necessary (third-party libs), cast through `unknown` first
- **Explicit return types** on all exported functions
- **Use `interface` for objects**, `type` for unions/intersections
- **Nullish coalescing (`??`)** over logical OR (`||`)
- **Leverage advanced types** - Mapped types, template literals, conditional types; prefer composition over inheritance

## NestJS Rules

- **Controllers are thin** - HTTP concerns only (validation, response shaping)
- **Business logic in services** - Controllers never call repositories directly
- **Use DTOs with class-validator** - All request/response bodies typed and validated
- **Dependency injection** - Never instantiate services manually with `new`
- **Async/await everywhere** - No raw promises or callbacks
- **Parameterized queries only** - Never interpolate user input into SQL
- **Custom decorators for repetitive logic** - Extract validation, logging, auth into reusable decorators with `applyDecorators`
- **Pipes for validation & transformation** - Use NestJS Pipes at framework level
- **Guards for authorization** - RBAC and permission checks

## React Rules

- **Functional components only** - No class components
- **Custom hooks for shared logic** - Prefix with `use`
- **React Query for server state** - API data fetching and caching
- **React Context for auth/session** - App-wide state that rarely changes
- **Local state with `useState`** - Keep state close to where it's used
- **Optimize renders** - Use `React.memo`, `useMemo`, `useCallback` where appropriate