# ⚽ FIFA Live CLI (Zero-Config Terminal Dashboard)

A lightweight, blazing-fast, and distraction-free interactive Terminal User Interface (TUI) for the **FIFA World Cup 2026**. Built in pure TypeScript using React and Ink, it delivers live match updates, schedules, and standings directly to your command line.

---

## 💡 The Need

Traditional sports dashboards are cluttered with advertisements, telemetry scripts, and heavy graphical assets that drain memory and network bandwidth. For developers and CLI enthusiasts, switching back and forth to a web browser breaks focus and disrupts command-line workflows. 

**FIFA Live CLI** solves this by providing:
* **Zero Overhead:** Operates inside your terminal with an active memory footprint of less than 80 MB.
* **Frictionless Onboarding:** Standard users do not need to register, configure `.env` variables, or request API keys. It runs instantly out-of-the-box.
* **Persistent Monitoring:** Includes a native background-polling mechanism that keeps live scores pinned to your window title and prompt shell while you continue working on other terminal tasks.

---

## 🏗️ Architecture Design

The system relies on a decoupled, config-driven gateway architecture that separates client layout concerns from network access security:

```
┌──────────────────────────────────────┐
│        FIFA Live TUI Client          │
│   (Node.js + React + Ink Layout)     │
└──────────────────┬───────────────────┘
                   │
                   ▼ (HTTP Calls via Axios)
┌──────────────────────────────────────┐
│      Intermediary Proxy Server       │
│  (Caches responses, hides API keys)  │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│          API-Football REST           │
│     (Upstream Sports Data Provider)  │
└──────────────────────────────────────┘
```

### **1. Gateway & 1-Minute Cache Buffer**
To prevent public key leaks and API quota exhaustion, the CLI client delegates authentication to an intermediary proxy. The proxy securely holds the upstream API credentials, protects data delivery, and implements a **strict 1-minute file-based cache**. Even if multiple CLI clients poll the proxy aggressively, the external API is only hit once every 60 seconds, serving instant responses from the `.cache/` directory in between.

### **2. Config-Driven Endpoints**
The application reads its target backend URL from a platform-agnostic configuration file:
* **Windows:** `%APPDATA%\fifa-live-cli\config.json`
* **macOS/Linux:** `~/.config/fifa-live-cli/config.json`

If the config file does not exist, the CLI automatically generates it on the first run, defaulting `PROXY_BASE_URL` to `http://localhost:3000/v1` for local development sandbox environments.

### **3. Rate-Limit Protection (429 handling)**
When the proxy server detects excessive client requests, it responds with an `HTTP 429 Too Many Requests` code. The TUI client catches this error, immediately halts background polling intervals, and renders a prominent countdown warning banner to pause updates for **7 minutes**.

---

## 🚀 Key Features

* **Multi-Tab Dashboard:** Seamless navigation between **Live Scores**, **Upcoming Fixtures**, and **Group Standings** tabs.
* **Smart Timezones:** Match times are automatically localized to your system timezone with clear abbreviations (e.g., IST, EST, GMT).
* **Live Score Pinning & Polling:** Pressing `P` pins the selected match. Once pinned and closed, a background helper script safely updates your window title. The CLI cleanly terminates orphan background pollers on Windows via `SIGKILL`.
* **Goal Animation:** Renders frame-by-frame ASCII art animations at 30 FPS inside the terminal whenever a goal event is captured (or on-demand by pressing `G`).
* **Automated AI Testing:** Accepts a `--dry-run` flag that short-circuits network calls, displays a single render pass utilizing mock fixtures, and exits with code `0`. Ideal for CI/CD and AI agent verification.
* **Forbidden Purple Policy:** The UI strictly avoids the color purple, featuring a sleek cyberpunk layout styled exclusively with gold, white, neon green, and grey.

---

## 🛠️ Installation & Commands

### **1. Prerequisites**
Ensure you have Node.js (v18+) and npm installed.

### **2. Build the CLI**
```bash
# Install dependencies
npm install

# Compile TypeScript to JavaScript
npm run build
```

### **3. Launch CLI in Headless Dry-Run**
```bash
node dist/cli.js --dry-run
```

### **4. Start Local Offline Cache & Mock Server**
The project includes a pre-cached offline dataset containing real scheduled FIFA 2026 World Cup matches and standings. To avoid duplicate API requests, conserve your API quota, and ensure that the dashboard focuses exclusively on FIFA 2026:
```bash
# Starts the proxy server in offline-cache mode on port 3000
node mock_server.js
```
* **Offline Caching:** The proxy reads directly from `fifa_2026_fixtures.json` and `fifa_2026_standings.json`, running 100% offline.
* **Live Match Simulation:** It dynamically simulates real FIFA match play-by-play events, statistics, and live scoring for selected matchups (e.g. Mexico vs South Africa, Canada vs Bosnia, USA vs Paraguay).
* **Rate Limit Testing:** 
  * Visit `http://localhost:3000/v1/trigger-limit` in your browser to simulate an HTTP 429 rate limit.
  * Visit `http://localhost:3000/v1/reset-limit` to clear the simulated rate limit.

### **5. Run TUI in Interactive Mode**
```bash
npm start
```

---

## 🐳 Docker Deployment (Proxy Server)

You can easily containerize the proxy server to host it in production and provide the API to your end-users.

```bash
# Build the Docker image
docker build -t fifa-26-proxy .

# Run the container (Exposes port 3000)
docker run -p 3000:3000 -d fifa-26-proxy
```

---

## 📦 NPM Publishing

The application is structured to be published as a globally executable CLI tool. See the full [NPM Publish Guide](docs/npm-publish-guide.md) for details.

End users can quickly run your app without installing by executing:
```bash
npx fifa-26-live-cli
```

---

## ⌨️ Controls & Keybindings

* `1` — Switch to **Live Matches** tab.
* `2` — Switch to **Upcoming Fixtures** tab.
* `3` — Switch to **Group Standings** tab.
* `↑` / `↓` — Navigate fixture items (in Fixtures tab).
* `P` — **Pin** the active match score.
* `U` — **Unpin** the match.
* `G` — Play **Goal Animation** demonstration.
* `R` — **Force Refresh** / Reset rate limit countdown timer.
* `Ctrl + C` — Exit the dashboard safely (leaving a pinned score in the prompt shell if active).
