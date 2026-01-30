# AGENTS for Clarity
Guidelines for agentic changes in this repo (Next.js 16 + Hono API + Drizzle SQLite).

## Scope and intent
- Applies to entire repository (no nested AGENTS yet).
- Treat Next.js App Router code as server components unless `use client`.
- No Cursor/Copilot rules found (.cursor/rules, .cursorrules, .github/copilot-instructions.md); follow instructions here.
- Keep edits minimal and localized; avoid broad refactors.
- Preserve existing file-specific style (quotes: single strings, semicolons: present) to reduce churn.

## Tooling and prerequisites
- **Node 18+** recommended (Next 16 requirement).
- **Package managers:** `npm` (package-lock.json) primary; `pnpm` (pnpm-lock.yaml) secondary; prefer npm unless workflow requires pnpm.
- Run all commands from repo root (`/root/Clarity`).
- **TypeScript strict mode enabled** (`tsconfig.json` has `"strict": true`); avoid `any` where possible.
- **Path alias** `@/*` maps to repo root; use consistently for all non-relative imports.
- **Environment variables** live in `.env`; never commit secrets (`.env` ignored in `.gitignore`).
- **Database:** SQLite file at `data/clarity.db` locally; set `DATABASE_PATH` env for override.
- **Auto-migrations** run on server start via `instrumentation.ts` using Drizzle ORM; migrations folder must exist in runtime image.

## Install and run

```bash
npm install                           # Install dependencies from package-lock.json
npm run dev                           # Start dev server (port 3000, bound to 0.0.0.0)
npm run build                         # Next.js production build (standalone output)
npm run start                         # Serve production build (requires build first)
npm run build:static                 # Next.js build + export (static site output)
npm run preview                       # Runs `pnpm build` then serves via `npx serve out`
npm run lint                          # Run ESLint (next/core-web-vitals config)
npm run db:generate                  # Generate Drizzle migrations
npm run db:migrate                   # Apply migrations via tsx lib/api/db/migrate.ts
npm run db:studio                    # Open Drizzle Studio UI for DB inspection
npm run build:migration              # Bundle migration script with esbuild
docker-compose up --build            # Build and run via Docker Compose
docker run -d -p 8080:8080 registry.ctl.qzz.io/clarity:latest  # Run published image
```

## Linting and formatting

- **`npm run lint`** — ESLint via `next/core-web-vitals` config (`.eslintrc.json`). Runs on `**/*.ts` and `**/*.tsx`.
- **No Prettier config** — Never auto-format. Codebase uses **single quotes** and **semicolons** consistently.
- **Style preservation** — Maintain per-file quote/semicolon choices to reduce diff churn during reviews.
- **Tailwind v4** configured via `@import 'tailwindcss'` in `app/globals.css`.
  - **Class order:** layout (flex/grid/display) → spacing (m/p/gap) → typography (text/font/leading) → color (bg/text/border) → effects (shadow/blur/opacity).
  - **Example:** `<div className='flex items-center gap-2 px-4 text-sm text-foreground bg-secondary rounded-lg shadow-sm'>`.
- **Type-only imports** — Use `import type { Foo }` for types (satisfies lint perf requirements); use `import { Foo }` for values.
  - Example: `import type { AppSettings } from '@/lib/storage'` vs. `import { apiFetch } from '@/lib/storage'`.
- **Run lint before committing** any TS/TSX changes touching multiple files.

## Testing

- **No test suite exists yet.** No `npm run test` script; no `*.test.*` or `*.spec.*` files in the repo.
- **If adding tests**, prefer **Vitest** (unit, `vitest --watch`) or **Playwright** (e2e).
  - Configure to support `-t "<test name>"` and `--filter` for single-test runs.
  - Create `vitest.config.ts` if adding Vitest; add Playwright config in `playwright.config.ts`.
