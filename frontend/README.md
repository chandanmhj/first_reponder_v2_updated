# First Responder v2 — Frontend

React + Vite + Tailwind v4 implementation of `design.md` — glassmorphism, blue palette, the persistent emergency action bar, all 18 screens.

## Setup

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env`: point `VITE_API_BASE_URL` at your backend (`http://127.0.0.1:8000` for local dev against the FastAPI backend).

```bash
npm run dev
```

## Testing

```bash
npx vitest run
```

13 tests: every page renders without throwing, plus two tests specifically covering the emergency action bar — that it persists and updates across multiple chat turns (not just appears once), and that it correctly disappears only when a paramedic handover summary arrives, with the chat remaining usable throughout both cases.

## Build & Deploy (Netlify)

```bash
npm run build
```

Outputs to `dist/`. Deploy that folder to Netlify (or connect the repo directly — Netlify auto-detects Vite). Set `VITE_API_BASE_URL` as a Netlify environment variable pointing at your deployed Railway backend.

`public/_redirects` is already set up for SPA routing — without it, refreshing on any route other than `/` would 404 on Netlify.

**Netlify's default HTTPS matters functionally, not just cosmetically**: the browser's Geolocation API (used by First Responder's Navigate button) refuses to run over plain HTTP in production, so this only works correctly once deployed to Netlify or run on `localhost` in dev.

## Structure

```
src/
  api/client.js          - every backend call, token handling, error typing
  context/                 AuthContext, ToastContext
  hooks/useGeolocation.js  - real device coordinates for the Navigate button
  components/               Reusable UI: StepCapsule, BottomNav, AdvisoryBanner,
                             MealTypeChips, EmptyState, Icons, session/offline states
  pages/
    Splash, Login, SignUp, Home, Profile, NotFound
    nutriscan/  Scan.jsx (mode select -> capture -> analyze -> review -> log,
                one flow, matches how the screens actually chain together),
                History.jsx, DailySummary.jsx
    firstresponder/  Chat.jsx (the important one - welcome state, normal
                      chat, emergency state with the persistent action bar,
                      handover card, all as one screen since they're really
                      different states of the same conversation), History.jsx
  utils/scenarios.js      - BCLS scenario step-counts, matches
                             features/first_responder/knowledge_base.py exactly
```

## Known limitations / honest gaps vs. design.md

- **Photography (§6)**: design.md specifies real photography for the Home screen's two tool cards. This build uses gradient + icon treatments instead — I'm not going to ship stock photography of unknown license into your codebase. Drop real images into `src/assets/` and swap them into `Home.jsx`'s `HomeCard` components when you have them.
- **Daily Summary reference values**: the progress bars need *something* to fill against, but the backend doesn't yet return personalized daily targets (see backend README's "Known Limitations" — same gap noted there, re: reintroducing the old bot's age/height/weight/BMI-driven goals). Currently uses generic reference values (2000 kcal, etc.), clearly commented as such in `DailySummary.jsx`. Swap in real per-user targets once the backend supports them.
- **Camera capture**: uses a native `<input type="file" capture="environment">` rather than a custom in-browser camera viewfinder (getUserMedia). This is deliberate — it's the robust, standard pattern (opens the actual OS camera app on mobile) rather than a more fragile custom-built viewfinder, though it means there's no live glass-overlay frame guide as design.md's §10.6 describes.
- **Advisory color heuristic**: `AdvisoryBanner.jsx` decides coral-vs-teal by checking for the exact phrase `"over the general"`, matching the real wording in the backend's `advisory.py`. If you ever change that wording, update the heuristic too.
