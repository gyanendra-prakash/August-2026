# AI Multilang Website — Frontend + Backend Separated

This project has been split into **2 separate folders** — both live inside the same repo, but they run as **2 separate servers**.

```
AI-Multilang-split/
├── frontend/     -> Next.js app (UI, pages, i18n, chatbot widget)
└── backend/      -> Express.js server (API, MongoDB, Gemini AI calls)
```

## Why it was split

| Before (1 project)                             | Now (2 projects)                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| Next.js `app/api/` routes acted as the backend | Express server is now a separate backend                                     |
| One `npm run dev` ran everything               | Each one needs its **own** `npm run dev`                                     |
| Frontend and backend code were mixed together  | Clean separation — frontend handles only UI, backend handles only logic/data |

This structure mirrors how real companies work — where the frontend team and backend team work separately, and the two sides only talk to each other through **HTTP API calls**.

## Setup — Backend first

```bash
cd backend
npm install
```

Copy `.env.example` to create `.env`, and add your keys:

```bash
cp .env.example .env
```

```
GEMINI_API_KEY=your_gemini_key
MONGODB_URI=your_mongodb_connection_string
PORT=5000
FRONTEND_URL=http://localhost:3000
```

Start the backend:

```bash
npm run dev
```

It will run at: **http://localhost:5000**

## Setup — Frontend (in a new terminal)

```bash
cd frontend
npm install
```

Copy `.env.local.example` to create `.env.local`:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

It will run at: **http://localhost:3000**

## Important — both need to run at the same time

To use the website, you need **2 terminal windows** open:

- Terminal 1: `cd backend && npm run dev`
- Terminal 2: `cd frontend && npm run dev`

If you only run the frontend while the backend is off, the chatbot and blog posts won't work (since they fetch data from the backend).

## What's inside each folder

### `backend/`

| File                  | What it does                                                 |
| --------------------- | ------------------------------------------------------------ |
| `server.js`           | Entry point of the Express app — all routes are mounted here |
| `routes/chat.js`      | Handles chatbot messages via the Gemini API                  |
| `routes/translate.js` | Translates a piece of text manually                          |
| `routes/posts.js`     | Creates/fetches blog posts from the admin panel (MongoDB)    |
| `models/Post.js`      | Database schema                                              |
| `lib/mongodb.js`      | Database connection                                          |
| `lib/translateAll.js` | Translates one post into every supported language            |

### `frontend/`

| File                              | What it does                                      |
| --------------------------------- | ------------------------------------------------- |
| `app/[locale]/page.tsx`           | Homepage                                          |
| `app/[locale]/blog/page.tsx`      | Blog listing (fetches posts from the backend)     |
| `app/[locale]/blog/[id]/page.tsx` | A single blog post's page                         |
| `app/[locale]/admin/page.tsx`     | Admin panel (sends a POST request to the backend) |
| `components/Chatbot.tsx`          | Chatbot UI (calls the backend's `/api/chat`)      |
| `lib/api.ts`                      | The backend's URL is managed from here            |
| `messages/*.json`                 | Static UI text, one file per language             |

## Model & AI notes

The backend uses the `gemini-3.5-flash-lite` model (currently Google's free-tier-friendly option). If it gets deprecated in the future, you'll need to update the model name in three places: `backend/routes/chat.js`, `backend/routes/translate.js`, and `backend/lib/translateAll.js`.

## When you deploy (later on)

When you deploy this live:

- Deploy the **backend** somewhere like Render, Railway, or Fly.io
- Deploy the **frontend** on Vercel
- Update the frontend's `NEXT_PUBLIC_API_URL` to point to the backend's live URL
- Update the backend's `FRONTEND_URL` to point to the frontend's live URL (needed for CORS)
