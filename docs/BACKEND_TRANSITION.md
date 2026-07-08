# Backend Integration Guide

## Architecture

- **FE (clothes-shop)**: Next.js App Router — `localhost:3000`
- **BE (clothes-shop-api)**: NestJS + PostgreSQL — `localhost:7001`
- **Communication**: HTTP `fetch()` from FE → BE

## Environment

```bash
# .env
NEXT_PUBLIC_API_URL=http://localhost:7001
```

## API Endpoints (BE)

| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `/api/products` | `{ data: Product[], total }` |
| GET | `/api/products?category=tops` | Filtered products |
| GET | `/api/products?badge=new` | Products by badge |
| GET | `/api/products/:id` | `{ data: Product, related: Product[] }` |
| GET | `/api/categories` | `{ data: Category[], uiConfigs, total }` |
| GET | `/api/categories?slug=tops` | `{ data: Category, uiConfig }` |
| GET | `/api/collections` | `{ data: Collection[], total }` |
| GET | `/api/collections?slug=xxx` | `{ data: Collection, products: Product[] }` |
| GET | `/api/reviews/:productId` | `{ data: Review[], total }` |
| GET | `/api/shipping` | `{ data: ShippingInfo }` |
| GET | `/api/size-guides/:category` | `{ data: SizeGuide }` |

## Data Fetching

### Server-side (SSR/SSG)
- File: `src/app/(public)/shop/_lib/server-fetchers.ts`
- Used by `page.tsx` (Server Components)
- Uses `fetch()` with `next.revalidate` for ISR

### Client-side (SWR)
- File: `src/hooks/use-api.ts`
- Used by client components (reviews, dynamic filters, etc.)
- Uses SWR for caching + background revalidation

## Running Locally

```bash
# Terminal 1 — BE
cd clothes-shop-api
yarn dev   # → localhost:7001

# Terminal 2 — FE
cd clothes-shop
yarn dev   # → localhost:3000
```

## Production Deployment

Update `NEXT_PUBLIC_API_URL` to the production BE URL:
```bash
NEXT_PUBLIC_API_URL=https://api.oribaebi.com
```
