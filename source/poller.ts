import fs from 'node:fs';
import path from 'node:path';
import {getLiveMatches} from './api.js';

const matchId = process.argv[2];
if (!matchId) {
	process.exit(0);
}

let fd: number | undefined;
try {
	fd = fs.openSync('CONOUT$', 'w');
} catch {
	// Fallback if not on windows or CONOUT$ is not accessible
}

const updateTitle = (text: string) => {
	if (fd !== undefined) {
		try {
			fs.writeSync(fd, `\u001B]0;${text}\u0007`);
		} catch {}
	}
};

const poll = async () => {
	try {
		const matchRes = await getLiveMatches();
		const match = matchRes.data.find(m => m.id === matchId);
		if (match) {
			const score = `⚽ [${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam} (${match.elapsedTime}')]`;
			updateTitle(score);

			// Write updated score to pinned_score.json
			fs.writeFileSync(
				path.join(process.cwd(), 'pinned_score.json'),
				JSON.stringify(match),
				'utf-8',
			);
		} else {
			process.exit(0);
		}
	} catch {
		// Silent retry
	}
};

// Initial update
poll();

// Interval poll every 30 seconds
setInterval(poll, 30_000);
