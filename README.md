# 🍲 RecipeVault

**RecipeVault** is an open-source, ad-free, local-first recipe manager, weekly meal planner, and
smart grocery list builder. Import recipes from any website URL, paste raw text, or write your own
— RecipeVault strips away the ads and life stories, organizes everything by tag, schedules your
week, and automatically builds a categorized grocery list from whatever you've planned to cook.

Everything is stored **100% locally in your browser** via IndexedDB. There are no accounts, no
tracking, and no server-side database for your recipes — your data never leaves your device.

## ✨ Features

### Recipe Importer & Library (`/recipes`)
- **One-click URL import** — paste a link and RecipeVault fetches the page server-side and parses
  its `schema.org/Recipe` JSON-LD (with a microdata fallback) into a clean, structured recipe:
  title, image, servings, prep/cook time, ingredients, and step-by-step instructions.
- **Paste-text import** — no structured data on the page? Paste the raw recipe text and a heuristic
  parser splits it into ingredients and instructions automatically.
- **Searchable, taggable grid** with built-in tags (Breakfast, Quick 15-Min, Dinner, Vegetarian,
  Vegan, Gluten-Free, and more) plus favoriting.
- **Ranked search** across titles, tags, and ingredients, with sorting (recently updated, A–Z,
  quickest first, most servings), per-tag counts, and result totals.
- **Duplicate detection** — re-importing a recipe you already saved offers to open the existing
  copy instead of silently creating another.
- **Cook Mode** — a distraction-free, full-screen step-by-step view with:
  - A **screen wake-lock toggle** so your phone/tablet doesn't sleep mid-recipe.
  - An interactive **ingredient checklist**.
  - A **dynamic serving-size multiplier** that rescales every ingredient quantity in real time
    (including fractions, like scaling "1/2 cup" for 6 servings instead of 4).
  - Jumpable step dots, arrow-key navigation, and a **Done** state on the final step.
- **Deep quantity scaling:** amounts written inside the ingredient text scale too — `(960mL)` →
  `(2400mL)`, `(360g)` → `(900g)`, `or 8 pieces` → `or 20 pieces`. Oven temperatures (`350F`),
  times (`25 minutes`), pan sizes (`9x13 inch`), percentages (`2% milk`), and names with digits
  (`V8`) are deliberately left untouched.
- Quick scale presets (½×, 1×, 2×, 3×), a reset button, and **copy ingredients** to the clipboard.

### Weekly Meal Planner (`/planner`)
- A **drag-and-drop, Monday–Sunday grid** for Breakfast, Lunch, and Dinner.
- Drag any recipe from your vault straight onto a day/meal slot, or drag scheduled meals between
  slots to reschedule them.
- **Copy Last Week** to repeat a plan, clear a single day, and see servings on every planned meal.
  Today's column is highlighted.
- One click to **generate a grocery list** from everything currently planned for the week.

### Smart Grocery List Generator (`/grocery`)
- **"Generate List from Week"** collects every ingredient from your scheduled meals, scaled to the
  servings you planned.
- **Ingredient aggregation** merges duplicates — "2 eggs" from one recipe and "3 eggs" from another
  become a single "5 eggs" line. Singular/plural spellings are matched too ("1 carrot" + "2 carrots").
- **Unit-aware merging:** "2 cups milk" and "500 ml milk" are reconciled through a shared base unit
  into one line, instead of being listed twice. Genuinely incompatible units ("2 cloves" vs
  "1 head") correctly stay separate, and volume is never mixed with mass.
- Each line shows **which recipes it's for**, so you know what you'd be dropping if you skip it.
- **Aisle categorization** automatically files items under Produce, Meat & Seafood, Dairy & Eggs,
  Bakery, Pantry, Frozen, Spices & Condiments, or Beverages.
- A **mobile-friendly checklist** with tap-to-cross-off items, manual item entry, and progress
  tracking.
- **Nearby prices:** save your shopping address in Settings, then tap any grocery item to see
  stores near you and current flyer prices. Tap a price to open that store's website, or tap
  **Directions** to open the store in Maps.
- **Share or copy** the whole list, grouped by aisle, straight into Messages/Notes.
- Works in **Canada and the US** — Canadian postal codes, CAD pricing, distances in km, and
  Canadian banners (Loblaws, No Frills, Sobeys, Metro, Food Basics, IGA, FreshCo, Save-On-Foods,
  Shoppers, Walmart.ca, Costco.ca).

### Install as a real app (PWA)
RecipeVault is a Progressive Web App. After you open it once in a browser, you can install it:

- **iPhone / iPad (Safari):** Share → **Add to Home Screen**.
- **Android (Chrome):** the install banner, or the ⋮ menu → **Install app**.
- **Desktop (Chrome / Edge):** the install icon in the address bar.

Once installed it opens full-screen (no browser chrome), keeps working offline via a service
worker, and still stores every recipe in IndexedDB on that device. Use **Settings → Backup**
before switching phones.

