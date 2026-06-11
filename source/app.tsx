import fs from 'node:fs';
import path from 'node:path';
import {Box, Text, useInput, useApp} from 'ink';
import React, {useState, useEffect} from 'react';
import {
	getLiveMatches,
	getUpcomingFixtures,
	getGroupStandings,
	getMatchDetails,
} from './api.js';
import {
	type Match,
	type Fixture,
	type Standing,
	type MatchEvent,
} from './schemas.js';
import GoalAnimation from './components/GoalAnimation.js';

export default function App() {
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

	// Unified data state — single setState prevents multiple re-renders
	const [appData, setAppData] = useState<{
		matches: Match[];
		fixtures: Fixture[];
		standings: Standing[];
		// Map of match id -> events for inline goals on dashboard
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
		} catch {
			setAppData(prev => ({...prev, fromCache: true}));
		}
	};

	// Initial load
	useEffect(() => {
		loadData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Refresh polling (30s)
	useEffect(() => {
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
			} catch {
				// Safe fail
			}
		}, 30_000);

		return () => {
			clearInterval(interval);
		};
	}, []);

	// Keyboard controls
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
			loadData();
		}

		// Exit
		if (key.ctrl && input === 'c') {
			// Write pinned score to a file so cli.tsx can print it after exiting alt screen
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
						<Text color="green">Polling</Text>
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
									marginY={0.5}
								>
									{/* LEFT: match info */}
									<Box flexDirection="column" width={`${halfWidth}`}>
										<Text bold color="cyan">
											MATCH CENTRE
										</Text>
										<Text bold color="white">
											{match.homeTeam} {match.homeScore} - {match.awayScore}{' '}
											{match.awayTeam}
										</Text>
										<Text color="gray">
											⏱️ {match.elapsedTime}' ({match.status})
										</Text>
										<Text color="gray">
											📍 {match.venue}, {match.city}
										</Text>
									</Box>
									{/* RIGHT: goals */}
									<Box flexDirection="column" width={`${halfWidth}`}>
										<Text bold underline color="yellow">
											GOALS & SCORERS
										</Text>
										{goals.length === 0 ? (
											<Text italic color="gray">
												No goals yet
											</Text>
										) : (
											goals.map((ev, i) => (
												<Text key={i} color="white">
													⚽ {ev.minute}' - {ev.player} ({ev.team})
													{ev.eventType === 'OWN_GOAL' ? ' (OG)' : ''}
													{ev.eventType === 'PENALTY' ? ' (PEN)' : ''}
												</Text>
											))
										)}
									</Box>
								</Box>
							);
						})
					)}
					<Box justifyContent="center">
						<Text color="yellow">🎥 G: Goal Anim | P: Pin Score</Text>
					</Box>
				</Box>
			)}

			{/* TAB 2: UPCOMING FIXTURES */}
			{activeTab === 'fixtures' && (
				<Box flexDirection="column" paddingX={1}>
					<Text bold color="cyan">
						UPCOMING FIXTURES
					</Text>
					{appData.fixtures.length === 0 ? (
						<Text italic color="gray">
							No upcoming fixtures
						</Text>
					) : (
						appData.fixtures.map((fixture, idx) => {
							const isSelected = idx === selectedFixtureIdx;
							return (
								<Box
									key={fixture.id}
									flexDirection="row"
									justifyContent="space-between"
									marginY={0.5}
								>
									<Box flexDirection="row">
										<Text
											bold={isSelected}
											color={isSelected ? 'cyan' : 'white'}
										>
											{isSelected ? '▶ ' : '  '}
											{fixture.homeTeam} vs {fixture.awayTeam}
										</Text>
									</Box>
									<Box flexDirection="row">
										<Text color="gray">
											📅 {fixture.date} @ {fixture.time}
											{'   '}
										</Text>
										<Text color="cyan">{fixture.stage}</Text>
										<Text color="gray">
											{'   '}📍 {fixture.venue}
										</Text>
									</Box>
								</Box>
							);
						})
					)}
				</Box>
			)}

			{/* TAB 3: GROUP STANDINGS — SIDE BY SIDE */}
			{activeTab === 'standings' && (
				<Box flexDirection="row" justifyContent="space-between" paddingX={1}>
					{/* Group A */}
					<Box flexDirection="column" width="48%">
						<Text bold underline color="yellow">
							GROUP A
						</Text>
						<Box justifyContent="space-between">
							<Text color="gray">{'TEAM'.padEnd(8)}</Text>
							<Text color="gray">{'P'}</Text>
							<Text color="gray">{'W'}</Text>
							<Text color="gray">{'D'}</Text>
							<Text color="gray">{'L'}</Text>
							<Text color="gray">{'GD'}</Text>
							<Text bold color="gray">
								{'PTS'}
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
					<Box flexDirection="column" width="48%">
						<Text bold underline color="yellow">
							GROUP B
						</Text>
						<Box justifyContent="space-between">
							<Text color="gray">{'TEAM'.padEnd(8)}</Text>
							<Text color="gray">{'P'}</Text>
							<Text color="gray">{'W'}</Text>
							<Text color="gray">{'D'}</Text>
							<Text color="gray">{'L'}</Text>
							<Text color="gray">{'GD'}</Text>
							<Text bold color="gray">
								{'PTS'}
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
					Tab: 1-3 | ↑↓ Fixtures | P Pin | G Anim | Ctrl+C Quit
				</Text>
			</Box>
		</Box>
	);
}
