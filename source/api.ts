import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import axios from 'axios';
import dotenv from 'dotenv';
import {
	type Match,
	MatchSchema,
	type Fixture,
	FixtureSchema,
	type Standing,
	StandingSchema,
	type MatchEvent,
	MatchEventSchema,
	type MatchStats,
	MatchStatsSchema,
} from './schemas.js';

dotenv.config();

const CACHE_DIRECTORY = path.join(os.homedir(), '.config', 'fifa-live-cli');

export class RateLimitError extends Error {
	constructor() {
		super('Rate limit exceeded');
		this.name = 'RateLimitError';
	}
}

let activeProxyUrl = 'http://localhost:3000/v1';

export function setProxyUrl(url: string) {
	activeProxyUrl = url;
}

export function getProxyUrl(): string {
	return activeProxyUrl;
}

// Initial premium Mock Data matching the PRD and python dashboard
export const MOCK_MATCHES: Match[] = [
	{
		id: 'mex-can-2026',
		homeTeam: 'MEX',
		awayTeam: 'CAN',
		homeScore: 2,
		awayScore: 1,
		status: '2H',
		elapsedTime: 67,
		venue: 'Estadio Azteca',
		city: 'Mexico City',
	},
	{
		id: 'usa-ger-2026',
		homeTeam: 'USA',
		awayTeam: 'GER',
		homeScore: 0,
		awayScore: 0,
		status: '1H',
		elapsedTime: 34,
		venue: 'MetLife Stadium',
		city: 'East Rutherford',
	},
];

export const MOCK_FIXTURES: Fixture[] = [
	{
		id: 'esp-mar-2026',
		homeTeam: 'ESP',
		awayTeam: 'MAR',
		date: 'Tomorrow',
		time: '18:00',
		venue: 'Estadio Azteca',
		city: 'Mexico City',
		stage: 'Group Stage',
	},
	{
		id: 'bra-fra-2026',
		homeTeam: 'BRA',
		awayTeam: 'FRA',
		date: 'Jun 13',
		time: '21:00',
		venue: 'MetLife Stadium',
		city: 'NY/NJ',
		stage: 'Group Stage',
	},
];

export const MOCK_STANDINGS: Standing[] = [
	{
		group: 'Group A',
		team: 'MEX',
		played: 2,
		won: 1,
		drawn: 1,
		lost: 0,
		goalsFor: 3,
		goalsAgainst: 2,
		goalDifference: 1,
		points: 4,
	},
	{
		group: 'Group A',
		team: 'CAN',
		played: 2,
		won: 1,
		drawn: 0,
		lost: 1,
		goalsFor: 2,
		goalsAgainst: 2,
		goalDifference: 0,
		points: 3,
	},
	{
		group: 'Group A',
		team: 'USA',
		played: 2,
		won: 0,
		drawn: 1,
		lost: 1,
		goalsFor: 1,
		goalsAgainst: 2,
		goalDifference: -1,
		points: 1,
	},
	{
		group: 'Group A',
		team: 'GER',
		played: 2,
		won: 0,
		drawn: 1,
		lost: 1,
		goalsFor: 1,
		goalsAgainst: 2,
		goalDifference: -1,
		points: 1,
	},

	{
		group: 'Group B',
		team: 'ESP',
		played: 0,
		won: 0,
		drawn: 0,
		lost: 0,
		goalsFor: 0,
		goalsAgainst: 0,
		goalDifference: 0,
		points: 0,
	},
	{
		group: 'Group B',
		team: 'MAR',
		played: 0,
		won: 0,
		drawn: 0,
		lost: 0,
		goalsFor: 0,
		goalsAgainst: 0,
		goalDifference: 0,
		points: 0,
	},
	{
		group: 'Group B',
		team: 'BRA',
		played: 0,
		won: 0,
		drawn: 0,
		lost: 0,
		goalsFor: 0,
		goalsAgainst: 0,
		goalDifference: 0,
		points: 0,
	},
	{
		group: 'Group B',
		team: 'FRA',
		played: 0,
		won: 0,
		drawn: 0,
		lost: 0,
		goalsFor: 0,
		goalsAgainst: 0,
		goalDifference: 0,
		points: 0,
	},
];

