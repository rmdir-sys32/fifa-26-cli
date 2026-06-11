import fs from 'node:fs';
import path from 'node:path';
import {Box, Text, useInput, useApp} from 'ink';
import React, {useState, useEffect} from 'react';
import {
	getLiveMatches,
	getUpcomingFixtures,
	getGroupStandings,
	getMatchDetails,
	setProxyUrl,
	RateLimitError,
	MOCK_MATCHES,
	MOCK_FIXTURES,
	MOCK_STANDINGS,
} from './api.js';
import {
	type Match,
	type Fixture,
	type Standing,
	type MatchEvent,
} from './schemas.js';
import GoalAnimation from './components/GoalAnimation.js';
import {readConfig} from './storage.js';

interface KeyControllerProps {
	activeTab: 'dashboard' | 'fixtures' | 'standings';
	setActiveTab: React.Dispatch<
		React.SetStateAction<'dashboard' | 'fixtures' | 'standings'>
	>;
	appData: {
		matches: Match[];
		fixtures: Fixture[];
		standings: Standing[];
		matchEventsMap: Record<string, MatchEvent[]>;
		fromCache: boolean;
	};
	setSelectedFixtureIdx: React.Dispatch<React.SetStateAction<number>>;
	pinnedMatch: Match | undefined;
	setPinnedMatch: React.Dispatch<React.SetStateAction<Match | undefined>>;
	setShowGoalAnim: React.Dispatch<React.SetStateAction<boolean>>;
	loadData: () => Promise<void>;
	setRateLimited: React.Dispatch<React.SetStateAction<boolean>>;
	setRateLimitCountdown: React.Dispatch<React.SetStateAction<number>>;
	exit: () => void;
}

function KeyController({
	activeTab,
	setActiveTab,
	appData,
	setSelectedFixtureIdx,
	pinnedMatch,
	setPinnedMatch,
	setShowGoalAnim,
	loadData,
	setRateLimited,
	setRateLimitCountdown,
	exit,
}: KeyControllerProps) {
	useInput((input, key) => {
		// Tab switching
		if (input === '1') setActiveTab('dashboard');
		if (input === '2') setActiveTab('fixtures');
		if (input === '3') setActiveTab('standings');

		if (key.leftArrow) {
			if (activeTab === 'fixtures') setActiveTab('dashboard');
			else if (activeTab === 'standings') setActiveTab('fixtures');
		}

		if (key.rightArrow) {
			if (activeTab === 'dashboard') setActiveTab('fixtures');
			else if (activeTab === 'fixtures') setActiveTab('standings');
		}

		// Fixture navigation
		if (activeTab === 'fixtures' && appData.fixtures.length > 0) {
			if (key.upArrow) {
				setSelectedFixtureIdx(prev =>
					prev > 0 ? prev - 1 : appData.fixtures.length - 1,
				);
			}

			if (key.downArrow) {
				setSelectedFixtureIdx(prev =>
					prev < appData.fixtures.length - 1 ? prev + 1 : 0,
				);
			}
		}

		// Pin score of first match
		if (input === 'p' && appData.matches.length > 0) {
			setPinnedMatch(appData.matches[0] || undefined);
		}

		if (input === 'u') {
			setPinnedMatch(undefined);
		}

		if (input === 'g') {
			setShowGoalAnim(true);
		}

		if (input === 'r') {
			setRateLimited(false);
			setRateLimitCountdown(0);
			loadData();
		}

		// Exit
		if (key.ctrl && input === 'c') {
			if (pinnedMatch) {
				try {
					fs.writeFileSync(
						path.join(process.cwd(), 'pinned_score.json'),
						JSON.stringify(pinnedMatch),
						'utf-8',
					);
				} catch {
					// Safe fail
				}
			}

			exit();
		}
	});

	return null;
}

