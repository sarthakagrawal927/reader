# Web Annotator

Capture a readable snapshot of any page, store it in Firestore, and annotate it. This guide is tailored for Vercel deployments with Firebase.

## Environment Setup
1) Copy `env.example` to `.env.local` and fill the values.
2) Install dependencies and run locally:
```bash
npm install
npm run dev
```

### Firebase Admin (server) credentials
- Local-first: download the service account JSON (Firestore access) and set `FIREBASE_SERVICE_ACCOUNT_PATH` to its path (file is `.gitignore`d).
- Vercel/serverless: files aren’t persisted, so set `FIREBASE_SERVICE_ACCOUNT_KEY` to a base64 of that JSON instead.  
  - macOS: `base64 firebase-service-account.json | tr -d '\n'`  
  - Linux: `base64 -w0 firebase-service-account.json`

### Firebase client config (browser)
From **Firebase Console → Project Settings → General → Your apps**, add to `.env.local` / Vercel:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## Deploying to Vercel
1) Connect the repo in Vercel.
2) Add the env vars above. Use `FIREBASE_SERVICE_ACCOUNT_KEY` (base64) because Vercel can’t read a local file. Recommended: `PLAYWRIGHT_BROWSERS_PATH=0` so Vercel bundles Chromium with the function.
3) Deploy. No service-account file needs to be checked in—the server uses the env var when a file isn’t present.

## Feature Priority (ROI ÷ Effort)
| Rank | Feature | Why this order |
| --- | --- | --- |
| 1 | Group websites/pdfs by projects | Fast to ship (metadata + UI filter) and immediately clarifies organization for users. |
| 2 | Auth | Unlocks saved work per user and is a prerequisite for collaboration; Firebase Auth keeps effort moderate. |
| 3 | AI integration to add comments/ask questions | High differentiation with moderate effort once content is in Firestore; can be scoped to Q&A first. |
| 4 | Add PDFs/images and render as HTML | Expands core utility; moderate effort for parsing/upload but high value for research workflows. |
| 5 | Add YT video with timestamped comments | Useful but narrower audience; medium effort (player + time-based annotations). |
| 6 | Collaboration project-wise | Strong ROI but high complexity (permissions, concurrency), best after auth and grouping are solid. |
| 7 | Canvas relations linking documents across projects | Visually compelling but highest complexity; build once data model and collaboration are stable. |
