<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Booking rules (capacity, nights, pricing, companions) live only in `src/lib/hotel/rules.ts` as pure functions; UI and future server functions both call them so limits are enforced identically.
- All data access goes through the action functions in `src/lib/hotel/store.ts` (currently a browser-only demo store); swap their bodies for server functions when the database is connected instead of calling storage from components.
- Calendar dates are `YYYY-MM-DD` strings handled by `src/lib/hotel/dates.ts`, never `Date` objects in state, to avoid time-zone drift.
- "Today" is resolved client-side via `useToday()` and money/date formatting is deterministic, so SSR and hydration render the same markup.
- `/admin` and its children render client-only (`ssr: false`) because they show private data.
- Planned database schema and access model: `docs/arquitectura-base-de-datos.md`.
