# /start funnel — source pipeline

`/start/index.html` is generated. It is a 1:1 web translation of the app's
onboarding flow (`frontend/src/app/onboarding/`: hook → sports → alerts →
demo → proof → result) plus a paywall/App Store handoff screen.

## Files

- `funnel.template.html` — the page: markup, CSS (app design tokens), and all
  runtime JS. Two placeholders get inlined at build time: `"__ASSETS_JSON__"`
  (base64 data URIs) and `"__DATA_JSON__"` (card + demo data).
- `extract.mjs` — pulls team colors / names / logo paths / NBA headshot ids
  out of `frontend/src/codegen/*.ts` and ports `bgFgHex` verbatim → `bets.json`.
- `bets.json` — the 24 marquee bets (exact args from `hook.tsx`) + the four
  demo bets, with resolved colors and headshot URLs. Committed so a copy tweak
  doesn't require the app repo.
- `fetch-assets.sh` — downloads headshots (NBA CDN / ESPN / MLB static),
  copies league marks, team logos, wordmark and arrow texture from the app
  repo, downscales with `sips` → `assets/`.
- `webp.mjs` — converts the PNGs to WebP (needs `bun add sharp`) and emits
  `manifest.json` (key → data URI). manifest.json is NOT committed (280KB,
  regenerable).
- `build-funnel.mjs` — template + manifest + bets → `../start/index.html`.

## Rebuild

```
node extract.mjs bets.json      # only if app codegen/mock bets changed
bash fetch-assets.sh            # only if assets changed
bun add sharp && bun webp.mjs   # only if assets changed
node build-funnel.mjs           # always: writes ../start/index.html
```

Copy-only edits: change `funnel.template.html` (or the demo copy inside
`build-funnel.mjs`), then run `node build-funnel.mjs`.

## Where the app copy lives

Every user-facing string is copied verbatim from
`frontend/src/locales/en.json` (`onb.*` keys) and the demo/graph data from
`frontend/src/app/onboarding/demo.tsx`. If the app onboarding copy changes,
re-sync by hand — grep for the string in the template or build script.

Analytics: PostHog project = the app's; events are `web_funnel_view`,
`web_funnel_step`, `web_funnel_answer`, `web_funnel_paywall_view`,
`web_funnel_store_click` (same names the previous /start funnel used).
Attribution params (utm_*, campaign/adset/ad ids, fbclid, ios_pp_id, fpid,
fsid, gclid, ttclid) persist in localStorage `pg_attr` and register on every
PostHog event.
