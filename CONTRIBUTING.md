# Contributing to RecipeVault

Thanks for helping out! RecipeVault has no backend services beyond an optional health check,
so getting started is just `npm install && npm run dev`.

## Getting set up

```bash
npm install
npm run dev        # http://localhost:3000
```

No database or API keys are required for any user-facing feature — recipes, meal plans, and
grocery lists all live in the browser's IndexedDB.

## Before opening a pull request

Run the same checks CI runs:

```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest unit tests
npm run build      # Production build
```

## Tests

The parsing and scraping logic is the heart of the app, and it's all covered by unit tests:

| Area | File |
| --- | --- |
| Ingredient parsing, scaling, formatting | `src/lib/parser/ingredients.test.ts` |
| Grocery merging & aisle grouping | `src/lib/parser/aggregate.test.ts` |
| Metric ⇄ US conversion | `src/lib/parser/units.test.ts` |
| Timers, durations, categories, pasted text | `src/lib/parser/misc.test.ts` |
| JSON-LD & microdata recipe extraction | `src/lib/scraper/scraper.test.ts` |

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # coverage summary
```

**If you touch parsing logic, add a test.** These functions handle messy real-world recipe text,
and regressions are easy to introduce and hard to spot by eye.

## Things worth knowing

- **Local-first is a hard rule.** User recipes must never be sent to a server. The only network
  calls are recipe scraping (`/api/scrape`), geocoding, and store prices — all explicitly
  user-initiated.
- **Scaling is subtle.** Numbers inside ingredient text are scaled, but temperatures, times, pan
  sizes, percentages, and digits inside words (`V8`) must not be. See `scaleTextQuantities`.
- **Offline must keep working.** If you add a route, add it to `SHELL_ROUTES` in `public/sw.js`.

## Code style

TypeScript everywhere, explicit interfaces for data structures, and comments that explain *why*
rather than restating the code. Run `npm run lint` before pushing.