### Everything else
- Full **light/dark theme** support (follows system preference, with a manual toggle).
- Clean, responsive, mobile-first UI with a phone tab bar and desktop top nav.
- **Local-first & offline-capable** — once loaded, RecipeVault works without a network connection.
- **Print & share** any recipe from the detail page.

## 🏗️ Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + shadcn-style UI primitives (Radix UI) |
| Icons | lucide-react |
| Local storage | IndexedDB via [Dexie.js](https://dexie.org/) + `dexie-react-hooks` |
| Recipe scraping | Cheerio (JSON-LD / microdata `schema.org/Recipe` parser) |
| Ingredient parsing | Custom quantity/unit/fraction parser + aggregator |

## 📁 Project Structure

```
/src
  /app
    /recipes            Recipe library, detail, edit & "new recipe" pages
    /planner            Weekly drag-and-drop meal planner
    /grocery            Smart grocery checklist
    /api/scrape         Server route that fetches + parses a recipe URL
    /api/health         Health check endpoint
  /components
    recipe-card.tsx      Recipe grid card
    url-importer.tsx      URL/paste-text recipe importer
    cook-mode-modal.tsx    Full-screen cook mode (wake lock, scaling, checklist)
    weekly-grid.tsx        Drag-and-drop weekly planner grid
    grocery-checklist.tsx  Categorized, checkable grocery list
    recipe-form.tsx        Create/edit recipe form
    /ui                   shadcn-style primitives (button, dialog, tabs, ...)
  /lib
    /scraper             JSON-LD & microdata recipe extractor (server-side)
    /parser              Ingredient quantity/unit parsing, scaling & aggregation
    /db                  IndexedDB (Dexie) client + CRUD helpers
  /types                 Shared TypeScript interfaces (Recipe, Ingredient, MealPlanEntry, ...)
```

## 🚀 Local Development

**Requirements:** Node.js 20+, npm.

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000). No database setup is
required for the app's core functionality — recipes, meal plans, and grocery lists all live in
your browser's IndexedDB.

> ℹ️ This project template ships with a PostgreSQL connection (via Drizzle ORM) that's used only
> for the `/api/health` endpoint. It's infrastructure scaffolding from the starter template and is
> **not** required by any RecipeVault feature — feel free to remove it entirely for your own fork.

### Useful scripts

```bash
npm run dev           # Start the Next.js dev server
npm run build         # Production build
npm run start         # Start the production server (after building)
npm run lint          # Run ESLint
npm run typecheck     # Run the TypeScript compiler in --noEmit mode
npm test              # Run the unit test suite (Vitest)
npm run test:watch    # Tests in watch mode
npm run test:coverage # Coverage summary
```

## 🧪 Tests

The parsing, scaling, merging, and scraping logic is the heart of RecipeVault, and it handles
genuinely messy real-world input — so it's covered by **78 unit tests**:

| Area | File |
| --- | --- |
| Ingredient parsing, scaling, fraction formatting | `src/lib/parser/ingredients.test.ts` |
| Grocery merging, unit reconciliation, aisles | `src/lib/parser/aggregate.test.ts` |
| Metric ⇄ US conversion and round-tripping | `src/lib/parser/units.test.ts` |
| Timer detection, ISO durations, pasted text | `src/lib/parser/misc.test.ts` |
| JSON-LD (`@graph`, `HowToSection`) & microdata extraction | `src/lib/scraper/scraper.test.ts` |

These cover the edge cases that are easy to break and hard to eyeball: unicode fractions (`½`),
mixed numbers (`1 1/2`), ranges, `@type` arrays, malformed JSON-LD with trailing commas, and the
rules about what must *never* be scaled (oven temps, times, pan sizes, `V8`).

GitHub Actions runs lint, typecheck, tests, and a production build on every push and PR
(`.github/workflows/ci.yml`). See [CONTRIBUTING.md](./CONTRIBUTING.md).

## 🐳 Docker

A multi-stage `Dockerfile` and `docker-compose.yml` are included for self-hosting:

```bash
docker compose up --build
```

