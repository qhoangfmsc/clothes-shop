# Backend Transition Guide

This document explains how to move from the current **Simulated Backend (Mock API)** to a **Real Production Backend**.

## Current Architecture
- **Simulated BE**: Next.js API Routes in `src/app/api/`.
- **Data Source**: Hardcoded files in `src/app/api/*/data.ts`.
- **Frontend Fetching**: `server-fetchers.ts` uses `fetch()` to call these local routes. It includes a "Smart Fallback" for the build process.

## When you have a Real Backend Project

### 1. Update Environment Variables
Update your `.env.local` or deployment platform variables:
```bash
NEXT_PUBLIC_API_URL="https://api.your-production-domain.com"
```

### 2. Clean up `server-fetchers.ts`
Once you have a real BE that is always online, you can simplify [server-fetchers.ts](file:///Users/quochoang/Documents/Projects/clothes-shop/src/app/(public)/shop/_lib/server-fetchers.ts):
- **Remove** all imports from `@/src/app/api/.../data`.
- **Remove** the `try/catch` fallback logic in `apiFetch`.
- Keep only the pure `fetch()` logic.

### 3. Remove Mock BE Folders
You can safely delete these directories:
- `src/app/api/products/`
- `src/app/api/categories/`
- `src/app/api/collections/`
- `src/app/api/reviews/`
- etc.

### 4. Update Types
Ensure the types in `src/types/` match your real Backend's JSON response structure.

## Deployment Notes
During the build process (`next build`), your real Backend **must be accessible** via the `NEXT_PUBLIC_API_URL` because the `generateStaticParams` functions will call it to pre-render the shop pages.
