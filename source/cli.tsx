#!/usr/bin/env node
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {render} from 'ink';
import meow from 'meow';
import App from './app.js';
import {type Match} from './schemas.js';

meow(
	`
	Usage
	  $ fifa-ts

	Options:
	  --help       Show this help message
	  --version    Show version info
`,
	{
		importMeta: import.meta,
	},
);

const pidPath = path.join(process.cwd(), 'poller.pid');

// Clear any running background poller before opening the TUI
if (fs.existsSync(pidPath)) {
	try {
		const pid = parseInt(fs.readFileSync(pidPath, 'utf-8'), 10);
		if (!isNaN(pid)) {
			process.kill(pid, 'SIGTERM');
		}
	} catch {}
	try {
		fs.unlinkSync(pidPath);
	} catch {}
}

const ENTER_ALT = '\u001B[?1049h\u001B[H';
const LEAVE_ALT = '\u001B[?1049l';

// Enter alternate screen buffer — completely isolated from normal terminal
process.stdout.write(ENTER_ALT);

// Handle external kills (OS SIGINT, SIGTERM) — restore screen before dying
process.on('SIGINT', () => {
	process.stdout.write(LEAVE_ALT);
	process.exit(0);
});

const {waitUntilExit} = render(<App />, {
	patchConsole: false,
	exitOnCtrlC: false, // We handle Ctrl+C ourselves via useInput in app.tsx
});

// Wait for the TUI to exit (triggered by useApp().exit() in app.tsx)
await waitUntilExit();

// Leave alternate screen — restores the normal terminal buffer
process.stdout.write(LEAVE_ALT);

// Print pinned score permanently into the normal terminal if one was set
const pinnedPath = path.join(process.cwd(), 'pinned_score.json');
if (fs.existsSync(pinnedPath)) {
	try {
		const pinned = JSON.parse(
			fs.readFileSync(pinnedPath, 'utf-8'),
		) as Partial<Match>;
		fs.unlinkSync(pinnedPath);

		const score = `${pinned.homeTeam ?? '?'} ${pinned.homeScore ?? 0} - ${
			pinned.awayScore ?? 0
		} ${pinned.awayTeam ?? '?'} (${pinned.elapsedTime ?? '?'}')`;

		// 1. Print a one-time pinned score line in the terminal
		process.stdout.write(
			'\n\u001B[1m\u001B[36m📌 PINNED SCORE  \u001B[0m' +
				'\u001B[1m\u001B[37m' +
				score +
				'\u001B[0m\n\n',
		);

		// 2. Write set_prompt.bat so run_cli.bat can inject score into CMD prompt
		//    This makes the score appear on EVERY command line the user types
		const promptStr = `⚽ [${score}]`;
		const batContent = [
			'@echo off',
			`title ${promptStr}`,
			`set PROMPT=${promptStr} $P$G`,
		].join('\r\n');

		fs.writeFileSync(
			path.join(process.cwd(), 'set_prompt.bat'),
			batContent,
			'utf-8',
		);

		// 3. Spawn background poller to keep updating the window title with live scores
		if (pinned.id) {
			try {
				// Re-create the json file for the poller to read/write updates
				fs.writeFileSync(pinnedPath, JSON.stringify(pinned), 'utf-8');

				const pollerPath = path.join(process.cwd(), 'dist', 'poller.js');
				const child = spawn('node', [pollerPath, pinned.id], {
					detached: true,
					stdio: 'ignore',
				});
				child.unref();

				fs.writeFileSync(pidPath, String(child.pid), 'utf-8');
			} catch {}
		}
	} catch {
		// Safe fail
	}
} else {
	// If no pinned score, make sure the prompt resets to standard
	try {
		const batContent = [
			'@echo off',
			'title Command Prompt',
			'set PROMPT=$P$G',
		].join('\r\n');
		fs.writeFileSync(
			path.join(process.cwd(), 'set_prompt.bat'),
			batContent,
			'utf-8',
		);
	} catch {}
}
