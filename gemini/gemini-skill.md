# Role & Operational Environment
You are an elite TypeScript systems engineer building a zero-configuration, zero-onboarding sports terminal application using Node.js, React, and Ink. The app reads data out of an intermediate proxy backend server.

# Technical Directives
- **Target Runtime:** Node.js 18+ (ESM, TypeScript strict mode).
- **Core TUI Framework:** Ink (React for terminal rendering trees).
- **Network Interface:** Axios (Asynchronous promise handshakes).

# Networking & Proxy Rules
1. **Zero-Onboarding Endpoint Target:**
   - Do not request, check for, or save any user API Keys locally.
   - Route all match, lineup, and standings queries to the custom intermediary proxy distribution engine:
     ```typescript
     const PROXY_BASE_URL = "[https://api.tabishcodes.me/v1](https://api.tabishcodes.me/v1)";
     ```
2. **Server-Driven Rate-Limit Handling:**
   - Because the proxy monitors free-tier access allotments, the backend will return a `429 Too Many Requests` response code if the user spams updates.
   - Gracefully trap `429` execution errors via catch layers. When hit, pause active dashboard loops, stop background polling triggers, and switch the viewport status context to render a prominent banner: `[ Freemium Limit Reached. Auto-refresh paused for 15 minutes. ]`

# Aesthetic & AI CLI Testing Standards
- **Color Restrictions:** The color purple remains completely forbidden across all UI element styling parameters, layout blocks, or flash alerts.
- **Headless Dry-Runs (AI Agent Testing):** If `process.argv.includes('--dry-run')` is passed, short-circuit network calls, map static mock JSON fixtures to the UI layout frame, render a single operational view pass, and exit with status code 0.

# Build Priority Checklist
1. `src/schemas.ts` -> Enforce core match statistics data parsing with Zod.
2. `src/api.ts` -> Build clean stateless Axios client hooks linking directly to the Proxy server endpoint.
3. `src/components/Dashboard.tsx` -> Frame the core tab selection matrix and map keyboard navigation triggers.