export default function App({dryRun = false}: {dryRun?: boolean}) {
	const {exit} = useApp();

	const [terminalWidth, setTerminalWidth] = useState(
		process.stdout.columns || 80,
	);

	useEffect(() => {
		const handleResize = () => {
			setTerminalWidth(process.stdout.columns || 80);
		};

		process.stdout.on('resize', handleResize);
		return () => {
			process.stdout.off('resize', handleResize);
		};
	}, []);

	// Tabs: 'dashboard' | 'fixtures' | 'standings'
	const [activeTab, setActiveTab] = useState<
		'dashboard' | 'fixtures' | 'standings'
	>('dashboard');

	// Pinned score
	const [pinnedMatch, setPinnedMatch] = useState<Match | undefined>(() => {
		try {
			const pinnedPath = path.join(process.cwd(), 'pinned_score.json');
			if (fs.existsSync(pinnedPath)) {
				return JSON.parse(fs.readFileSync(pinnedPath, 'utf-8')) as Match;
			}
		} catch {}
		return undefined;
	});

	// Unified data state
	const [appData, setAppData] = useState<{
		matches: Match[];
		fixtures: Fixture[];
		standings: Standing[];
		matchEventsMap: Record<string, MatchEvent[]>;
		fromCache: boolean;
	}>({
		matches: [],
		fixtures: [],
		standings: [],
		matchEventsMap: {},
		fromCache: false,
	});

	// Navigation index (for fixtures tab only)
	const [selectedFixtureIdx, setSelectedFixtureIdx] = useState(0);

	// Status flags
	const [showGoalAnim, setShowGoalAnim] = useState(false);
	const [initialized, setInitialized] = useState(false);
	const [rateLimited, setRateLimited] = useState(false);
	const [rateLimitCountdown, setRateLimitCountdown] = useState(0);

	// Load all data including events for all live matches
	const loadData = async () => {
		try {
			const [matchRes, fixtureRes, standingRes] = await Promise.all([
				getLiveMatches(),
				getUpcomingFixtures(),
				getGroupStandings(),
			]);

			// Load events for all live matches in parallel
			const eventResults = await Promise.all(
				matchRes.data.map(async m => {
					const evRes = await getMatchDetails(m.id);
					return {id: m.id, events: evRes.data};
				}),
			);

			const matchEventsMap: Record<string, MatchEvent[]> = {};
			for (const r of eventResults) {
				matchEventsMap[r.id] = r.events;
			}

			setAppData({
				matches: matchRes.data,
				fixtures: fixtureRes.data,
				standings: standingRes.data,
				matchEventsMap,
				fromCache:
					matchRes.fromCache || fixtureRes.fromCache || standingRes.fromCache,
			});

			if (selectedFixtureIdx >= fixtureRes.data.length) {
				setSelectedFixtureIdx(0);
			}
		} catch (err) {
			if (err instanceof RateLimitError) {
				setRateLimited(true);
				setRateLimitCountdown(900); // 15 minutes
			} else {
				setAppData(prev => ({...prev, fromCache: true}));
			}
		}
	};

	// Configuration load
	useEffect(() => {
		let timer: NodeJS.Timeout;
		const init = async () => {
			if (dryRun) {
				setAppData({
					matches: MOCK_MATCHES,
					fixtures: MOCK_FIXTURES,
					standings: MOCK_STANDINGS,
					matchEventsMap: {
						'mex-can-2026': [
							{
								minute: 12,
								player: 'Santiago Giménez',
								team: 'MEX',
								eventType: 'GOAL',
							},
							{
								minute: 58,
								player: 'Jonathan David',
								team: 'CAN',
								eventType: 'GOAL',
							},
							{
								minute: 65,
								player: 'Hirving Lozano',
								team: 'MEX',
								eventType: 'GOAL',
							},
						],
					},
					fromCache: true,
				});
				setInitialized(true);
				timer = setTimeout(() => {
					exit();
				}, 100);
				return;
			}

			const config = await readConfig();
			if (config.PROXY_BASE_URL) {
				setProxyUrl(config.PROXY_BASE_URL);
			}
			setInitialized(true);
		};
		init();

		return () => {
			if (timer) {
				clearTimeout(timer);
			}
		};
	}, [dryRun]);

	// Rate limit countdown decrement
	useEffect(() => {
		if (!rateLimited || rateLimitCountdown <= 0) {
			if (rateLimited && rateLimitCountdown <= 0) {
				setRateLimited(false);
			}
			return;
		}

		const timer = setTimeout(() => {
			setRateLimitCountdown(prev => prev - 1);
		}, 1000);

		return () => clearTimeout(timer);
	}, [rateLimited, rateLimitCountdown]);

	// Polling and data loading trigger
	useEffect(() => {
		if (!initialized || dryRun || rateLimited) {
			return;
		}

		loadData();
		const interval = setInterval(async () => {
			try {
				const matchRes = await getLiveMatches();
				const eventResults = await Promise.all(
					matchRes.data.map(async m => {
						const evRes = await getMatchDetails(m.id);
						return {id: m.id, events: evRes.data};
					}),
				);

				const matchEventsMap: Record<string, MatchEvent[]> = {};
				for (const r of eventResults) {
					matchEventsMap[r.id] = r.events;
				}

				setAppData(prev => ({
					...prev,
					matches: matchRes.data,
					matchEventsMap,
				}));
			} catch (err) {
				if (err instanceof RateLimitError) {
					setRateLimited(true);
					setRateLimitCountdown(900);
				}
			}
		}, 30_000);

		return () => {
			clearInterval(interval);
		};
	}, [initialized, dryRun, rateLimited]);

	if (!initialized) {
		return (
			<Box padding={1}>
				<Text color="yellow">⏳ Loading configuration...</Text>
			</Box>
		);
	}

	if (showGoalAnim) {
		return (
			<GoalAnimation
				onFinish={() => {
					setShowGoalAnim(false);
				}}
			/>
		);
	}

	const dividerStr = '─'.repeat(Math.max(20, terminalWidth - 2));
	const halfWidth = Math.floor((terminalWidth - 4) / 2);

	return (
		<Box flexDirection="column" width={terminalWidth} paddingX={1} paddingY={0}>
			{process.stdin.isTTY && (
				<KeyController
					activeTab={activeTab}
					setActiveTab={setActiveTab}
					appData={appData}
					setSelectedFixtureIdx={setSelectedFixtureIdx}
					pinnedMatch={pinnedMatch}
					setPinnedMatch={setPinnedMatch}
					setShowGoalAnim={setShowGoalAnim}
					loadData={loadData}
					setRateLimited={setRateLimited}
					setRateLimitCountdown={setRateLimitCountdown}
					exit={exit}
				/>
			)}
			{/* SINGLE-LINE HEADER */}
			<Box justifyContent="space-between" paddingX={1}>
				<Box>
					<Text bold>
						<Text color="red">⚽ FIFA </Text>
						<Text color="white">WORLD </Text>
						<Text color="blue">CUP </Text>
						<Text color="green">2026 </Text>
						<Text color="cyan">LIVE </Text>
						<Text color="yellow">CLI</Text>
					</Text>
					<Text color="gray">
						{'  | Mode: '}
						{rateLimited ? (
							<Text color="red">Paused (Rate Limited)</Text>
						) : (
							<Text color="green">Polling</Text>
						)}
						{' | '}
						{appData.fromCache ? (
							<Text color="red">⚠️ Cached</Text>
						) : (
							<Text color="green">● Connected</Text>
						)}
					</Text>
				</Box>
				<Text bold color="white">
					🕒 {new Date().toLocaleTimeString(undefined, {hour12: false})}
				</Text>
			</Box>
			<Text color="gray">{dividerStr}</Text>

			{/* RATE LIMIT BANNER */}
			{rateLimited && (
				<Box
					borderStyle="single"
					borderColor="yellow"
					paddingX={1}
					marginY={0}
					justifyContent="center"
				>
					<Text bold color="yellow">
						⚠️ [ Freemium Limit Reached. Auto-refresh paused for 15 minutes. (
						{Math.floor(rateLimitCountdown / 60)}:
						{(rateLimitCountdown % 60).toString().padStart(2, '0')} remaining) ]
					</Text>
				</Box>
			)}

			{/* PINNED SCORE */}
			{pinnedMatch && (
				<Box paddingX={1} justifyContent="center">
					<Text bold color="cyan">
						📌 PINNED: {pinnedMatch.homeTeam} {pinnedMatch.homeScore} -{' '}
						{pinnedMatch.awayScore} {pinnedMatch.awayTeam} (
						{pinnedMatch.elapsedTime}')
					</Text>
					<Text dimColor> [U to Unpin]</Text>
				</Box>
			)}

			{/* TAB HEADERS (inline, no borders) */}
			<Box flexDirection="row" justifyContent="center" marginY={0}>
				<Text bold color={activeTab === 'dashboard' ? 'green' : 'gray'}>
					{activeTab === 'dashboard'
						? '● [ 1: Live Scores ]'
						: '  [ 1: Live Scores ]'}
				</Text>
				<Text color="gray">{'   |   '}</Text>
				<Text bold color={activeTab === 'fixtures' ? 'cyan' : 'gray'}>
					{activeTab === 'fixtures'
						? '● [ 2: Upcoming Fixtures ]'
						: '  [ 2: Upcoming Fixtures ]'}
				</Text>
				<Text color="gray">{'   |   '}</Text>
				<Text bold color={activeTab === 'standings' ? 'yellow' : 'gray'}>
					{activeTab === 'standings'
						? '● [ 3: Group Standings ]'
						: '  [ 3: Group Standings ]'}
				</Text>
			</Box>
			<Text color="gray">{dividerStr}</Text>

			{/* TAB 1: LIVE SCORES — 2-COLUMN WITH INLINE GOALS */}
			{activeTab === 'dashboard' && (
				<Box flexDirection="column">
					{appData.matches.length === 0 ? (
						<Box paddingX={1}>
							<Text italic color="gray">
								No live matches right now
							</Text>
						</Box>
					) : (
						appData.matches.map(match => {
							const events = appData.matchEventsMap[match.id] ?? [];
							const goals = events.filter(ev =>
								['GOAL', 'OWN_GOAL', 'PENALTY'].includes(ev.eventType),
							);
							return (
								<Box
									key={match.id}
									flexDirection="row"
									justifyContent="space-between"
									paddingX={1}
									marginY={0}
								>
									<Box flexDirection="column" width={halfWidth}>
										<Text bold color="white">
											MATCH CENTRE
										</Text>
										<Text bold color="white">
											{match.homeTeam} {match.homeScore} - {match.awayScore}{' '}
											{match.awayTeam}
										</Text>
										<Text color="cyan">
											⏱️ {match.elapsedTime}' ({match.status})
										</Text>
										<Text dimColor>
											📍 {match.venue}, {match.city}
										</Text>
									</Box>

									<Box flexDirection="column" width={halfWidth}>
										<Text bold color="white">
											GOALS & SCORERS
										</Text>
										{goals.length === 0 ? (
											<Text italic color="gray">
												No goals yet
											</Text>
										) : (
											goals.map((g, i) => (
												<Text key={i} color="green">
													⚽ {g.minute}' - {g.player} ({g.team})
												</Text>
											))
										)}
									</Box>
								</Box>
							);
						})
					)}
					{/* GOAL ANIMATION HELPER TOOLTIP */}
					<Box justifyContent="center" marginY={0}>
						<Text dimColor>🎥 G: Goal Anim | P: Pin Score</Text>
					</Box>
				</Box>
			)}

			{/* TAB 2: UPCOMING FIXTURES */}
			{activeTab === 'fixtures' && (
				<Box flexDirection="column" paddingX={1}>
					{appData.fixtures.length === 0 ? (
						<Text italic color="gray">
							No upcoming fixtures
						</Text>
					) : (
						appData.fixtures.map((fixture, idx) => {
							const isSelected = idx === selectedFixtureIdx;
							return (
								<Box key={fixture.id} flexDirection="row" marginY={0}>
									<Text color={isSelected ? 'cyan' : 'gray'} bold={isSelected}>
										{isSelected ? '▶ ' : '  '}
										{fixture.date.padEnd(8)} | {fixture.time} |{' '}
										{fixture.homeTeam.padEnd(5)} vs {fixture.awayTeam.padEnd(5)}{' '}
										| {fixture.stage.padEnd(14)} | {fixture.venue} (
										{fixture.city})
									</Text>
								</Box>
							);
						})
					)}
				</Box>
			)}

			{/* TAB 3: GROUP STANDINGS */}
			{activeTab === 'standings' && (
				<Box flexDirection="row" justifyContent="space-between" paddingX={1}>
					{/* Group A */}
					<Box flexDirection="column" width={halfWidth}>
						<Box
							borderStyle="single"
							borderColor="cyan"
							justifyContent="center"
						>
							<Text bold color="cyan">
								GROUP A
							</Text>
						</Box>
						<Box justifyContent="space-between">
							<Text bold color="gray">
								TEAM
							</Text>
							<Text bold color="gray">
								P
							</Text>
							<Text bold color="gray">
								W
							</Text>
							<Text bold color="gray">
								D
							</Text>
							<Text bold color="gray">
								L
							</Text>
							<Text bold color="gray">
								GD
							</Text>
							<Text bold color="gray">
								PTS
							</Text>
						</Box>
						{appData.standings
							.filter(s => s.group === 'Group A')
							.map((team, idx) => (
								<Box key={idx} justifyContent="space-between">
									<Text bold color="white">
										{team.team.padEnd(8)}
									</Text>
									<Text color="white">{team.played}</Text>
									<Text color="white">{team.won}</Text>
									<Text color="white">{team.drawn}</Text>
									<Text color="white">{team.lost}</Text>
									<Text color="white">{team.goalDifference}</Text>
									<Text bold color="yellow">
										{team.points}
									</Text>
								</Box>
							))}
					</Box>

					{/* Group B */}
					<Box flexDirection="column" width={halfWidth}>
						<Box
							borderStyle="single"
							borderColor="yellow"
							justifyContent="center"
						>
							<Text bold color="yellow">
								GROUP B
							</Text>
						</Box>
						<Box justifyContent="space-between">
							<Text bold color="gray">
								TEAM
							</Text>
							<Text bold color="gray">
								P
							</Text>
							<Text bold color="gray">
								W
							</Text>
							<Text bold color="gray">
								D
							</Text>
							<Text bold color="gray">
								L
							</Text>
							<Text bold color="gray">
								GD
							</Text>
							<Text bold color="gray">
								PTS
							</Text>
						</Box>
						{appData.standings
							.filter(s => s.group === 'Group B')
							.map((team, idx) => (
								<Box key={idx} justifyContent="space-between">
									<Text bold color="white">
										{team.team.padEnd(8)}
									</Text>
									<Text color="white">{team.played}</Text>
									<Text color="white">{team.won}</Text>
									<Text color="white">{team.drawn}</Text>
									<Text color="white">{team.lost}</Text>
									<Text color="white">{team.goalDifference}</Text>
									<Text bold color="yellow">
										{team.points}
									</Text>
								</Box>
							))}
					</Box>
				</Box>
			)}

			{/* FOOTER */}
			<Text color="gray">{dividerStr}</Text>
			<Box justifyContent="space-between" paddingX={1}>
				<Text italic color="gray">
					🌐 https://www.fifa.com
				</Text>
				<Text color="gray">
					Tab: 1-3 | ↑↓ Fixtures | P Pin | G Anim | R Refresh | Ctrl+C Quit
				</Text>
			</Box>
		</Box>
	);
}
