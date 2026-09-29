# PlanPal Frontend

React and TypeScript single-page app for PlanPal.

## Setup

```bash
cd frontend
npm install
cp .env.example .env               # VITE_API_BASE_URL=http://localhost:5000
npm run dev                        # http://localhost:5173
```

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Type-check, then production build |
| `npm run typecheck` | TypeScript only |
| `npm run lint` | ESLint |
| `npm test` | Vitest suite |

## Structure

```text
src/
  api/          One client per API area (auth, events, search, notifications, tags, users)
  services/     Axios instance with token refresh; token storage
  context/      Session (AuthContext) and theme
  components/   Route guards, layout, shared UI, event form
  pages/        Route pages
  schemas/      Zod schemas that define the API data types
  hooks/        useApi, usePagination, useDebounce
  utils/        Dates, validators, error messages, prices, cross-page refresh
  __tests__/    Vitest suite
```

## Notes

- The session is restored on page load if either stored token is still valid; an expired
  access token is renewed automatically.
- Form rules and field limits in `utils/validators.ts` mirror `backend/app/utils/validators.py`.
- Dates are exchanged with the API in UTC and shown in the viewer's local time zone.
- `/admin/tags` is available to users with the admin role.