const MOCK_EVENTS: Record<string, MatchEvent[]> = {
	'mex-can-2026': [
		{minute: 12, player: 'Santiago Giménez', team: 'MEX', eventType: 'GOAL'},
		{minute: 45, player: 'Alphonso Davies', team: 'CAN', eventType: 'YELLOW'},
		{minute: 58, player: 'Jonathan David', team: 'CAN', eventType: 'GOAL'},
		{minute: 65, player: 'Hirving Lozano', team: 'MEX', eventType: 'GOAL'},
	],
	'usa-ger-2026': [
		{minute: 22, player: 'Weston McKennie', team: 'USA', eventType: 'YELLOW'},
	],
};

const MOCK_STATS: Record<string, MatchStats> = {
	'mex-can-2026': {
		possessionHome: 55,
		possessionAway: 45,
		shotsHome: 12,
		shotsAway: 8,
		shotsOnTargetHome: 6,
		shotsOnTargetAway: 3,
		cornersHome: 4,
		cornersAway: 3,
		foulsHome: 10,
		foulsAway: 12,
		offsidesHome: 1,
		offsidesAway: 2,
		yellowHome: 1,
		yellowAway: 2,
		redHome: 0,
		redAway: 0,
	},
	'usa-ger-2026': {
		possessionHome: 48,
		possessionAway: 52,
		shotsHome: 7,
		shotsAway: 9,
		shotsOnTargetHome: 2,
		shotsOnTargetAway: 4,
		cornersHome: 3,
		cornersAway: 5,
		foulsHome: 14,
		foulsAway: 11,
		offsidesHome: 3,
		offsidesAway: 1,
		yellowHome: 1,
		yellowAway: 0,
		redHome: 0,
		redAway: 0,
	},
};

// Helper: Make sure cache dir exists
function ensureCacheDir() {
	if (!fs.existsSync(CACHE_DIRECTORY)) {
		fs.mkdirSync(CACHE_DIRECTORY, {recursive: true});
	}
}

// Cache operations
function writeToCache(fileName: string, data: any) {
	try {
		ensureCacheDir();
		fs.writeFileSync(
			path.join(CACHE_DIRECTORY, fileName),
			JSON.stringify(data, null, 2),
			'utf-8',
		);
	} catch {
		// Silent fail to prevent TUI crashes
	}
}

function readFromCache<T>(fileName: string, fallback: T): T {
	try {
		const filePath = path.join(CACHE_DIRECTORY, fileName);
		if (fs.existsSync(filePath)) {
			return JSON.parse(fs.readFileSync(filePath, 'utf8'));
		}
	} catch {
		// Silent fail
	}

	return fallback;
}

// API Call Wrapper with local JSON caching
export async function getLiveMatches(): Promise<{
	data: Match[];
	fromCache: boolean;
}> {
	if (!getApiKey()) {
		return {
			data: readFromCache('live_matches.json', MOCK_MATCHES),
			fromCache: true,
		};
	}

	try {
		const response = await axios.get(`${API_BASE_URL}/fixtures`, {
			headers: {
				'x-rapidapi-key': getApiKey(),
				'x-rapidapi-host': RAPIDAPI_HOST,
			},
			params: {
				live: 'all',
				league: '1', // World Cup league ID or similar
			},
			timeout: 5000,
		});

		// Parse/validate and transform into Match structure
		const parsedData: Match[] = [];
		if (response.data?.response) {
			for (const item of response.data.response) {
				const matchObject = {
					id: String(item.fixture.id),
					homeTeam: item.teams.home.name,
					awayTeam: item.teams.away.name,
					homeScore: item.goals.home,
					awayScore: item.goals.away,
					status: item.fixture.status.short, // NS, 1H, etc.
					elapsedTime: item.fixture.status.elapsed || 0,
					venue: item.fixture.venue.name || 'Stadium',
					city: item.fixture.venue.city || 'City',
				};
				const validation = MatchSchema.safeParse(matchObject);
				if (validation.success) {
					parsedData.push(validation.data);
				}
			}
		}

		if (parsedData.length > 0) {
			writeToCache('live_matches.json', parsedData);
			return {data: parsedData, fromCache: false};
		}

		return {
			data: readFromCache('live_matches.json', MOCK_MATCHES),
			fromCache: true,
		};
	} catch {
		return {
			data: readFromCache('live_matches.json', MOCK_MATCHES),
			fromCache: true,
		};
	}
}