- **Current validation approach:**
  - Manual testing in dev (`npm run dev` then browser at http://localhost:3000).
  - Lint checks (`npm run lint`).
  - Targeted feature flows: auth/onboarding, transcription, note creation.

## Database and migrations

- **SQLite via Drizzle ORM** — Default file: `data/clarity.db` (created on first run).
- **Schema location** — `lib/api/db/schema.ts` defines all tables (notes, transcripts, settings, providers, sessions, users, systemConfig).
- **Drizzle config** — `drizzle.config.ts` points schema to `lib/api/db/schema.ts`, output to `drizzle/migrations`.
- **Auto-migrations** — `instrumentation.ts` runs migrations on server start (dev/prod):
  ```typescript
  import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
  const db = new Database(process.env.DATABASE_PATH || 'file:./data/clarity.db');
  migrate(db, { migrationsFolder: './drizzle/migrations' });
  ```
- **Commands:**
  - `npm run db:generate` — Create new migration files (run after schema changes).
  - `npm run db:migrate` — Apply all pending migrations (manual runner at `lib/api/db/migrate.ts`).
  - `npm run db:studio` — Interactive DB UI (requires Drizzle Studio).
- **Schema patterns:**
  - **Soft deletes** — Use `deletedAt: integer('deleted_at', { mode: 'timestamp' })` for archival; filter queries with `isNull(table.deletedAt)`.
  - **Timestamps** — Use `integer` with `mode: 'timestamp'` (milliseconds); write with `Date.now()`.
  - **Type exports** — Append `$inferSelect` and `$inferInsert` for TypeScript inference:
    ```typescript
    export type Note = typeof notes.$inferSelect;
    export type NewNote = typeof notes.$inferInsert;
    ```
  - **Indices** — Add for frequently queried columns (e.g., `publishedSlugIdx` on notes.publishedSlug).
- **Backwards compatibility** — Keep schema changes compatible; add columns as optional; avoid dropping columns without migration planning.
- **Container DB path** — Use `/app/data/clarity.db` in Docker (volume mount: `./data:/app/data`); set `DATABASE_PATH=/app/data/clarity.db` in container.

## API architecture (Hono under Next API route)

- **Central handler** — `app/api/v1/[[...route]]/route.ts` (catch-all route) calls `handle(app)` from `@/lib/api`.
- **Hono app setup** — `lib/api/index.ts` builds the Hono instance with:
  - `authMiddleware` (JWT validation via `lib/api/middleware/auth.ts`).
  - CORS middleware.
  - Logger middleware.
  - Routes: `/auth`, `/notes`, `/transcripts`, `/settings`, `/providers`, `/storage`, `/sync`, `/public`, `/ai`.
- **Request validation** — Use `zod` schemas for all POST/PUT bodies (see `lib/api/routes/ai.ts` for examples):
  ```typescript
  const modelRequestSchema = z.object({
    providerId: z.string().min(1),
    apiKey: z.string().optional(),
  });
  const { providerId, apiKey } = modelRequestSchema.parse(body);
  ```
- **Response format** — Return JSON with explicit HTTP status:
  ```typescript
  // Success (typically 200)
  return c.json({ data: transcript });
  // Error
  return c.json({ error: 'Transcript not found' }, 404);
  // Validation failure
  return c.json({ error: 'Invalid providerId' }, 400);
  ```
- **Status codes** — Use standard REST conventions: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 500 (Server Error).
- **Auth middleware** — Protects all routes except `/auth/status`, `/auth/setup`, `/auth/login`, `/auth/logout`, `/public/*`:
  ```typescript
  export async function authMiddleware(c: Context, next: Next) {
    const path = c.req.path;
    if (path.startsWith('/api/v1/auth') || path.startsWith('/api/v1/public')) {
      return next();
    }
    const token = getCookie(c, 'access_token') || c.req.header('Authorization')?.slice(7);
    if (!token) return c.json({ error: 'Missing authorization' }, 401);
    const { payload } = await jwtVerify(token, getJwtSecret());
    c.set('user', { sub: payload.sub });
    return next();
  }
  ```
- **Error logging** — Keep logs concise and sanitized (never log raw secrets or passwords):
  ```typescript
  console.error('Failed to fetch models from OpenAI:', error instanceof Error ? error.message : String(error));
  ```
- **Secrets handling** — Use `encrypt`/`decrypt` from `lib/api/lib/encryption.ts` for API keys:
  ```typescript
  import { encrypt, decrypt } from '@/lib/api/lib/encryption';
  const encrypted = encrypt(apiKey);
  const decrypted = decrypt(provider.encryptedApiKey);
  ```
- **External packages** — Respect `serverExternalPackages` in `next.config.mjs` (currently: `['better-sqlite3']`); add new native deps if needed.
- **Route handlers** — New API routes should follow Next.js route handler pattern:
  ```typescript
  export const runtime = 'nodejs';
  export const dynamic = 'force-dynamic';
  export async function POST(req: Request) { ... }
  ```

## Frontend architecture (Next.js App Router)

- **Server components by default** — All components in `app/` are server components unless `'use client'` directive present.
  - Use for: data fetching, DB queries, layout logic, static rendering.
  - Avoid client-side hooks in server components (useState, useEffect, useContext).
- **Client directive** — Add `'use client'` only when needed:
  - Form handling (useForm).
  - Event listeners (onClick, onChange).
  - Real-time updates (useEffect).
  - State management (useState).
  - Example:
    ```typescript
    'use client';
    import { useState } from 'react';
    export function Counter() { ... }
    ```
- **Global layout** — `app/layout.tsx` (root layout):
  - Imports fonts via `next/font/google`: Geist (sans), Geist_Mono, Playfair_Display, Lora.
  - Wraps app with `ThemeProvider` from `@/components/theme-provider`.
  - Sets metadata (title, description, icons, manifest).
  - Registers service worker via `RegisterServiceWorker` component.
- **Tailwind variables** — Defined in `app/globals.css` as CSS custom properties:
  ```css
  :root {
    --primary: 214 88% 50%;  /* HSL format */
    --background: 0 0% 100%;
    /* ... more variables ... */
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --primary: 214 88% 45%;  /* Dark mode override */
    }
  }
  ```
- **Do not edit computed shadow section** in `globals.css` — Maintained separately for performance.
- **Theme switching** — Use `ThemeProvider` context; access current theme via `useTheme()` (client-only).
- **Navigation & redirects** — Use `next/navigation` router:
  ```typescript
  'use client';
  import { useRouter } from 'next/navigation';
  const router = useRouter();
  router.push('/login');  // Client-side redirect
  ```
  - Handle 401 (unauthorized) by clearing auth state and redirecting to `/login`.
  - Handle setup incomplete (DB error) by redirecting to `/setup`.
- **View transitions** — Preserved in `app/globals.css` via `view-transition-name` CSS; maintain for smooth page transitions.
- **Reduced motion** — Respect `prefers-reduced-motion: reduce` media query; avoid auto-playing animations.
- **Upload rewrites** — `/uploads/*` rewrites to `/api/uploads/*` per `next.config.mjs`; use for serving persisted files.

## Components and styling

- **UI primitives** — Located in `components/ui/*` (shadcn-inspired, Radix UI based):
  - Button, Input, Dialog, Dropdown, Select, Tabs, Toast, Popover, etc.
  - Composed from Radix UI base components with Tailwind styling.
  - Use `Slot` from `@radix-ui/react-slot` for component composition (asChild pattern).
- **Component composition** — Prefer composing from `components/ui/*` before creating custom elements:
  - Build complex UIs by combining Button, Dialog, Input, Select, etc.
  - Define custom business components in `components/` (not `components/ui/`).
- **Utility merging** — Use `cn()` from `@/lib/utils` for conditional Tailwind classes:
  ```typescript
  import { cn } from '@/lib/utils';
  const btnClass = cn('px-4 py-2', isActive && 'bg-primary', isDisabled && 'opacity-50');
  ```
- **Class-Variance-Authority (CVA)** — Define component variants with `cva`:
  ```typescript
  import { cva, type VariantProps } from 'class-variance-authority';
  const buttonVariants = cva('inline-flex items-center ...', {
    variants: {
      variant: {
        default: 'bg-primary text-white',
        outline: 'border bg-background',
      },
      size: { sm: 'px-2 py-1', lg: 'px-4 py-2' },
    },
    defaultVariants: { variant: 'default', size: 'sm' },
  });
  export type ButtonProps = VariantProps<typeof buttonVariants>;
  ```
- **Icons** — From `lucide-react`; keep size classes consistent (`size-4` default):
  ```typescript
  import { CheckCircle2, AlertCircle } from 'lucide-react';
  <CheckCircle2 className='size-5 text-green-600' />
  ```
- **Accessibility** — Maintain semantic HTML and ARIA attributes:
  - Use `<button>`, `<input>`, `<label>` instead of divs.
  - Include `aria-label`, `aria-describedby`, `aria-invalid` where needed.
  - Focus styles: use Tailwind's `focus-visible` class (defined in globals.css as `outline-ring/50`).
  - Form controls: always pair with `<label>` (even if hidden).
- **Dark mode tokens** — Use CSS variables for theme colors; avoid hard-coded hex/rgb:
  ```css
  /* In globals.css */
  color: hsl(var(--foreground));
  background: hsl(var(--background));
  /* Theme context handles switching :root variables */
  ```
- **Tailwind class order** (strictly enforced for consistency):
  1. **Layout:** flex, grid, display, position, z-index.
  2. **Spacing:** margin, padding, gap.
  3. **Typography:** font-size, font-weight, line-height, text-align.
  4. **Color:** background, text, border, outline.
  5. **Effects:** shadow, opacity, blur, transform, transition.
  - Example: `<div className='flex gap-2 px-4 text-sm text-foreground bg-secondary rounded-lg shadow-sm hover:bg-secondary/80 transition-colors'>`.
- **Custom CSS** — Prefer Tailwind utilities; add to `globals.css` only for global patterns (fonts, print styles, ProseMirror drag handles).
- **Print styles** — Maintain `@media print` block in `globals.css`; used for PDF/export functionality.
- **ProseMirror drag handles** — Keep existing drag-handle styles intact for text editor experience.

## State, storage, and auth

- **Authentication** — Uses **httpOnly cookies** (`access_token`, `refresh_token`); tokens NOT stored in `localStorage` or `sessionStorage`.
  - **Access token:** JWT, 15-minute expiry (renewed via refresh).
  - **Refresh token:** Long-lived, stored in DB (sessions table), 7-day expiry.
  - **Secure flags:** `httpOnly: true`, `secure: true` (production), `sameSite: 'Strict'`, `path: '/'`.
- **Client fetch helper** — Use `apiFetch()` from `lib/storage.ts` for all API calls:
  ```typescript
  export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`/api/v1${path}`, {
      method: 'POST',
      credentials: 'include',  // Include cookies
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: options?.body,
    });
    if (res.status === 401) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        clearAccessToken();
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }
      return apiFetch(path, options);  // Retry
    }
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  ```
  - Automatically retries once on 401 (refresh token, then retry).
  - Clears auth state and redirects to `/login` on persistent 401.
- **Session state** — Stored server-side (DB sessions table):
  ```typescript
  export interface Session {
    id: string;
    userId: string;
    refreshToken: string;
    deviceName?: string;
    createdAt: Date;
    expiresAt: Date;
  }
  ```
- **Logout flow** — Clear refresh token from DB, clear access_token cookie, redirect to `/login`.
- **Setup flow** — On first visit, check `GET /api/v1/auth/status` (returns `setupComplete: boolean`):
  - If `false`, redirect to `/setup` (onboarding page).
  - POST to `/api/v1/auth/setup` with `{ username, password }` to initialize.
  - Generates JWT secret, encryption key, admin user, auto-logs in.
- **DB reset** — On DB corruption or forced reset, detect via API error and redirect to `/setup`, clearing local auth state.

## Imports and module organization

- **Import order** (strictly enforced):
  1. **Node.js builtins:** `import { existsSync } from 'fs'`.
  2. **React & Next:** `import React from 'react'`, `import { Hono } from 'hono'`, `import { useRouter } from 'next/navigation'`.
  3. **External packages:** `import { z } from 'zod'`, `import { db } from 'better-sqlite3'`.
  4. **Absolute imports** (`@/*`): `import { cn } from '@/lib/utils'`, `import { Button } from '@/components/ui/button'`.
  5. **Relative imports:** `import { helper } from './local'`, `import { config } from '../config'`.
- **Example (full):**
  ```typescript
  import { existsSync } from 'fs';
  import React from 'react';
  import { Hono } from 'hono';
  import { z } from 'zod';
  import { encrypt } from '@/lib/api/lib/encryption';
  import { Button } from '@/components/ui/button';
  import { helper } from './local';
  ```
- **Type imports** — Always use `import type` for types (satisfies lint performance):
  ```typescript
  import type { AppSettings, Transcript } from '@/lib/storage';
  ```
  - Avoid: `import { type Foo, Bar }` (mixed); prefer separate lines.
- **Named exports** — Default for modules with single export; named for utilities, helpers:
  - ✅ `export default function HomePage() { }` (pages).
  - ✅ `export function Button() { }` (reusable component).
  - ✅ `export const cn = () => { }` (utility).
- **Path alias** — Always use `@/*` when available; never use relative paths like `../../../lib/utils`:
  - ✅ `import { cn } from '@/lib/utils'`.
  - ❌ `import { cn } from '../../../lib/utils'`.
- **File extensions** — Omit `.ts`/`.tsx` in imports (handled by bundler):
  - ✅ `import { helper } from './local'` (finds `local.ts` or `local.tsx`).
  - ❌ `import { helper } from './local.ts'` (not needed).

## Types and naming

- **React components** — PascalCase:
  - ✅ `function HomePage() { }`, `export const NoteCard = ({ ... }) => { }`.
  - ❌ `function home_page() { }`, `const noteCard = () => { }`.
- **Functions & variables** — camelCase:
  - ✅ `const getUserSettings = () => { }`, `let pageTitle = ''`.
  - ❌ `const GetUserSettings = () => { }`, `let page_title = ''`.
- **Types & interfaces** — PascalCase; centralize in schema files:
  - ✅ `type Transcript = { ... }`, `interface ProviderConfig { ... }`.
  - ❌ `type transcript = { }`, `interface provider_config { }`.
  - Export from `lib/types.ts` or schema files for reuse.
- **Enum-like types** — Use discriminated unions or literal types (not `enum`):
  ```typescript
  // ✅ Discriminated union (tree-shakeable)
  type ProviderType = 'openai' | 'groq' | 'assemblyai';
  
  // ❌ Avoid enum (not tree-shakeable)
  enum ProviderType { OpenAI, Groq, AssemblyAI }
  ```
- **DTO alignment** — Keep frontend types (`lib/types.ts`) in sync with Drizzle schema exports (`lib/api/db/schema.ts`):
  ```typescript
  // Frontend
  export type Transcript = { id: string; text: string; provider: string; createdAt: Date };
  
  // Backend (Drizzle)
  export type DBTranscript = typeof transcripts.$inferSelect;
  ```
- **Avoid `any`** — Always be specific:
  ```typescript
  // ❌ Avoid
  const handler = (data: any) => { };
  
  // ✅ Use union or unknown + type guard
  const handler = (data: unknown) => {
    if (typeof data === 'object' && data !== null && 'id' in data) {
      const id = (data as { id: string }).id;
    }
  };
  ```
- **Generic naming** — Use descriptive type names:
  - ✅ `T extends BaseModel`, `Result<T>`, `ApiResponse<T>`.
  - ❌ `T1`, `T2`, `X`, `Y`.

## Error handling and logging

- **Try/catch pattern** — Wrap all async operations:
  ```typescript
  try {
    const data = await fetchData();
    return c.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch data:', message);
    return c.json({ error: message }, 500);
  }
  ```
- **Meaningful error messages** — For UI display, return specific, user-facing messages:
  - ✅ `{ error: 'Provider API key is invalid' }` (user-friendly).
  - ❌ `{ error: 'fetch failed' }` (vague).
- **Structured errors** — For API routes, always return `{ error: string }` with appropriate HTTP status:
  ```typescript
  // Missing required field
  if (!providerId) return c.json({ error: 'providerId is required' }, 400);
  
  // Unauthorized
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  
  // Not found
  if (!transcript) return c.json({ error: 'Transcript not found' }, 404);
  
  // Server error
  if (dbError) return c.json({ error: 'Database error' }, 500);
  ```
- **External API logging** — Log sanitized response bodies (never raw secrets):
  ```typescript
  try {
    const res = await fetch('https://api.openai.com/v1/models', { headers: { ... } });
    if (!res.ok) {
      const text = await res.text();
      console.error('OpenAI API error:', text.slice(0, 200));  // Log first 200 chars
      throw new Error('Failed to fetch models');
    }
    return res.json();
  } catch (error) {
    // Do NOT log the API response with secrets
  }
  ```
- **Do not swallow 401s** — Allow caller to handle auth errors:
  ```typescript
  // ❌ Wrong: silently defaults on 401
  const settings = await getSettings().catch(() => defaultSettings);
  
  // ✅ Correct: let caller handle 401
  if (res.status === 401) throw new Error('Unauthorized');
  ```
- **Retry logic** — Use `retryWithBackoff` utility for transient failures (network glitches, rate limits):
  ```typescript
  async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
      }
    }
    throw new Error('Retry failed');
  }
  ```

## Data validation and security

- **Input validation** — Always validate with `zod` before DB write or external API call:
  ```typescript
  import { z } from 'zod';
  
  const transcriptSchema = z.object({
    text: z.string().min(1, 'Text is required'),
    provider: z.enum(['openai', 'groq', 'assemblyai']),
    model: z.string().min(1, 'Model is required'),
  });
  
  const body = await c.req.json();
  const { text, provider, model } = transcriptSchema.parse(body);  // Throws if invalid
  ```
- **Secret handling** — Never log or commit raw API keys; use `encrypt`/`decrypt`:
  ```typescript
  import { encrypt, decrypt } from '@/lib/api/lib/encryption';
  
  // Store
  const encrypted = encrypt(apiKey);
  await db.insert(providers).values({ encryptedApiKey: encrypted });
  
  // Retrieve
  const { encryptedApiKey } = await db.query.providers.findFirst({ ... });
  const apiKey = decrypt(encryptedApiKey);
  ```
- **File uploads** — Validate MIME type and size on server; sanitize filename:
  ```typescript
  const file = await c.req.file('audio');
  if (!file) return c.json({ error: 'Audio file is required' }, 400);
  if (!file.type.startsWith('audio/')) return c.json({ error: 'Invalid file type' }, 400);
  if (file.size > 100 * 1024 * 1024) return c.json({ error: 'File too large' }, 400);
  ```
- **JWT & encryption keys** — Store in environment only (`.env`), never hardcode or commit to repo:
  - `JWT_SECRET` — Accessed via `keystore.getJwtSecret()`.
  - `ENCRYPTION_KEY` — Accessed via `keystore.getEncryptionKey()`.
- **Database credentials** — Default to `file:./data/clarity.db` (SQLite local file); for deployments, override via `DATABASE_PATH` env.
- **Secrets in .env** — Never commit `.env`; use `.env.example` with placeholder values.

## Styling specifics

- **Print styles** — Maintain `@media print { ... }` block in `app/globals.css` for PDF/export:
  ```css
  @media print {
    body { color-scheme: light; }
    .no-print { display: none; }
  }
  ```
- **Font variables** — Set on `<body>` class list in `app/layout.tsx`:
  ```typescript
  <body className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${lora.variable}`}>
    {children}
  </body>
  ```
  - Used in CSS: `font-family: var(--font-sans)`, `font-family: var(--font-mono)`, etc.
- **ProseMirror drag handles** — Keep existing drag-handle styles intact (`app/globals.css`); used for text editor drag-to-reorder functionality.
- **View transitions** — Preserved CSS for smooth page transitions; do not remove `view-transition-name` declarations.
- **Computed shadow section** — Do NOT edit the auto-computed shadow variables in `app/globals.css` (performance optimized).

## Performance considerations

- **Client effects** — Avoid blocking work in `useEffect`:
  ```typescript
  // ❌ Blocking API call without debounce
  useEffect(() => {
    const handleSearch = (query: string) => {
      apiCall(query);  // Fires on every keystroke
    };
  }, []);
  
  // ✅ Debounced API call
  useEffect(() => {
    const timer = setTimeout(() => apiCall(query), 300);
    return () => clearTimeout(timer);
  }, [query]);
  ```
- **Streaming & async** — Prefer streaming responses; keep payloads lean:
  ```typescript
  // ✅ Return only needed fields
  return c.json({
    id: note.id,
    title: note.title,
    updatedAt: note.updatedAt,
  });
  ```
- **React.Suspense & lazy loading** — Use for heavy client components:
  ```typescript
  import { lazy, Suspense } from 'react';
  const HeavyChart = lazy(() => import('./heavy-chart'));
  
  export function Dashboard() {
    return (
      <Suspense fallback={<div>Loading chart...</div>}>
        <HeavyChart />
      </Suspense>
    );
  }
  ```
- **Image config** — `unoptimized: true` in `next.config.mjs`; images NOT auto-optimized by Next.js, served as-is.
- **Bundle size** — Monitor imports; prefer tree-shakeable libraries (lodash-es over lodash).

## Accessibility and UX

- **Form controls** — Always pair `<label>` with input (even if visually hidden):
  ```typescript
  <label htmlFor='email' className='sr-only'>Email</label>
  <input id='email' type='email' />
  ```
- **Loading/empty/error states** — Provide user feedback:
  ```typescript
  if (loading) return <SkeletonLoader />;  // Mirror style from app/page.tsx
  if (error) return <ErrorMessage message={error} />;
  if (!data?.length) return <EmptyState />;
  return <DataTable data={data} />;
  ```
- **Radix UI** — Prefer Radix UI components when available (Dialog, Dropdown, Popover, etc.) for built-in a11y.
- **Reduced motion** — Respect `prefers-reduced-motion: reduce` in CSS:
  ```css
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }
  ```
- **Keyboard navigation** — Ensure interactive elements are focusable; maintain focus outlines (Tailwind's `focus-visible` class from globals.css).
- **Color contrast** — Use sufficient contrast ratios (WCAG AA minimum 4.5:1 for text).

## Data layer patterns

- **Database client** — Import from `lib/api/db/client.ts`:
  ```typescript
  import { db } from '@/lib/api/db/client';
  const note = await db.query.notes.findFirst({ where: eq(notes.id, id) });
  ```
- **Typed schema imports** — Use Drizzle query builders with typed schema:
  ```typescript
  import { notes, eq, and } from 'drizzle-orm';
  const note = await db.select().from(notes).where(eq(notes.id, id));
  ```
- **Filter operators** — Use Drizzle operators:
  - `eq(column, value)` — Equality.
  - `and(...conditions)` — All must be true.
  - `or(...conditions)` — Any can be true.
  - `inArray(column, values)` — Column in list.
  - `isNull(column)` — Null check.
  - `like(column, pattern)` — Pattern match (% wildcard).
- **Timestamps** — Store as integers (milliseconds), write with `Date.now()`:
  ```typescript
  await db.insert(notes).values({
    id: nanoid(),
    title: 'My Note',
    createdAt: Date.now(),  // integer (ms)
    updatedAt: Date.now(),
  });
  
  // Query (convert back to Date for frontend)
  const note = await db.query.notes.findFirst({ where: eq(notes.id, id) });
  note.createdAt; // number (ms) → convert: new Date(note.createdAt)
  ```
- **Soft deletes** — Use `deletedAt` field; filter in queries:
  ```typescript
  const activeNotes = await db
    .select()
    .from(notes)
    .where(isNull(notes.deletedAt));  // Exclude soft-deleted
  
  // Soft delete
  await db
    .update(notes)
    .set({ deletedAt: Date.now() })
    .where(eq(notes.id, id));
  ```
- **Type exports** — Export Drizzle-inferred types for frontend use:
  ```typescript
  // lib/api/db/schema.ts
  export type Note = typeof notes.$inferSelect;
  export type NewNote = typeof notes.$inferInsert;
  
  // Frontend
  import type { Note } from '@/lib/api/db/schema';
  const note: Note = { ... };
  ```
- **Batch operations** — Use Drizzle batch API for multiple inserts:
  ```typescript
  await db.batch([
    db.insert(notes).values(note1),
    db.insert(notes).values(note2),
  ]);
  ```

## Routing and pages

- **Page structure** — Routes live under `app/*`; use nested segment folders for layout grouping:
  ```
  app/
    layout.tsx          (root layout)
    page.tsx            (home)
    login/
      page.tsx
    notes/
      layout.tsx        (shared layout)
      page.tsx          (list)
      [id]/
        page.tsx        (detail)
  ```
- **Dynamic routes** — Use `[param]` for segments:
  - `app/notes/[id]/page.tsx` matches `/notes/123`.
  - Access via `params` prop: `export default function NotePage({ params }) { const { id } = params; }`.
- **Catch-all routes** — Use `[[...route]]` for Hono API:
  - `app/api/v1/[[...route]]/route.ts` catches all `/api/v1/**` requests.
- **API routes** — New routes outside `/api/v1` follow Next.js handler pattern:
  ```typescript
  export const runtime = 'nodejs';
  export const dynamic = 'force-dynamic';
  export async function POST(req: Request) {
    const body = await req.json();
    return Response.json({ ... });
  }
  ```
- **Route metadata** — Use `generateMetadata()` for dynamic page titles:
  ```typescript
  export async function generateMetadata({ params }): Promise<Metadata> {
    const note = await db.query.notes.findFirst({ where: eq(notes.id, params.id) });
    return { title: note?.title || 'Note' };
  }
  ```

## Client data flows

- **Navigation after status check** — Use `useEffect` for client-side redirects after auth/setup checks:
  ```typescript
  'use client';
  import { useEffect } from 'react';
  import { useRouter } from 'next/navigation';
  
  export function HomePage() {
    const router = useRouter();
    
    useEffect(() => {
      const check = async () => {
        const res = await fetch('/api/v1/auth/status');
        const { setupComplete } = await res.json();
        if (!setupComplete) router.push('/setup');
      };
      check();
    }, [router]);
    
    return <div>Content...</div>;
  }
  ```
- **Router usage** — Always use `useRouter` from `next/navigation` (not `next/router`):
  - `router.push(path)` — Navigate.
  - `router.back()` — Go back.
  - `router.refresh()` — Revalidate server data.
- **Use client sparingly** — Only mark components with `'use client'` if they truly need interactivity:
  - ✅ `'use client'` for forms, buttons with handlers.
  - ❌ `'use client'` for static content (unnecessary performance hit).

## File handling and uploads

- **Upload endpoints** — Create under `app/api/upload(s)`:
  ```typescript
  // app/api/upload/route.ts
  export const runtime = 'nodejs';
  export const dynamic = 'force-dynamic';
  
  export async function POST(req: Request) {
    const formData = await req.formData();
    const file = formData.get('audio') as File;
    if (!file) return Response.json({ error: 'File required' }, { status: 400 });
    // Handle upload...
  }
  ```
- **File persistence** — Serve from `/uploads/*` (rewrites to `/api/uploads/:path*`):
  - Files stored at project root `/uploads/` or configured path.
  - Access via `/uploads/filename` in browser.
- **Validation** — Check MIME type, size, and presence on server (mirror `aiRoutes` pattern):
  ```typescript
  if (!file) return c.json({ error: 'File required' }, 400);
  if (!file.type.startsWith('audio/')) return c.json({ error: 'Invalid type' }, 400);
  if (file.size > 100 * 1024 * 1024) return c.json({ error: 'Too large' }, 400);
  ```

## Dependencies and external services

- **AI Providers** — Supported: **OpenAI**, **Groq**, **AssemblyAI**.
  - Model fetching logic in `lib/api/routes/ai.ts`.
  - Endpoint: `POST /api/v1/ai/models` (returns list of available models).
  - Provider API keys encrypted and stored in DB (providers table).
- **External packages** — Respect `serverExternalPackages` in `next.config.mjs`:
  - Currently: `['better-sqlite3']` (native module).
  - Add native deps to this list if introducing new C++ bindings.
- **Analytics** — Vercel Analytics included via `<Analytics />` in `app/layout.tsx`; do NOT remove.
- **Radix UI** — All interactive components from Radix UI (@radix-ui/react-*); prefer over custom elements.
- **Tailwind CSS** — v4 with postcss plugin; no manual CSS variable updates (handled by build).

## Git and review hygiene

- **No secrets in commits** — Never commit `.env`, API keys, or credentials.
  - `.env` is in `.gitignore`; use `.env.example` for templates.
  - Data files in `data/` (SQLite, uploads) ignored.
- **Scoped changes** — Keep commits focused (one feature/fix per commit).
  - ❌ Avoid "Update everything" commits.
  - ✅ "Add user settings API endpoint" or "Fix auth token refresh loop".
- **Formatting-only commits** — Avoid commits that only reformat code; include functional changes.
- **Update AGENTS.md** — If adding new conventions or patterns, update this file so future agents follow them.
- **No commits by default** — Follow user instructions for commit requests (explicitly ask: "commit this change").

## Delivery checklist

- **Lint** — Run `npm run lint` after changes to TS/TSX files; fix all violations.
- **Build** — Run `npm run build` if modifying Next config, server code, or DB schema; verify standalone output.
- **Manual testing** — Validate key flows since no test suite exists:
  - Auth: login, logout, setup, token refresh.
  - Onboarding: initial setup, provider config, API key validation.
  - Transcription: upload audio, select provider/model, process.
  - Notes: create, edit, publish, view.
- **Environment variables** — If adding new env vars, document in `.env.example` (but don't commit secrets).
- **Docker** — Keep `docker-compose.yml` and README instructions in sync with local dev steps.
- **DB migrations** — If schema changes, run `npm run db:generate` and verify migration files created.
- **Browser check** — Test in latest Chrome/Firefox (mobile responsive if applicable).

## Contact points and references

- **Unclear patterns?** — Inspect relevant files before editing:
  - API routes: `lib/api/routes/*` (auth.ts, ai.ts, notes.ts).
  - Components: `components/ui/*` (Button, Dialog, Input).
  - Styling: `app/globals.css` (CSS variables, utilities, print).
  - Schema: `lib/api/db/schema.ts` (table definitions, relationships).
- **Mirror existing patterns** — When adding new sections, follow established conventions rather than introducing new abstractions.
- **Questions about OpenCode?** — Refer to https://opencode.ai/docs or report issues at https://github.com/anomalyco/opencode.
