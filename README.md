# SOFA.MENU

SOFA.MENU includes a QR menu, restaurant pages, and staff tools. The existing `sofa-menu` Render service builds and serves the QR menu and its contact dialog. The full client and its supporting routes are kept in the repository for a separate staff deployment.

## Guest routes on Render

| Route | Guest experience |
| --- | --- |
| `/` | Opens SOFA Signature’s menu |
| `/r/:slug` | Opens that restaurant’s menu |
| `/r/:slug/menu` | Video, category selection, search, prices, and dish details |
| `/r/:slug/menu?table=12&dish=<id>` | Table QR, optional dish deep link, and ordering for enabled tables |
| `/r/:slug/contact` | Opens the contact dialog over the menu |

The root and older QR links preserve both `table` and `dish` on redirect. The guest service returns HTTP 404 for staff pages and excludes their route handlers and browser modules. The catalog uses the existing preview password. The three new local stock videos and their credits are available under `/media/sofa-signature/`. See [media credits](client/public/media/sofa-signature/sources.html) and the [menu photo audit](docs/signature-menu-media-audit.md).

## Local development

Use Node.js 20 or later, npm, and a disposable PostgreSQL database for testing the Render setup.

```sh
npm ci
export DATABASE_URL='postgresql://USER:PASSWORD@localhost:5432/sofa_dev'
npx prisma generate --schema server/prisma/schema.postgresql.prisma
node server/scripts/deploy-migrations.js
npx tsx server/src/seed.ts
npm run build:server
npm run build:client
npm start
```

Demo seeding replaces data in the database it targets. Run it only on a disposable development database. The server at [localhost:5000](http://localhost:5000/r/sofa-signature) serves both the built client and API. To work with Vite, run `npm run server` and `npm run client` in separate terminals. The SQLite schema remains available for local development through `npm run db:generate` and `npm run db:push`.

To run the Render guest entry locally after installing dependencies, set `DATABASE_URL`, run `npm run build:render:guest`, then run `npm run start:render:guest`. The guest HTML and media are served from `client/dist-guest`. The regular client build remains in `client/dist`.

Use a disposable database when running the test suite.

```sh
npm test
npm run build:render:guest
npx prisma validate --schema server/prisma/schema.postgresql.prisma
npx prisma migrate diff --from-schema-datasource server/prisma/schema.postgresql.prisma --to-schema-datamodel server/prisma/schema.postgresql.prisma --exit-code
```

## Restaurant configuration

On the full server, authorized owners and managers can update restaurant settings through `PATCH /api/restaurants/:restaurantId`. The existing dashboard still manages its original settings and menu fields.

- Set `menu_ordering_enabled` to `false` for a view-only menu. Table ordering is preserved by default for existing restaurants.
- Set `delivery_enabled`, `delivery_fee` in UZS, and optionally `delivery_card_enabled`. New and migrated restaurants start with delivery disabled.
- Configure `hero_image`, `hero_video`, `menu_hero_video`, and `gallery_images` using persistent media URLs. SOFA Signature’s guest playlist and phone and Telegram links are scoped to that restaurant. Contact settings for other restaurants accept `instagram_url`, `telegram_url`, `google_maps_url`, and `yandex_maps_url`. Opening hours, tagline, and address support optional `_en` and `_ru` variants.
- Reservations default to `Asia/Tashkent` and use configured working hours. `reservation_hours` accepts a JSON string containing weekday numbers (Sunday = 0) and a list of opening and closing time pairs, for example `{"1":[["11:00","22:00"]]}`. The guest form uses configured reservation areas or active table sections.
- Authorized staff can list reservations at `GET /api/admin/restaurants/:id/reservations` and change status with `PATCH /api/admin/restaurants/:id/reservations/:reservationId/status`. Reservation management has no new dashboard UI in this release.
- Use `GET /api/tables/restaurants/:id/qr?target=home|menu|table&format=png|pdf` with staff authentication. Add `table=12` for a table QR. Existing stored table records are retained, and the table list returns QR images using the configured public URL.
- Menu views and dish opens increment per-restaurant daily counters. The staff analytics API exposes those counts without storing guest identifiers.

## Render deployment

SOFA uses the existing `sofa-menu` Render service and PostgreSQL database on branch `release/render-preview`. The build command is `npm ci --include=dev && npm run build:render:guest`. The start command is `npm run start:render:guest`. Existing Render configurations that call `build:render` and `start:render` use the same guest commands. Startup applies versioned migrations and starts the app on `0.0.0.0:$PORT`. Existing databases initialized with `db push` are baselined only if Prisma confirms their schema matches the original release. Schema drift stops startup before applying migrations. Production startup never seeds the database.

| Environment variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Existing Render PostgreSQL connection string |
| `JWT_SECRET` | Strong staff signing secret, at least 32 characters |
| `PREVIEW_PASSWORD` | Private production preview password, at least 24 characters |
| `PUBLIC_APP_URL` | Absolute HTTPS origin encoded into generated QR links |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | Dedicated SOFA Storage project and public-read media bucket. Production uploads require these settings. |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` | Bot secret and independently generated 32–256 character URL-safe webhook secret |
| `TELEGRAM_DESTINATIONS_JSON` | Map of tenant slugs to authorized Telegram chat IDs and optional staff user IDs |
| `TELEGRAM_RESTAURANT_SLUG`, `TELEGRAM_CHAT_ID`, `TELEGRAM_STAFF_USER_IDS` | Alternative single-restaurant notification destination |

Set secrets through Render. The storage and Telegram variables below apply to the full server. Use a dedicated SOFA storage bucket and migrate any legacy files served from ephemeral storage before replacing their URLs. The configured recipient must start the bot, or add it to the intended staff group. Use numeric chat IDs as strings. For example, the shape for multiple tenants is `{"restaurant-slug":{"chat_id":"<chat-id>","staff_user_ids":["<user-id>"]}}`. Register the bot webhook at `/api/integrations/telegram/webhook` with the configured secret as Telegram's `secret_token`. Only configured staff can use inline confirmation and rejection. A reservation stays saved when a Telegram request fails, and retryable delivery attempts are retried in the background.

The preview remains password-protected. Rotate legacy demo staff passwords before any separately approved public launch. Use `/api/health` to confirm the deployed commit and the `guest-menu` build target.