export async function getUpcomingFixtures(): Promise<{
	data: Fixture[];
	fromCache: boolean;
}> {
	if (!getApiKey()) {
		return {
			data: readFromCache('upcoming_fixtures.json', MOCK_FIXTURES),
			fromCache: true,
		};
	}

	try {
		const response = await axios.get(`${API_BASE_URL}/fixtures`, {
			headers: {
				'x-rapidapi-key': getApiKey(),
				'x-rapidapi-host': RAPIDAPI_HOST,
			},
			params: {
				league: '1',
				season: '2026',
				next: '20',
			},
			timeout: 5000,
		});

		const parsedData: Fixture[] = [];
		if (response.data?.response) {
			for (const item of response.data.response) {
				const fixtureObject = {
					id: String(item.fixture.id),
					homeTeam: item.teams.home.name,
					awayTeam: item.teams.away.name,
					date: new Date(item.fixture.date).toLocaleDateString(undefined, {
						month: 'short',
						day: 'numeric',
					}),
					time: new Date(item.fixture.date).toLocaleTimeString(undefined, {
						hour: '2-digit',
						minute: '2-digit',
						hour12: false,
					}),
					venue: item.fixture.venue.name || 'Stadium',
					city: item.fixture.venue.city || 'City',
					stage: item.league.round || 'Group Stage',
				};
				const validation = FixtureSchema.safeParse(fixtureObject);
				if (validation.success) {
					parsedData.push(validation.data);
				}
			}
		}

		if (parsedData.length > 0) {
			writeToCache('upcoming_fixtures.json', parsedData);
			return {data: parsedData, fromCache: false};
		}

		return {
			data: readFromCache('upcoming_fixtures.json', MOCK_FIXTURES),
			fromCache: true,
		};
	} catch {
		return {
			data: readFromCache('upcoming_fixtures.json', MOCK_FIXTURES),
			fromCache: true,
		};
	}
}

export async function getGroupStandings(): Promise<{
	data: Standing[];
	fromCache: boolean;
}> {
	if (!getApiKey()) {
		return {
			data: readFromCache('group_standings.json', MOCK_STANDINGS),
			fromCache: true,
		};
	}

	try {
		const response = await axios.get(`${API_BASE_URL}/standings`, {
			headers: {
				'x-rapidapi-key': getApiKey(),
				'x-rapidapi-host': RAPIDAPI_HOST,
			},
			params: {
				league: '1',
				season: '2026',
			},
			timeout: 5000,
		});

		const parsedData: Standing[] = [];
		if (response.data?.response) {
			const leagues = response.data.response[0]?.league?.standings || [];
			for (const groupTable of leagues) {
				for (const row of groupTable) {
					const standingObject = {
						group: row.group,
						team: row.team.name,
						played: row.all.played,
						won: row.all.win,
						drawn: row.all.draw,
						lost: row.all.lose,
						goalsFor: row.all.goals.for,
						goalsAgainst: row.all.goals.against,
						goalDifference: row.goalsDiff,
						points: row.points,
					};
					const validation = StandingSchema.safeParse(standingObject);
					if (validation.success) {
						parsedData.push(validation.data);
					}
				}
			}
		}

		if (parsedData.length > 0) {
			writeToCache('group_standings.json', parsedData);
			return {data: parsedData, fromCache: false};
		}

		return {
			data: readFromCache('group_standings.json', MOCK_STANDINGS),
			fromCache: true,
		};
	} catch {
		return {
			data: readFromCache('group_standings.json', MOCK_STANDINGS),
			fromCache: true,
		};
	}
}

