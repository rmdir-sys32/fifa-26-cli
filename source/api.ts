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

// No hardcoded mock data — production mode only serves real FIFA data.
export const MOCK_MATCHES: Match[] = [];

export const MOCK_FIXTURES: Fixture[] = [];

export const MOCK_STANDINGS: Standing[] = [];




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
	try {
		const response = await axios.get(`${getProxyUrl()}/fixtures`, {
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
	} catch (error: any) {
		if (error?.response?.status === 429) {
			throw new RateLimitError();
		}
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
	try {
		const response = await axios.get(`${getProxyUrl()}/fixtures`, {
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
	} catch (error: any) {
		if (error?.response?.status === 429) {
			throw new RateLimitError();
		}
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
	try {
		const response = await axios.get(`${getProxyUrl()}/standings`, {
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
	} catch (error: any) {
		if (error?.response?.status === 429) {
			throw new RateLimitError();
		}
		return {
			data: readFromCache('group_standings.json', MOCK_STANDINGS),
			fromCache: true,
		};
	}
}

export async function getMatchDetails(
	id: string,
): Promise<{data: MatchEvent[]; fromCache: boolean}> {


	try {
		const response = await axios.get(`${getProxyUrl()}/fixtures/events`, {
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
	} catch (error: any) {
		if (error?.response?.status === 429) {
			throw new RateLimitError();
		}
		return {data: [], fromCache: true};
	}
}

export async function getMatchStats(
	id: string,
): Promise<{data: MatchStats | undefined; fromCache: boolean}> {


	try {
		const response = await axios.get(`${getProxyUrl()}/fixtures/statistics`, {
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
	} catch (error: any) {
		if (error?.response?.status === 429) {
			throw new RateLimitError();
		}
		return {data: undefined, fromCache: true};
	}
}
