# Regression Test Management Platform

SaaS-style regression test suite, case, and execution management with team collaboration, Jira integration, and AI-assisted case generation. Stack: React (Vite), Express, MongoDB.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)

## Table of contents

- [Features](#features)
- [AI-assisted cases (Modal, crawl, Playwright)](#ai-assisted-cases-modal-crawl-playwright)
- [Jira ticket format (auto-fill)](#jira-ticket-format-auto-fill)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the application](#running-the-application)
- [API documentation](#api-documentation)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features

### Authentication and profile

- JWT authentication, bcrypt password hashing, protected routes
- Profile page for name and password updates

### Regression sets and test cases

- CRUD for regression sets (Web / iOS / Android / TV) with team-scoped access
- Rich test case fields (preconditions, steps, expected results, status)
- CSV bulk import with validation and duplicate handling

### Teams and RBAC

- Teams, invite codes, member roles: Admin, QA Lead, Tester, Viewer
- Role checks on team resources

### Jira operations hub

- Link regression sets to Jira tasks or run against live Jira-sourced cases
- Comment parsing for multiline steps, preconditions, expected results
- Optional auto-creation of bugs on failure (configurable status / issue type)
- Create container tasks from the run UI

### Test runs

- In-progress runs, resume, retest failed/skipped
- Per-case executor attribution, Excel export

### Dashboard

- Pass / fail / skip overview, trends, platform and module views

### UI

- Tailwind-based UI, light/dark theme, responsive layout

## AI-assisted cases (Modal, crawl, Playwright)

The **AI Cases** area combines three pieces:

1. **Story-based generation** — User story plus acceptance criteria are sent to a **Modal-hosted** fine-tuned model (Llama-class). The server parses the model reply into structured test case suggestions. No OpenAI key is required for this path when `MODAL_API_URL` is set.

2. **Jira link auto-fill** — Given a Jira issue URL, the backend calls the Jira REST API and extracts **user story** and **acceptance criteria** with a **deterministic parser** (wiki markup stripping, section headers, bullets, optional Gherkin). This replaces the previous GPT-based extraction.

3. **URL or HTML crawl** — **Puppeteer** loads the page (with URL validation and SSRF-oriented checks). The server derives several distinct **features** from the DOM (forms, navigation, search, CTAs, etc.), builds focused prompts per feature, calls the Modal model in parallel, filters out obvious negative-only scenarios, and falls back to **template-based** cases if the model output is weak. You can paste raw HTML instead of a URL.

4. **Playwright auto-run** — From the same UI you can run generated cases against a URL with **Playwright** (Chromium): step-level pass/fail, errors, optional screenshots. **Headed (“visual”) mode** is intended for **development only**. When you create a regression set from a crawl that was already executed, **Actual results** and **status** can be filled from the Playwright run.

**Headless browser install:** after `npm install` under `server`, `postinstall` runs Puppeteer Chrome and Playwright Chromium installers. If binaries are missing (CI, sandbox, or wrong arch), run:

```bash
cd server && npm run install:browsers
```

On Apple Silicon, use an **arm64** Node install so Playwright fetches the correct Chromium build.

## Jira ticket format (auto-fill)

For the best extraction, use a clear **summary** and a **description** that includes:

- A user story line, e.g. `As a customer, I want …` or `Kullanıcı olarak, … istiyorum.`
- A section titled **Acceptance Criteria** / **Kabul Kriterleri** (or similar), followed by bullets (`*`, `-`, numbered lines, or checkboxes).

The parser understands common Jira wiki markers (`h2.`, bold, panels); keep list items as full sentences where possible.

## Tech stack

| Layer | Technologies |
|--------|----------------|
| Backend | Node.js 18+, Express 5, TypeScript, Mongoose |
| Frontend | React 19, Vite 7, TypeScript, Tailwind CSS |
| Database | MongoDB (e.g. Atlas) |
| AI inference | Modal HTTP endpoint (`MODAL_API_URL`) |
| Crawl | Puppeteer (Chrome) |
| Auto execution | Playwright (Chromium) |
| Exports | ExcelJS |

## Prerequisites

- **Node.js** ≥ 18.17 and **npm** ≥ 10  
- **MongoDB** (local or Atlas)  
- **Jira** API token and site URL if you use Jira features  
- **Modal** deployment URL for AI generation and crawl (see `MODAL_API_URL`)  
- Disk space for **Chrome + Chromium** downloads on first `server` install  

## Installation

```bash
git clone https://github.com/mustaffaerdogan/regression-test-management-platform.git
cd regression-test-management-platform
npm install
cd server && npm install
cd ../client && npm install
```

Copy environment templates:

- `server/env.example` → `server/.env`  
- `client/env.example` → `client/.env`  

Adjust `VITE_API_BASE_URL` so it matches the server **port** and `/api` path (e.g. `http://localhost:5005/api` if the API listens on `5005`).

## Configuration

### Backend (`server/.env`)

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (on macOS, port **5000** is often taken by AirPlay; **5005** or **5050** is common) |
| `MONGODB_URI` | Mongo connection string |
| `JWT_SECRET` | Strong secret for signing JWTs |
| `CLIENT_URL` | **Production:** exact browser origin allowed by CORS (e.g. `https://app.example.com`). If set in dev, that origin is always allowed; other localhost ports are still allowed in development. |
| `JIRA_EMAIL` | Jira account email for REST API |
| `JIRA_API_TOKEN` | Jira API token |
| `JIRA_BASE_URL` | Site root, e.g. `https://your-domain.atlassian.net` |
| `MODAL_API_URL` | Modal (or compatible) **generate** endpoint for test case text |

Optional:

| Variable | Purpose |
|----------|---------|
| `PUPPETEER_EXECUTABLE_PATH` | Override Chrome/Chromium binary path for crawl |
| `NODE_ENV` | `production` tightens CORS to `CLIENT_URL` only |

Legacy keys such as `OPENAI_*` in `server/env.example` are **not** used by the current Jira extraction or Modal crawl/generate paths; you can remove them locally if unused.

### Frontend (`client/.env`)

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Must match the server’s public URL and port.

## Running the application

From the repository root:

```bash
npm run dev
```

This runs the API and the Vite dev client concurrently. Open the URL printed by Vite (often `http://localhost:5173`; if the port is busy, Vite may use **5174** — in development the API allows localhost origins on any port).

Separate processes:

```bash
npm run dev:server
npm run dev:client
```

Production-style:

```bash
npm run build
npm start
```

## API documentation

All AI case routes require authentication (`Authorization: Bearer <jwt>`).

### AI cases (`/api/ai-cases`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai-cases/generate` | Generate case suggestions from user story + acceptance criteria (Modal) |
| `POST` | `/api/ai-cases/extract-jira` | Fetch issue by URL; parse story + AC (no LLM) |
| `POST` | `/api/ai-cases/crawl` | Crawl `url` or parse `html`; return generated cases |
| `POST` | `/api/ai-cases/run-tests` | Run selected cases with Playwright against a `url` |

### Other (examples)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login, returns JWT |
| `PUT` | `/api/auth/profile` | Update profile |
| `POST` | `/api/test-runs/:runId/retest` | Retest failed/skipped |
| `GET` | `/api/test-runs/:runId/export` | Excel export |

## Security

- Secrets belong in `.env` (not committed).
- Crawl and Playwright flows validate URLs, block common private/hostile targets, and restrict navigation where implemented to reduce SSRF risk.
- Rate limiting applies to the API; Playwright runs are additionally guarded (payload limits, concurrency, single in-flight run per user where configured).
- **Production:** set `NODE_ENV=production` and a precise `CLIENT_URL` for CORS.

## Troubleshooting

| Symptom | What to try |
|---------|----------------|
| Puppeteer: Chrome not found | `cd server && npx puppeteer browsers install chrome` or set `PUPPETEER_EXECUTABLE_PATH` to a local Chrome |
| Playwright: executable missing | `cd server && npx playwright install chromium` (use arm64 Node on Apple Silicon) |
| Browser `Failed to fetch` from the UI | Confirm `VITE_API_BASE_URL` matches the server port; in dev, use a localhost origin. Check `CLIENT_URL` in production. |
| Jira extract empty | Improve ticket structure (summary + **Kabul Kriterleri** / **Acceptance Criteria** + bullets); ensure `JIRA_*` and `JIRA_BASE_URL` are correct |

## License

MIT

---

Issues and suggestions: [GitHub issues](https://github.com/mustaffaerdogan/regression-test-management-platform/issues).