export async function getMatchDetails(
	id: string,
): Promise<{data: MatchEvent[]; fromCache: boolean}> {
	if (!getApiKey() || id.includes('mock')) {
		return {data: MOCK_EVENTS[id] || [], fromCache: true};
	}

	try {
		const response = await axios.get(`${API_BASE_URL}/fixtures/events`, {
			headers: {
				'x-rapidapi-key': getApiKey(),
				'x-rapidapi-host': RAPIDAPI_HOST,
			},
			params: {
				fixture: id,
			},
			timeout: 5000,
		});

		const parsedData: MatchEvent[] = [];
		if (response.data?.response) {
			for (const item of response.data.response) {
				let type: 'GOAL' | 'OWN_GOAL' | 'YELLOW' | 'RED' | 'SUB' | 'PENALTY' =
					'YELLOW';
				switch (item.type) {
					case 'Goal': {
						if (item.detail === 'Own Goal') type = 'OWN_GOAL';
						else if (item.detail === 'Penalty') type = 'PENALTY';
						else type = 'GOAL';

						break;
					}

					case 'Card': {
						type = item.detail === 'Red Card' ? 'RED' : 'YELLOW';

						break;
					}

					case 'subst': {
						type = 'SUB';

						break;
					}
					// No default
				}

				const eventObject = {
					minute: item.time.elapsed,
					extraMinute: item.time.extra,
					player: item.player.name || 'Unknown Player',
					team: item.team.name,
					eventType: type,
				};
				const validation = MatchEventSchema.safeParse(eventObject);
				if (validation.success) {
					parsedData.push(validation.data);
				}
			}
		}

		return {data: parsedData, fromCache: false};
	} catch {
		return {data: [], fromCache: true};
	}
}

export async function getMatchStats(
	id: string,
): Promise<{data: MatchStats | undefined; fromCache: boolean}> {
	if (!getApiKey() || id.includes('mock')) {
		return {data: MOCK_STATS[id] || undefined, fromCache: true};
	}

	try {
		const response = await axios.get(`${API_BASE_URL}/fixtures/statistics`, {
			headers: {
				'x-rapidapi-key': getApiKey(),
				'x-rapidapi-host': RAPIDAPI_HOST,
			},
			params: {
				fixture: id,
			},
			timeout: 5000,
		});

		if (response.data?.response && response.data.response.length >= 2) {
			const homeStatsRaw = response.data.response[0].statistics;
			const awayStatsRaw = response.data.response[1].statistics;

			const getStat = (statsArray: any[], name: string): any => {
				const statItem = statsArray.find((s: any) => s.type === name);
				return statItem ? statItem.value : null;
			};

			const cleanPossession = (value: any) => {
				if (!value) return 50;
				return Number.parseInt(String(value).replace('%', ''), 10);
			};

			const statsObject = {
				possessionHome: cleanPossession(
					getStat(homeStatsRaw, 'Ball Possession'),
				),
				possessionAway: cleanPossession(
					getStat(awayStatsRaw, 'Ball Possession'),
				),
				shotsHome: Number(getStat(homeStatsRaw, 'Total Shots') || 0),
				shotsAway: Number(getStat(awayStatsRaw, 'Total Shots') || 0),
				shotsOnTargetHome: Number(
					getStat(homeStatsRaw, 'Shots on Target') || 0,
				),
				shotsOnTargetAway: Number(
					getStat(awayStatsRaw, 'Shots on Target') || 0,
				),
				cornersHome: Number(getStat(homeStatsRaw, 'Corner Kicks') || 0),
				cornersAway: Number(getStat(awayStatsRaw, 'Corner Kicks') || 0),
				foulsHome: Number(getStat(homeStatsRaw, 'Fouls') || 0),
				foulsAway: Number(getStat(awayStatsRaw, 'Fouls') || 0),
				offsidesHome: Number(getStat(homeStatsRaw, 'Offsides') || 0),
				offsidesAway: Number(getStat(awayStatsRaw, 'Offsides') || 0),
				yellowHome: Number(getStat(homeStatsRaw, 'Yellow Cards') || 0),
				yellowAway: Number(getStat(awayStatsRaw, 'Yellow Cards') || 0),
				redHome: Number(getStat(homeStatsRaw, 'Red Cards') || 0),
				redAway: Number(getStat(awayStatsRaw, 'Red Cards') || 0),
			};

			const validation = MatchStatsSchema.safeParse(statsObject);
			if (validation.success) {
				return {data: validation.data, fromCache: false};
			}
		}

		return {data: undefined, fromCache: true};
	} catch {
		return {data: undefined, fromCache: true};
	}
}
