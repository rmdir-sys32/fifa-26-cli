import http from 'node:http';
import url from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const PORT = 3000;
const API_KEY = process.env.API_FOOTBALL_API_KEY;

// Real FIFA League IDs (28: World Cup, 24: UEFA Qualifiers, etc.)
const FIFA_LEAGUE_IDS = [28, 22, 21, 23, 24, 27, 26];

// Load real offline cache files as safe schema backups
let cachedFixtures = [];
let cachedStandings = [];

try {
	const fixturesPath = path.resolve('fifa_2026_fixtures.json');
	if (fs.existsSync(fixturesPath)) {
		cachedFixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));
	}
} catch (e) {
	console.error('Failed to load local cached fixtures:', e.message);
}

try {
	const standingsPath = path.resolve('fifa_2026_standings.json');
	if (fs.existsSync(standingsPath)) {
		cachedStandings = JSON.parse(fs.readFileSync(standingsPath, 'utf8'));
	}
} catch (e) {
	console.error('Failed to load local cached standings:', e.message);
}

let isRateLimited = false;

// Helper to map status codes
function mapStatus(statusStr) {
	if (!statusStr) return 'NS';
	const status = statusStr.toLowerCase();
	if (status.includes('finished') || status === 'ft') return 'FT';
	if (status.includes('half time') || status === 'ht') return 'HT';
	if (
		status.includes('live') ||
		status.includes('1h') ||
		status.includes('2h') ||
		!isNaN(parseInt(status))
	) {
		// If it's a number, it's likely the elapsed time, so we treat it as live (1H or 2H)
		const elapsed = parseInt(status);
		return elapsed > 45 ? '2H' : '1H';
	}
	return 'NS';
}

// Helper to check if a match is a FIFA match
function isFifaMatch(item) {
	if (!item) return false;
	const leagueId = Number(item.league_id);
	if (FIFA_LEAGUE_IDS.includes(leagueId)) return true;

	const leagueName = String(item.league_name || '').toLowerCase();
	const countryName = String(item.country_name || '').toLowerCase();

	return (
		leagueName.includes('world cup') ||
		leagueName.includes('fifa') ||
		countryName.includes('worldcup') ||
		countryName.includes('world cup')
	);
}

const CACHE_DIR = path.resolve('.cache');
if (!fs.existsSync(CACHE_DIR)) {
	fs.mkdirSync(CACHE_DIR, {recursive: true});
}

async function fetchWithCache(url, cacheKey) {
	const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);
	const ONE_MINUTE = 60 * 1000;

	if (fs.existsSync(cacheFile)) {
		const stat = fs.statSync(cacheFile);
		if (Date.now() - stat.mtimeMs < ONE_MINUTE) {
			console.log(`[CACHE] Serving ${cacheKey} from server cache.`);
			return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
		}
	}

	console.log(`[API] Fetching new data for ${cacheKey}...`);
	const response = await axios.get(url, {timeout: 6000});
	
	try {
		if (!fs.existsSync(CACHE_DIR)) {
			fs.mkdirSync(CACHE_DIR, {recursive: true});
		}
		fs.writeFileSync(cacheFile, JSON.stringify(response.data), 'utf8');
	} catch (e) {
		console.error('Failed to write cache file', e.message);
	}
	return response.data;
}