This builds a production image of RecipeVault and runs it on
[http://localhost:3000](http://localhost:3000), alongside the optional PostgreSQL container used
by the health check.

## ☁️ Deploying to Vercel

1. Push this repository to GitHub (or your Git host of choice).
2. In [Vercel](https://vercel.com/new), import the repository.
3. Framework preset: **Next.js** (auto-detected).
4. Add a `DATABASE_URL` environment variable (any reachable Postgres connection string satisfies
   the health check — e.g. a free [Neon](https://neon.tech) or [Supabase](https://supabase.com)
   database). RecipeVault's recipe/planner/grocery data does **not** use this database.
5. Deploy. Since all app data lives in the visitor's browser, no further configuration is needed.
6. If you use a custom domain (Duck DNS, etc.), add that domain in the Vercel project **Domains**
   settings and set `NEXT_PUBLIC_SITE_URL` to the public HTTPS URL, e.g.
   `https://recipevault.duckdns.org`. Icons and the web manifest use this as their base.
7. Open the live **HTTPS** URL on your phone and use **Add to Home Screen** / **Install app**.
   After deploying icon changes, delete the old home-screen icon and add it again — iOS caches
   the first icon it saw and will not refresh it on its own.

Site icons are static files at the domain root (this is what Safari looks for):

- https://your-domain/icon.png
- https://your-domain/apple-touch-icon.png
- https://your-domain/favicon.ico

If those URLs 404, the tab and home-screen icons will be blank. Confirm the Duck DNS name is
attached to the Vercel project (CNAME to `cname.vercel-dns.com`), not to a raw IP.

## 🍎 Running fully offline on iOS (no App Store)

RecipeVault's promise is "ad-free, local-first, works offline." On iOS that takes three
specific things — all handled in-app, and all verifiable under **Settings → Offline readiness**.

**1. Add to Home Screen.** In Safari: **Share → Add to Home Screen**. This is not cosmetic on iOS.
Home-screen web apps launch full-screen, get their own storage bucket, and are exempt from the
browser data cleanup that applies to ordinary tabs.

**2. Persistent storage.** WebKit deletes script-writable storage (including IndexedDB) after
roughly **7 days of not opening a site**. For a recipe vault that would be data loss. The app
calls `navigator.storage.persist()` on launch, and Settings shows whether it was granted plus how
much space your data uses.

**3. A real offline app shell.** The service worker precaches every static route *and* scrapes
each page's HTML for the hashed `/_next/static/...` bundles it needs, then caches those too.
Without this step the HTML loads offline but the JavaScript doesn't, and you get a blank screen.
Recipe detail pages are also cached as you open them. Use **Save app for offline** in Settings to
force a full download before you travel.

### What works with the network completely off

| Works offline | Needs a connection |
| --- | --- |
| Recipe library, search, tags | Importing a recipe from a URL |
| Recipe detail, scaling, unit conversion | Nearby store prices |
| Cook Mode, timers, wake lock | Geocoding a new address |
| Meal planner | |
| Grocery lists and checking items off | |

Both online-only features detect being offline and say so plainly instead of hanging.

> **Moving devices?** Local-first means the data lives on *that* device. Use
> **Settings → Backup** to export a JSON file before switching phones, then import it on the new one.

## 📱 Making it a fully fledged app

RecipeVault is already an installable PWA. That's the recommended path for a local-first product:

| Goal | What to do |
| --- | --- |
| Phone / desktop app icon, full screen, offline | Already built in — install the PWA |
| List it in the iOS / Android stores | Wrap the deployed URL with [Capacitor](https://capacitorjs.com/) or [PWABuilder](https://www.pwabuilder.com/) |
| Cloud sync across devices | Add an optional account layer later — keep IndexedDB as the source of truth and sync in the background |
| Push meal-plan reminders | Add Web Push after you have a backend for subscriptions |

You do **not** need to rewrite RecipeVault in React Native or Swift to get a real app. Install the
PWA first; wrap it for the stores only if you want App Store / Play Store distribution.

## 🔍 How recipe importing works

1. You paste a URL into the importer on `/recipes`.
2. The browser calls `POST /api/scrape` (a Next.js Route Handler) with that URL — this avoids
   browser CORS restrictions since the fetch happens server-side.
3. The server fetches the page HTML and looks for a `<script type="application/ld+json">` block
   containing a `schema.org/Recipe` node (`src/lib/scraper/jsonld.ts`), including nested
   `@graph` arrays, `HowToSection`/`HowToStep` instructions, and various `image`/`author` shapes.
4. If no JSON-LD is found, it falls back to scanning for `itemprop` microdata
   (`src/lib/scraper/microdata.ts`).
5. The normalized recipe is returned to the browser, previewed, and — once you hit **Save to
   Vault** — parsed into structured `Ingredient` objects (`src/lib/parser/ingredients.ts`) and
   stored locally via Dexie.

## 🧮 How grocery list aggregation works

When you click **Generate List from Week**, RecipeVault:

1. Reads every meal plan entry for the selected week from IndexedDB.
2. Scales each recipe's ingredients to the servings you planned (`scaleIngredients`).
3. Groups ingredients by normalized (singularized) name + unit and sums their quantities
   (`aggregateIngredients` in `src/lib/parser/aggregate.ts`) — so "2 cups milk" + "1 cup milk"
   becomes "3 cups milk".
4. Categorizes each merged ingredient into a grocery aisle using a keyword lookup table
   (`src/lib/parser/category.ts`).
5. Saves the result as a new checkable `GroceryList` you can keep shopping from on mobile.

## 🤝 Contributing

Issues and pull requests are welcome! This project has no backend services beyond the optional
health check, so most contributions only require `npm install && npm run dev`.

## 📄 License

MIT — see [LICENSE](./LICENSE).
