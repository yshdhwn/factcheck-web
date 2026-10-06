# Docket — Fact-Check Web

Web app to verify claims in images, videos, and URLs. Uploads go through a six-step analysis pipeline. The result is a verdict, a confidence score, and sources.

## Features

- Upload an image or video, or paste a URL
- Six-step pipeline with live progress:
  Claim Extractor → Evidence Gatherer → Credibility Evaluator → Fallacy Detector → Counter-Evidence Weigher → Report Generator
- Verdicts: True, False, Misleading, Unverified
- Confidence score and source list with credibility ratings
- History of past checks (saved in browser localStorage)

## Tech Stack

- React 18 + TypeScript
- Vite 5
- React Router 6

## Getting Started

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open http://localhost:5173.

### Production build

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/   # common, upload, result UI
├── hooks/        # useFactCheck
├── pages/        # Home, Analyze, History, About
├── services/     # factCheckService (mock + real API)
├── types/        # shared TypeScript types
├── utils/        # validation helpers
└── styles/       # global.css
```

## Configuration

The app runs on a **mock pipeline** by default, so no backend is needed.

To connect a real API:

1. In `src/services/factCheckService.ts`, set `USE_MOCK = false`.
2. Create a `.env` file:
```
   VITE_FACTCHECK_API=https://your-api.example.com/factcheck
```
3. The API must accept:
   - `POST /image` (multipart form, field `file`)
   - `POST /video` (multipart form, field `file`)
   - `POST /url` (JSON `{ "url": "..." }`)
   
   Each returns a `FactCheckResult` (see `src/types/factCheck.ts`).

## Deploy on Vercel

1. Push the repo to GitHub.
2. Import it at https://vercel.com/new.
3. Settings: Framework = Vite, Build = `npm run build`, Output = `dist`.
4. If using a real API, add `VITE_FACTCHECK_API` under Environment Variables.

`vercel.json` rewrites all routes to `index.html` so client-side routes like `/history` work on refresh.

## Disclaimer

AI-assisted results. Not a substitute for editorial judgment.