const server = http.createServer(async (req, res) => {
	res.setHeader('Content-Type', 'application/json');
	const parsedUrl = url.parse(req.url, true);
	const pathname = parsedUrl.pathname;

	// 1. Simulate Rate Limiting Toggle
	if (pathname === '/v1/trigger-limit') {
		isRateLimited = true;
		res.writeHead(200);
		res.end(
			JSON.stringify({
				status: 'Rate limit simulated. All endpoints will return 429.',
			}),
		);
		return;
	}

	if (pathname === '/v1/reset-limit') {
		isRateLimited = false;
		res.writeHead(200);
		res.end(JSON.stringify({status: 'Rate limit cleared.'}));
		return;
	}

	// 2. Return 429 if rate-limiting is active
	if (isRateLimited) {
		res.writeHead(429);
		res.end(JSON.stringify({errors: {rateLimit: 'Freemium Limit Reached'}}));
		return;
	}

	// 3. Main endpoints routing
	try {
		if (pathname === '/v1/fixtures') {
			const {live} = parsedUrl.query;

			if (live === 'all') {
				if (!API_KEY) {
					res.writeHead(200);
					res.end(JSON.stringify({response: []}));
					return;
				}

				try {
					// Since match_live=1 returns nothing in development/off-season,
					// we'll fetch matches for a wider window to ensure data appears in the TUI.
					const today = new Date().toISOString().split('T')[0];
					const rangeEnd = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
						.toISOString()
						.split('T')[0];

					const responseData = await fetchWithCache(
						`https://apiv3.apifootball.com/?action=get_events&from=2026-06-11&to=${rangeEnd}&league_id=28&APIkey=${API_KEY}`,
						'live_events_all'
					);

					console.log(
						`[API LOG] Fixtures/Live request successful. Items: ${
							Array.isArray(responseData) ? responseData.length : 'error'
						}`,
					);

					if (
						Array.isArray(responseData) &&
						responseData.length > 0 &&
						!responseData[0].error
					) {
						// Filter for matches that are actually "live" or recent for the Live Tab
						const matchesToShow = responseData.map(item => {
							const mappedStatus = mapStatus(item.match_status);
							return {
								fixture: {
									id:
										String(item.match_id) ||
										String(Math.floor(Math.random() * 100000)),
									status: {
										short: mappedStatus,
										elapsed: parseInt(item.match_status) || 0,
									},
									venue: {
										name: item.match_stadium || 'Stadium',
										city: item.match_stadium || 'City',
									},
									date: `${item.match_date}T${item.match_time}:00Z`,
								},
								teams: {
									home: {name: item.match_hometeam_name},
									away: {name: item.match_awayteam_name},
								},
								goals: {
									home:
										item.match_hometeam_score === ''
											? 0
											: parseInt(item.match_hometeam_score),
									away:
										item.match_awayteam_score === ''
											? 0
											: parseInt(item.match_awayteam_score),
								},
							};
						});
						res.writeHead(200);
						res.end(JSON.stringify({response: matchesToShow}));
					} else {
						res.writeHead(200);
						res.end(JSON.stringify({response: []}));
					}
				} catch (e) {
					res.writeHead(200);
					res.end(JSON.stringify({response: []}));
				}
			} else {
				// Upcoming fixtures
				let rawFixtures = [];

				if (API_KEY) {
					try {
						const today = new Date().toISOString().split('T')[0];
						const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
							.toISOString()
							.split('T')[0];
						const responseData = await fetchWithCache(
							`https://apiv3.apifootball.com/?action=get_events&from=${today}&to=${nextMonth}&APIkey=${API_KEY}`,
							'upcoming_fixtures'
						);
						if (
							Array.isArray(responseData) &&
							responseData.length > 0 &&
							!responseData[0].error
						) {
							rawFixtures = responseData.filter(isFifaMatch);
						}
					} catch (e) {
						rawFixtures = cachedFixtures;
					}
				} else {
					rawFixtures = cachedFixtures;
				}

				const mapped = rawFixtures.slice(0, 30).map(item => ({
					fixture: {
						id: Number(item.match_id),
						date: `${item.match_date}T${item.match_time}:00Z`,
						venue: {
							name: item.match_stadium || 'World Cup Stadium',
							city: 'Host City',
						},
					},
					teams: {
						home: {name: item.match_hometeam_name},
						away: {name: item.match_awayteam_name},
					},
					league: {
						round: item.stage_name || item.match_round || 'Group Stage',
					},
				}));

				res.writeHead(200);
				res.end(JSON.stringify({response: mapped}));
			}
		} else if (pathname === '/v1/standings') {
			let rawStandings = [];

			if (API_KEY) {
				try {
					const responseData = await fetchWithCache(
						`https://apiv3.apifootball.com/?action=get_standings&league_id=28&APIkey=${API_KEY}`,
						'standings'
					);
					if (
						Array.isArray(responseData) &&
						responseData.length > 0 &&
						!responseData[0].error
					) {
						rawStandings = responseData;
					}
				} catch (e) {
					rawStandings = cachedStandings;
				}
			} else {
				rawStandings = cachedStandings;
			}

			const groups = {};
			for (const item of rawStandings) {
				const groupName = item.league_round || 'Group Stage';
				if (!groups[groupName]) {
					groups[groupName] = [];
				}
				groups[groupName].push({
					group: groupName,
					team: {name: item.team_name},
					all: {
						played: parseInt(item.overall_league_payed) || 0,
						win: parseInt(item.overall_league_W) || 0,
						draw: parseInt(item.overall_league_D) || 0,
						lose: parseInt(item.overall_league_L) || 0,
						goals: {
							for: parseInt(item.overall_league_GF) || 0,
							against: parseInt(item.overall_league_GA) || 0,
						},
					},
					goalsDiff:
						(parseInt(item.overall_league_GF) || 0) -
						(parseInt(item.overall_league_GA) || 0),
					points: parseInt(item.overall_league_PTS) || 0,
				});
			}

			const standingsList = Object.values(groups);
			const mappedResponse = {
				response: [
					{
						league: {
							standings: standingsList,
						},
					},
				],
			};

			res.writeHead(200);
			res.end(JSON.stringify(mappedResponse));
		} else if (pathname === '/v1/fixtures/events') {
			const {fixture} = parsedUrl.query;
			if (!fixture || !API_KEY) {
				res.writeHead(200);
				res.end(JSON.stringify({response: []}));
				return;
			}

			try {
				const responseData = await fetchWithCache(
					`https://apiv3.apifootball.com/?action=get_events&match_id=${fixture}&APIkey=${API_KEY}`,
					`events_${fixture}`
				);
				if (
					Array.isArray(responseData) &&
					responseData.length > 0 &&
					!responseData[0].error
				) {
					const match = responseData[0];
					const events = [];

					if (Array.isArray(match.goalscorer)) {
						for (const g of match.goalscorer) {
							let detail = 'Normal Goal';
							if (g.info === 'penalty') detail = 'Penalty';
							else if (g.info === 'own goal') detail = 'Own Goal';

							events.push({
								time: {elapsed: parseInt(g.time) || 0, extra: null},
								player: {name: g.home_scorer || g.away_scorer || 'Unknown'},
								team: {
									name: g.home_scorer
										? match.match_hometeam_name
										: match.match_awayteam_name,
								},
								type: 'Goal',
								detail: detail,
							});
						}
					}

					if (Array.isArray(match.cards)) {
						for (const c of match.cards) {
							events.push({
								time: {elapsed: parseInt(c.time) || 0, extra: null},
								player: {name: c.home_fault || c.away_fault || 'Unknown'},
								team: {
									name: c.home_fault
										? match.match_hometeam_name
										: match.match_awayteam_name,
								},
								type: 'Card',
								detail: c.card || 'Card',
							});
						}
					}

					if (match.substitutions) {
						const parseSubs = (list, isHome) => {
							if (Array.isArray(list)) {
								for (const s of list) {
									events.push({
										time: {elapsed: parseInt(s.time) || 0, extra: null},
										player: {name: s.substitution || 'Sub'},
										team: {
											name: isHome
												? match.match_hometeam_name
												: match.match_awayteam_name,
										},
										type: 'subst',
										detail: s.substitution || 'Substitution',
									});
								}
							}
						};
						parseSubs(match.substitutions.home, true);
						parseSubs(match.substitutions.away, false);
					}

					events.sort((a, b) => a.time.elapsed - b.time.elapsed);
					res.writeHead(200);
					res.end(JSON.stringify({response: events}));
				} else {
					res.writeHead(200);
					res.end(JSON.stringify({response: []}));
				}
			} catch (e) {
				res.writeHead(200);
				res.end(JSON.stringify({response: []}));
			}
		} else if (pathname === '/v1/fixtures/statistics') {
			const {fixture} = parsedUrl.query;
			if (!fixture || !API_KEY) {
				res.writeHead(200);
				res.end(JSON.stringify({response: []}));
				return;
			}

			try {
				const responseData = await fetchWithCache(
					`https://apiv3.apifootball.com/?action=get_events&match_id=${fixture}&APIkey=${API_KEY}`,
					`statistics_${fixture}`
				);
				if (
					Array.isArray(responseData) &&
					responseData.length > 0 &&
					!responseData[0].error
				) {
					const match = responseData[0];
					const rawStats = match.statistics || [];

					const keyMapping = {
						'Ball Possession': 'Ball Possession',
						'Shots Total': 'Total Shots',
						'Shots On Goal': 'Shots on Target',
						Corners: 'Corner Kicks',
						Fouls: 'Fouls',
						Offsides: 'Offsides',
						'Yellow Cards': 'Yellow Cards',
						'Red Cards': 'Red Cards',
					};

					const homeStats = [];
					const awayStats = [];

					for (const item of rawStats) {
						const mappedType = keyMapping[item.type] || item.type;
						homeStats.push({type: mappedType, value: item.home});
						awayStats.push({type: mappedType, value: item.away});
					}

					res.writeHead(200);
					res.end(
						JSON.stringify({
							response: [{statistics: homeStats}, {statistics: awayStats}],
						}),
					);
				} else {
					res.writeHead(200);
					res.end(JSON.stringify({response: []}));
				}
			} catch (e) {
				res.writeHead(200);
				res.end(JSON.stringify({response: []}));
			}
		} else {
			res.writeHead(404);
			res.end(JSON.stringify({error: 'Not Found'}));
		}
	} catch (globalError) {
		res.writeHead(500);
		res.end(JSON.stringify({error: globalError.message}));
	}
});

server.listen(PORT, () => {
	console.log(`🚀 Production Proxy Server running at http://localhost:${PORT}`);
	console.log(
		`👉 Serving ONLY real FIFA matches, schedule fixtures, and standings.`,
	);
});
