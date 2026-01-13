# AGENTS for Clarity
Guidelines for agentic changes in this repo (Next.js 16 + Hono API + Drizzle SQLite).
## Scope and intent
- Applies to entire repository (no nested AGENTS yet).
- Treat Next.js App Router code as server components unless `use client`.
- No Cursor or Copilot rules found; follow instructions here.
- Keep edits minimal and localized; avoid broad refactors.
- Preserve existing file-specific style (quote/semicolon choices) to reduce churn.
## Tooling and prerequisites
- Node 18+ recommended (Next 16 requirement).
- Package managers: `npm` (package-lock) and `pnpm` (pnpm-lock); prefer npm unless workflow requires pnpm.
- Run commands from repo root.
- TypeScript strict mode is enabled; avoid `any` where possible.
- Path alias `@/*` maps to repo root.
- Environment variables live in `.env`; never commit secrets.
- Database path: set `DATABASE_PATH=./data/clarity.db` for local dev. In containers use `/app/data/clarity.db` (volume `./data:/app/data`).
- Auto-migrations run on server start via `instrumentation.ts`.

## Install and run
- npm install
- npm run dev # start local dev server (port 3000, 0.0.0.0)
- npm run build # Next production build (standalone)
- npm run start # serve production build
- npm run build:static # Next build + export
- npm run preview # runs `pnpm build` then `npx serve out` (ensure pnpm available)
- docker-compose up --build # container build/run using Dockerfile
- docker run -d -p 8080:8080 registry.ctl.qzz.io/clarity:latest # per README quick start

