# Shopping Cart

## Quick start

### With Docker

```bash
docker compose up --build
# → http://localhost:4321
```
`node` user with a healthcheck on `/api/products`.

### Locally

```bash
npm ci
npm run dev        # dev server at http://localhost:4321
npm test           # unit + integration tests
npm run build && npm start   # production build
```

## Architecture

The project follows a layered DDD structure.

```
src/
├── domain/                  # Pure business logic — no framework imports
│   ├── shared/              #   Result<T,E>, DomainError, Money, Quantity value objects
│   ├── product/             #   Product aggregate + ProductId + repository interface
│   └── cart/                #   Cart aggregate + CartItem + repository interface
├── application/             # Use cases orchestrating aggregates + repositories
│   ├── product/ProductService.ts
│   └── cart/CartService.ts
├── infrastructure/          # Concrete adapters
│   ├── persistence/         #   In-memory repositories (swap point for a real DB)
│   └── container.ts         #   Composition root / dependency wiring + seed data
├── presentation/http.ts     # HTTP edge: body parsing, DomainError → status mapping
├── pages/api/               # Astro API routes (thin controllers)
└── pages/index.astro        # Shopping-cart UI
tests/
├── unit/                    # Domain + application tests (in-memory, no HTTP)
└── integration/             # Full request → response tests against the API routes
```

## API reference

All bodies are JSON. Errors have the shape
`{ "error": { "code", "message", "details?" } }`.

### Products

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/products` | List all products |
| `POST` | `/api/products` | Add a product — `{ name, description?, priceCents, currency?, stock }` |
| `GET` | `/api/products/:id` | Fetch product details |
| `PUT` | `/api/products/:id` | Update details (partial) — any of `name, description, priceCents, currency, stock` |
| `DELETE` | `/api/products/:id` | Delete a product |

### Cart

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/cart` | View cart (items, per-line subtotal, total) |
| `POST` | `/api/cart/items` | Add item — `{ productId, quantity }` (merges with existing line) |
| `PUT` | `/api/cart/items/:productId` | Set quantity — `{ quantity }` |
| `DELETE` | `/api/cart/items/:productId` | Remove item |

## Testing

```bash
npm test                # everything (75 tests)
npm run test:unit       # domain + application
npm run test:integration
```
