Here is your production-ready, pure-TypeScript **Product Requirements Document (PRD)** and the corresponding `.cursorrules` / `gemini-skill.md` file.

This setup drops Python completely, utilizing **Node.js + TypeScript + Ink (React for CLI)**. It is optimized for zero-installation execution using `npx fifa-live-cli`.

---

# Product Requirements Document (PRD)

## 1. Product Overview

**FIFA Live CLI** is a lightweight, blazing-fast, cross-platform terminal application written in pure TypeScript. It provides real-time updates, live scores, player statistics, and match timelines for the FIFA World Cup 2026.

By utilizing Node.js, the app runs instantly on any machine via `npx`, removing the need for Python environments, virtual environments, or pre-compiled platform-specific binaries.

---

## 2. Problem Statement

Existing sports dashboards are cluttered with advertisements, heavy animations, and tracker scripts that consume significant system memory and network bandwidth. For developers and command-line enthusiasts, switching contexts to a web browser disrupts workflows. There is a need for a resource-efficient, keyboard-driven terminal utility that updates instantly over low-footprint data streams.

---

## 3. Scope & Target Metrics

- **Zero-Installation Execution:** Users run the application using `npx fifa-live-cli`.
- **Startup Latency:** Less than 1.5 seconds from command invocation to first render.
- **Resource Management:** Total operational footprint capped at < 80 MB memory usage.
- **API Load Allocation:** Smart background polling to stay safely within standard API-Football tier rate limits.

---

## 4. Core Feature Matrix (MVP)

### 4.1 Multi-Tab Navigation Interface

A unified dashboard using a high-performance terminal tab controller.

- **Tab 1: Live Match Dashboard:** Displays all active matches with real-time timers and scores.
- **Tab 2: Upcoming Fixtures:** Chronological schedule of future match cards grouped by date and venue.
- **Tab 3: Group Standings:** Real-time point matrix (Wins, Losses, Draws, Goal Differentials).

### 4.2 Interactive Match Details & Statistics Pane

Triggered by selecting a match card and pressing `Enter`.

- **Visual Stat Progress Bars:** Splits structural columns into Home vs Away performance using high-density horizontal Unicode terminal blocks (`█▄▆▄█`) to reflect metrics (Possession %, Shots on Target, Fouls, Cards).
- **Chronological Event Timeline:** Vertical list utilizing discrete Unicode markers for critical match changes: ⚽ (Goal), 🟨 (Yellow Card), 🟥 (Red Card), 🔄 (Substitution).

### 4.3 Pinned Score Banner

- Allows the user to "pin" a critical live match using the `U` key.
- Once pinned, a single-line micro-banner (`⚽ ARG 2 - 1 FRA (78')`) stays absolute at the top edge of the terminal frame, even if the user navigates to the Standings or Fixtures tabs.

### 4.4 Live Goal Interstitial Animation

- When background execution tracking notices a shift in match score data, the application temporarily mounts a full-screen frame-by-frame animation layer.
- Renders a sequence of pre-defined ASCII/Unicode graphic frames simulating a liquid "GOAL!" flash or ball hitting a net at 30 FPS using precision timers, auto-dismissing after 2.5 seconds.

---

## 5. UI & Aesthetic Specifications

- **Aesthetic Theme:** Clean, high-contrast "Cyberpunk" or "Old Money" minimalism. Pure black or transparent background grids using crisp neon green, amber, and deep gray accents.
- **Borders:** Fine, thin, rounded terminal border layouts (`round`).
- **Typography:** Large score and clock tracking configurations must leverage Ink's block characters or large Unicode numbers.
- **Strict Design Constraint:** **The color purple is forbidden.** Do not use purple text, borders, shadows, or background elements across any layer of the UI.

---

## 6. Technical Specifications

### 6.1 Tech Stack

- **Runtime Environment:** Node.js (v18+)
- **Language:** TypeScript (Strict Compilation Mode, ESM target)
- **TUI Framework:** `Ink` (React for CLI layout trees) + `Chalk` (Terminal coloring)
- **HTTP Client:** `Axios`
- **Data Validation:** `Zod`
- **Configuration Manager:** `dotenv`

### 6.2 Data Schema Manifest (Zod)

```typescript
import {z} from 'zod';

export const MatchSchema = z.object({
	id: z.string(),
	homeTeam: z.string(),
	awayTeam: z.string(),
	homeScore: z.number().nullable(),
	awayScore: z.number().nullable(),
	status: z.enum(['NS', '1H', 'HT', '2H', 'ET', 'PEN', 'FT']),
	elapsedTime: z.number(),
	venue: z.string(),
	city: z.string(),
});
```

---

# `gemini-skill.md` / `.cursorrules`

Save this exact markdown specification into your root directory to train Gemini/Cursor on exactly how to build and maintain this TypeScript command-line program.

````markdown
# Role & Behavioral Domain

You are an elite TypeScript systems engineer specializing in hyper-optimized, interactive Terminal User Interfaces (TUIs) built on Node.js. Your objective is to code, iterate, and refine the `FIFA Live CLI` utility using pure TypeScript, React, and Ink.

# Technical Directives & Frameworks

- **Language Stack:** TypeScript (ESM, Target: ES2022, Strict: True).
- **Core Layout Architecture:** Ink (React for terminal rendering trees).
- **Styling & Color Tools:** Chalk (Coloring), Log-Update.
- **Payload Validation Engine:** Zod (Strict schema filtering via `.safeParse()`).
- **Network Handshaking:** Axios (Asynchronous, non-blocking promise flows).

# UI Formatting & Aesthetic Guardrails

- **Design Blueprint:** High-density minimalist layout utilizing clean typography, structural grids, and thin rounded panel borders.
- **Forbidden Colors:** Under no circumstances should you ever inject the color purple into any terminal text configuration, layout borders, or notification frameworks. Use gold, white, gray, and neon green.
- **Frame-by-Frame Text Animations:** For goal flashes, do not try to parse or stream binary `.gif` images. Write a custom React hook or component that cycles through an array of multidimensional ASCII text strings via `setInterval` running at a `30ms` refresh clip to build liquid text animations natively.

# Architecture & Error Handling Paradigms

1. **Asynchronous Separation:** Keep networking tasks out of presentation layout updates. Separate concerns across cleanly mapped domains: `schemas.ts`, `api.ts`, `components/Dashboard.tsx`, and `components/GoalAnimation.tsx`.
2. **Persistent Path Storage:** When caching game scores or storing an API key, fallback to a safe, platform-agnostic configuration directory under the user's root environment:
   ```typescript
   import os from 'os';
   import path from 'path';
   const CACHE_DIRECTORY = path.join(os.homedir(), '.config', 'fifa-live-cli');
   ```
````

3. **Graceful Network Recovery:** All remote API hits must wrap safely inside try-catch closures. If a network drops or hits a 429 rate limit, pull data from the local JSON cache cache, and render a persistent warning banner inside Ink instead of allowing unhandled process crashes.

# Build Execution Steps for Code Generation

When instructed to program components, follow this order:

- **Phase 1:** Zod Type validation schemas (`src/schemas.ts`).
- **Phase 2:** Axios data service handling authorization, polling hooks, and fallback cache writes (`src/api.ts`).
- **Phase 3:** Core Ink terminal routing layer, tracking keyboard hotkeys, panel tabs, and pinned score states (`src/index.tsx`).
- **Phase 4:** Frame-by-frame text animation component handling goal alerts cleanly without UI flickering (`src/components/GoalAnimation.tsx`).

```

```