## Linting and formatting
- npm run lint # ESLint via next/core-web-vitals config
- No Prettier config; avoid mass reformatting.
- Follow existing per-file quote/semicolon style; do not toggle formatting options globally.
- Tailwind v4 via `@import 'tailwindcss'`; keep utility class order logical (layout → spacing → color → effects).
- Prefer `type`-only imports for types to satisfy lint/TS perf.
- Run lint before committing large changes.
## Testing
- No automated test suite or `test` script currently defined.
- No `*.test.*` files present; single-test execution not applicable yet.
- If you add tests, prefer Vitest or Playwright; document runner and support `-t "<name>"`/`--filter` for single test runs.
- Until tests exist, validate by running targeted pages/flows in dev or via lint.
## Database and migrations
- SQLite via Drizzle ORM; default file `data/clarity.db`.
- Drizzle config: `drizzle.config.ts` uses schema `./lib/api/db/schema.ts`, output `./drizzle/migrations`.
- Auto-migrations: `instrumentation.ts` runs `drizzle-orm` migrations on startup (dev/prod) using `DATABASE_PATH` (defaults to `file:./data/clarity.db`). Ensure the migrations folder is present (`./drizzle/migrations`) in the runtime image.
- Commands: `npm run db:generate` to create migrations, `npm run db:migrate` to apply via `tsx lib/api/db/migrate.ts`, `npm run db:studio` for UI.
- Keep schema changes backwards compatible where possible; update type exports if adding tables/columns.
- Database path env: set `DATABASE_PATH=./data/clarity.db` locally; use `/app/data/clarity.db` in containers (volume `./data:/app/data`).
## API architecture (Hono under Next API route)
- Central handler: `app/api/v1/[[...route]]/route.ts` uses `handle(app)` from `@/lib/api`.
- `lib/api/index.ts` builds Hono app with `authMiddleware`, `cors`, `logger`, and routes for auth/notes/transcripts/settings/providers/storage/sync/public/ai`.
- Use `zod` validation for request bodies (see `lib/api/routes/ai.ts`).
- Return JSON with explicit status codes; prefer `c.json({ error: message }, status)` on failures.
- Use `authMiddleware` for protected routes; bypass only where explicitly public.
- Keep error logs concise (`console.error('Context:', err)`).
- Use `decrypt`/`encrypt` helpers from `lib/api/lib/encryption.ts` for secrets.
- Respect `serverExternalPackages` list in `next.config.mjs` (e.g., `better-sqlite3`).
## Frontend architecture (Next.js App Router)
- Server components by default; add `"use client"` when hooks/event handlers are needed.
- Global layout in `app/layout.tsx` sets fonts via `next/font/google` and wraps `ThemeProvider`.
- Tailwind variables defined in `app/globals.css`; avoid editing computed shadow variables section.
- Use `ThemeProvider` from `@/components/theme-provider` for theme-aware components.
- Navigation uses `next/navigation` router; handle unauthorized by redirecting to `/login` similar to `app/page.tsx`.
- Keep view-transition and reduced-motion considerations intact (`globals.css`).
- For uploads, API rewrites `/uploads/:path*` to `/api/uploads/:path*` per `next.config.mjs`.
## Components and styling
- UI primitives live in `components/ui/*` (shadcn-inspired). Prefer composing from them before custom elements.
- Use `cn` from `@/lib/utils` for conditional class merging.
- Variant components use `class-variance-authority`; extend variants via `cva` patterns.
- Icons: `lucide-react`; keep size classes consistent (`size-4` default).
- Maintain accessibility: focus styles, `aria-*`, semantic elements.
- Respect dark/light tokens via CSS variables; avoid hard-coded colors.
- Tailwind class order: layout (flex/grid) → spacing → typography → color → effects/animation.
- Prefer utility classes over custom CSS; add to `globals.css` only for global patterns.
## State, storage, and auth
- Auth uses httpOnly cookies (`access_token`, `refresh_token`); no tokens stored in `localStorage`/`sessionStorage`.
- Client fetches should use `apiFetch` from `lib/storage.ts` (cookie-based; retries refresh on 401).
- On any 401, clear local state and redirect to `/login`.
- On DB reset/setup incomplete, redirect to `/setup` and clear local state.
## Imports and module organization
- Order imports: Node/React/Next -> external libs -> `@/` absolute -> relative paths.
- Use explicit extensions `.ts`/`.tsx` only when required by tooling.
- Group type imports with `type` keyword; avoid importing runtime values as types.
- Prefer named exports; default export only for pages or single main module.
- Keep path alias `@/*` consistent; avoid deep relative paths when alias fits.
## Types and naming
- Components/functions: PascalCase for React components, camelCase for functions/variables.
- Types/interfaces: PascalCase (`Transcript`, `ProviderConfig`); exported types centralized in schema where available.
- Avoid `any`; when unavoidable, document why and narrow quickly.
- Use discriminated unions or literal types for enums (e.g., provider ids).
- Keep DTO shapes aligned between frontend types (`lib/types.ts`) and Drizzle schema exports.
## Error handling and logging
- Wrap async flows in `try/catch`; return meaningful messages for UI display.
- For API routes, prefer structured errors `{ error: string }` and appropriate HTTP status.
- When proxying external APIs, log sanitized response bodies (see `lib/api/routes/ai.ts`).
- Do not swallow 401s; allow caller to redirect; avoid defaulting to onboarding settings on failure (see comment in `getSettings`).
- Use `retryWithBackoff` utilities for transient failures when appropriate.
## Data validation and security
- Validate inputs with `zod` before DB writes or external API calls.
- Use `encrypt`/`decrypt` for sensitive keys; never log raw secrets.
- Sanitize file uploads; ensure `File` presence checks mirror `aiRoutes` pattern.
- Keep JWT and encryption keys in environment; do not commit defaults.
- Database credentials default to `file:./data/clarity.db`; change via env for deployments.
## Styling specifics
- Maintain print/export styles in `globals.css`; avoid removing `@media print` block.
- Fonts variables set on `<body>` class list; preserve when editing layout.
- Keep drag-handle styles (ProseMirror) intact for editor experience.
## Performance considerations
- Avoid blocking work in client effects; debounce network requests when user-initiated.
- Prefer streaming/async handlers where possible; keep responses lean.
- Use `React.Suspense`/lazy loading if adding heavy client components.
- Respect `unoptimized: true` image config; do not assume Next image optimization.
## Accessibility and UX
- Ensure form controls have labels; use Radix UI components when available.
- Provide loading/empty/error states; mirror skeleton style from `app/page.tsx` loading text.
- Respect reduced-motion preferences; avoid autoplay animations.
- Maintain keyboard navigation and focus outlines (`outline-ring/50` from globals).
## Data layer patterns
- Use `db` client from `lib/api/db/client.ts`; prefer `db.query.<table>` helpers with typed schema imports.
- Use `eq`, `and`, `inArray` from drizzle-orm for filters; avoid raw SQL unless necessary.
- Timestamps stored as integers (mode timestamp); write in ms (`Date.now()`).
- Keep soft-delete fields (e.g., `deletedAt`) respected in queries if new features rely on them.
- When adding tables, append type exports (`$inferSelect`/`$inferInsert`) at file end.
## Routing and pages
- Routes live under `app/*`; use nested segment folders for layout grouping.
- API rewrites for `/uploads` already configured; new upload endpoints should match rewrite path conventions.
- For new API routes outside `/api/v1`, follow Next route handler patterns under `app/api`.
- Maintain `runtime = 'nodejs'` and `dynamic = 'force-dynamic'` flags if editing Hono route file.
## Client data flows
- Prefer `useEffect` for navigations after status checks (see `app/page.tsx`).
- Use `useRouter` from `next/navigation` for client redirects.
- Keep `use client` directives only when needed.
## File handling and uploads
- Upload endpoints under `app/api/upload(s)`; ensure multipart handling matches existing code.
- Persist files under `/uploads` route rewrite; consider storage path expectations when changing behavior.
- Validate MIME/size on server; respond with 400 on missing file similar to AI route.
## Dependencies and external services
- Providers supported: OpenAI, Groq, AssemblyAI; model fetching logic in `lib/api/routes/ai.ts`.
- Keep `serverExternalPackages` list in sync if adding native deps.
- For analytics, Vercel Analytics included; avoid removing `<Analytics />` in layout.
## Git and review hygiene
- Do not commit secrets or data files in `data/`.
- Keep changes scoped; avoid formatting-only commits.
- Update this AGENTS file if conventions change.
- No commits requested by default; follow user instructions.
## Delivery checklist
- Run `npm run lint` after changes touching TS/TSX.
- Run `npm run build` if modifying Next config or server code.
- Validate key flows manually (auth, onboarding, transcription) since tests absent.
- Ensure new environment variables are documented in `.env.example` (add if missing).
- Keep docker-compose and README instructions in sync if altering ports or commands.
## Contact points
- If unclear, inspect relevant files before editing (notably `lib/api/routes/*`, `components/ui/*`, `app/globals.css`).
- When adding new sections, mirror existing patterns instead of introducing new abstractions.
