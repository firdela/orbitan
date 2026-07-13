---
title: Orbitan Development Rules
category: Development
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - TestingStandards.md
  - ReleaseProcess.md
  - ../Architecture/EngineeringPrinciples.md
  - ../Architecture/APIStandards.md
tags:
  - development
  - coding-standards
  - file-structure
  - imports
  - base44
  - react
  - tailwind
---

# Orbitan Development Rules

## Purpose

Contains all Base44 development rules, coding standards, file structure, import conventions, and build reliability guidelines.

## Stack

- **UI Framework:** React + Tailwind CSS
- **Component Library:** shadcn/ui (`@/components/ui`)
- **Routing:** React Router (`react-router-dom`)
- **State & Data:** TanStack Query (`@tanstack/react-query`)
- **Backend Interface:** Base44 SDK (`@/api/base44Client`)
- **Platform-Agnostic Layer:** OrbitCore (`@/lib/orbit-core`)
- **Icons:** `lucide-react` (only)
- **Charts:** `recharts`
- **Forms:** `react-hook-form`
- **Dates:** `date-fns`, `moment`
- **Animations:** `framer-motion`

## File Structure

```
src/
├── pages/          # Page components (jsx, subfolders ok)
├── components/     # Shared components (jsx, subfolders ok)
│   └── ui/         # shadcn/ui primitives
├── lib/            # Shared libraries, hooks, utils
│   ├── orbit-core.js     # Platform-agnostic adapter
│   ├── orbitan-config.js # Platform configuration
│   ├── orbitan-identity.js # Brand identity
│   ├── AuthContext.jsx   # Auth context
│   ├── utils.js          # cn() and utilities
│   └── query-client.js   # TanStack Query client
├── api/
│   └── base44Client.js    # Pre-initialized SDK
├── hooks/          # Custom hooks
├── utils/          # Utility functions
└── App.jsx         # Router

base44/
├── entities/       # JSON Schema entity definitions (.jsonc)
├── functions/      # Backend functions (entry.ts)
└── agents/         # AI agent configurations (.jsonc)
```

## Import Conventions

- **Always use `@/` alias** for imports — never relative `src/` paths (they break on moves)
- `cn` comes from `@/lib/utils` (import { cn } from "@/lib/utils")
- `createPageUrl` comes from `@/utils`
- Each shadcn component imported from its own file (Label from `@/components/ui/label`)
- One ui file never re-exports another
- Lucide icons: alias if colliding with page/component names (`import { Home as HomeIcon } from "lucide-react"`)
- Import only names the target file actually exports

## Component Standards

- Export every page/component as default, named same as its file
- Small focused files (50 lines or less per component)
- Every new component/page gets its own file
- shadcn/ui from `@/components/ui`
- Tailwind CSS for styling
- Lucide icons only — a nonexistent icon breaks the app
- Every import must resolve to a real file or package

## Build Reliability

### Common Build Breakers (Avoid All)

1. **ESM only.** Never use `require()` or `module.exports` — this is a Vite ESM project
2. **cn from `@/lib/utils`** — never import from `@/utils` and never write your own
3. **Each shadcn file exports only its own primitives** — import each from its own file
4. **Never import a name that collides with a local declaration** — alias lucide icons
5. **Import only names the target file actually exports**
6. **Prefer `@/` alias imports** over relative paths
7. **A missing-import or unresolved-import WARNING means the app is broken** — fix immediately
8. **JSX only in `.jsx`/`.tsx` files** — never in `.js`
9. **Hooks called only at component top level** — never conditionally, in loops, or inside handlers
10. **`@apply` in index.css only with classes tailwind.config.js defines**

## Tailwind Class Rules

- Write Tailwind classes as **literal strings** — the build purges dynamic names
- `bg-${color}-500` silently disappears — use full class names
- `safelist` in `tailwind.config.js` only for runtime-sourced values, never for classes in source

## Routing

- `src/App.jsx` is the application router
- `<Routes>` may contain ONLY `<Route>` elements as direct children
- Never rewrite `src/App.jsx` wholesale — edit surgically
- Each new page gets exactly one new `<Route>`
- Use `<Link to="/path">` with route paths from `src/App.jsx`
- Main/home page on `/` only

## Entity SDK

```js
import { base44 } from '@/api/base44Client';

base44.entities.Todo.list()
base44.entities.Todo.list('-updated_date', 20)  // sort, limit
base44.entities.Todo.filter({status: 'active'}, '-created_date', 10)
base44.entities.Todo.create({title: "Todo 1"})
base44.entities.Todo.bulkCreate([{title: "A"}, {title: "B"}])
base44.entities.Todo.update(todo.id, {description: "new"})
base44.entities.Todo.delete(todo.id)
base44.entities.Todo.deleteMany({status: "archived"})
base44.entities.Todo.subscribe((event) => { /* realtime */ })
```

## Auth SDK

```js
base44.auth.me()                    // current user
base44.auth.isAuthenticated()      // Promise<boolean>
base44.auth.updateMe(data)          // persist extra data
base44.auth.logout(redirectUrl?)    // logout + redirect
base44.auth.redirectToLogin(nextUrl?) // redirect to login
base44.users.inviteUser(email, role) // invite user
```

## Integrations SDK

```js
base44.integrations.Core.InvokeLLM({ prompt, response_json_schema, add_context_from_internet })
base44.integrations.Core.UploadFile({ file })
base44.integrations.Core.SendEmail({ to, subject, body })
base44.integrations.Core.GenerateImage({ prompt })
base44.integrations.Core.GenerateSpeech({ text, voice })
base44.integrations.Core.GenerateVideo({ prompt })
base44.integrations.Core.ExtractDataFromUploadedFile({ file_url, json_schema })
```

## Backend Functions

```js
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    // business logic
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
```

## Backend Function Rules

- Everything inside `Deno.serve(async (req) => { ... })`
- Return Response objects, not strings
- `await` every Base44 SDK call
- Validate user auth with `base44.auth.me()`
- No local imports between functions — each deploys independently
- Use `npm:` prefix for external packages with version
- Admin-only functions verify `user.role === 'admin'` and return 403

## OrbitCore Adapter (New Code)

All new modules import from `@/lib/orbit-core` instead of `@/api/base44Client` directly:

```js
import { OrbitCore } from '@/lib/orbit-core';

OrbitCore.auth.me()
OrbitCore.data.list('EntityName')
OrbitCore.data.create('EntityName', data)
OrbitCore.services.invoke('functionName', payload)
```

This creates a single migration point when switching platforms.

## Related Documents

- [TestingStandards.md](./TestingStandards.md) — Testing strategy
- [ReleaseProcess.md](./ReleaseProcess.md) — Release workflow
- [../Architecture/EngineeringPrinciples.md](../Architecture/EngineeringPrinciples.md) — Engineering principles
- [../Architecture/APIStandards.md](../Architecture/APIStandards.md) — API standards