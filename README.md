# FlashMind AI

A local-first AI flashcard web app built with React + TypeScript + Vite. It stores decks in IndexedDB, supports JSON backup/import, optional Supabase accounts/cloud sync, and AI flashcard generation through a secure Supabase Edge Function.

## What you need to change later

You only need to provide these values/services:

1. **Supabase project URL**
2. **Supabase public anon/publishable key**
3. **An AI API key** for an OpenAI-compatible chat-completions provider
4. Optional: AI endpoint/model if you are not using the defaults

You do **not** put the AI secret inside the React app or GitHub repository.

---

## 1. Check software

In PowerShell:

```powershell
node --version
npm --version
git --version
docker --version
```

Only Node.js/npm and Git are required for normal development. Docker is optional and already useful if you prefer container testing.

If Node.js is missing:

```powershell
winget install OpenJS.NodeJS.LTS
```

If Git is missing:

```powershell
winget install Git.Git
```

Close and reopen PowerShell after installations.

---

## 2. Run locally before Supabase is configured

```powershell
npm install
npm run dev
```

Open the localhost URL printed by Vite. The app will run in **local mode** immediately. Manual decks, editing, study mode, local storage, export/import, and file extraction work without Supabase.

AI generation and account/cloud features require Supabase.

---

## 3. Create the Supabase project

Create a normal hosted Supabase project.

Then copy:

- Project URL
- Public anon/publishable key

Create a file named `.env` in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_KEY
```

Never place the **service_role** key here.

Restart `npm run dev` after changing `.env`.

---

## 4. Create the database

Open the Supabase SQL Editor and run the contents of:

```text
supabase/migrations/001_initial.sql
```

That creates:

- `profiles`
- `decks`
- Row Level Security policies
- Automatic profile creation for newly registered users

Each user can only access their own cloud decks.

---

## 5. Make signup simple / no admin approval

In Supabase Authentication settings:

- Enable **Email + Password** signup.
- Do not add invitation-only or admin approval logic.
- If you want registration to sign users in immediately, disable mandatory email confirmation.

If email confirmation stays enabled, FlashMind handles that too: the account is created and the user is told to check their email.

For GitHub Pages, add your final Pages URL to the allowed Site URL / Redirect URLs in Supabase Auth settings.

Example:

```text
https://YOUR_USERNAME.github.io/YOUR_REPOSITORY/
```

Because this project uses `HashRouter`, GitHub Pages does not need special SPA rewrite rules.

---

## 6. Configure AI securely

The browser does NOT store your paid AI secret. AI requests go through:

```text
Browser -> Supabase Edge Function -> AI provider
```

The Edge Function code is already included at:

```text
supabase/functions/generate-flashcards/index.ts
```

It expects these server-side secrets:

```text
AI_API_KEY=your_private_ai_key
AI_API_URL=https://your-provider.example/v1/chat/completions
AI_MODEL=your-model-name
```

`AI_API_URL` and `AI_MODEL` are optional if the defaults match your provider. The function is written for OpenAI-compatible chat-completions APIs.

Set these as **Supabase Edge Function secrets**, not frontend variables.

Then deploy the `generate-flashcards` Edge Function from Supabase. Keep JWT verification enabled so only authenticated users can call your paid AI endpoint.

The exact-source prompt is already inside the function. It instructs the AI to preserve definitions, terminology, dates, formulas, names, lists, and source wording as closely as possible and to return a supporting source excerpt for every card.

---

## 7. Test everything locally

```powershell
npm install
npm run dev
```

Test:

1. Create a manual deck.
2. Refresh the page; the deck should remain.
3. Upload a PDF/DOCX/PPTX/XLSX/TXT/image.
4. Confirm extracted text appears.
5. Create an account.
6. Generate AI cards.
7. Edit and study cards.
8. Export a backup.
9. Import the backup.
10. Sign in from another browser and use **Sync Now**.

Build-test:

```powershell
npm run build
npm run preview
```

---

## 8. Optional Docker local test

You already have Docker, so you can also test the production build with:

```powershell
docker compose up --build
```

Then open:

```text
http://localhost:8080
```

Stop it with:

```powershell
docker compose down
```

Docker is **not required** for GitHub Pages or Supabase.

---

## 9. Put it on GitHub

Create an empty GitHub repository, then from this project folder:

```powershell
git init
git add .
git commit -m "Initial FlashMind AI"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

---

## 10. Add GitHub Actions secrets

In the GitHub repository, add these repository secrets:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Use the same **public** Supabase values from your local `.env`.

Do NOT add the AI API key to the frontend build. Keep it in Supabase Edge Function secrets.

---

## 11. Enable GitHub Pages

In GitHub repository settings, configure Pages to deploy using **GitHub Actions**.

The included workflow:

```text
.github/workflows/deploy-pages.yml
```

builds and deploys the app whenever you push to `main`.

The Vite config uses a relative `base: './'`, and the app uses hash routing, so you do not need to hardcode the repository name into `vite.config.ts`.

---

## Supported file extraction

The app currently handles:

- PDF -> PDF.js
- DOCX -> Mammoth
- PPTX -> JSZip/XML extraction
- XLS/XLSX -> SheetJS
- TXT/MD/CSV/TSV/JSON/XML/HTML and other text-like files -> browser text reader
- PNG/JPG/JPEG/WEBP/BMP -> Tesseract.js OCR
- Unknown text-like formats -> best-effort text detection

Legacy binary `.doc` and `.ppt` formats cannot be reliably parsed in a normal browser, so the app asks the user to convert them to DOCX/PPTX/PDF.

The file picker itself is not restricted to a fixed extension list, so other text-like files can still be attempted.

---

## Local storage design

- **IndexedDB:** decks, cards, extracted source text, study progress
- **localStorage:** small preferences/prompt-preset data
- **Supabase:** optional cloud copy when signed in
- **Original binary files:** not persisted by default

This avoids the small storage quota problem of putting entire PDFs into localStorage.

---

## Important security rules already applied

- No service-role key in the browser
- No AI API key in the browser
- Supabase Row Level Security
- Authenticated AI Edge Function
- Local app continues working when Supabase is not configured
- GitHub Pages contains only public frontend configuration

