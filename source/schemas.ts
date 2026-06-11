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

export type Match = z.infer<typeof MatchSchema>;

export const FixtureSchema = z.object({
	id: z.string(),
	homeTeam: z.string(),
	awayTeam: z.string(),
	date: z.string(),
	time: z.string(),
	venue: z.string(),
	city: z.string(),
	stage: z.string(),
});

export type Fixture = z.infer<typeof FixtureSchema>;

export const StandingSchema = z.object({
	group: z.string(),
	team: z.string(),
	played: z.number(),
	won: z.number(),
	drawn: z.number(),
	lost: z.number(),
	goalsFor: z.number(),
	goalsAgainst: z.number(),
	goalDifference: z.number(),
	points: z.number(),
});

export type Standing = z.infer<typeof StandingSchema>;

export const MatchEventSchema = z.object({
	minute: z.number(),
	extraMinute: z.number().nullable().optional(),
	player: z.string(),
	team: z.string(),
	eventType: z.enum(['GOAL', 'OWN_GOAL', 'YELLOW', 'RED', 'SUB', 'PENALTY']),
});

export type MatchEvent = z.infer<typeof MatchEventSchema>;

export const MatchStatsSchema = z.object({
	possessionHome: z.number(), // Out of 100
	possessionAway: z.number(),
	shotsHome: z.number(),
	shotsAway: z.number(),
	shotsOnTargetHome: z.number(),
	shotsOnTargetAway: z.number(),
	cornersHome: z.number(),
	cornersAway: z.number(),
	foulsHome: z.number(),
	foulsAway: z.number(),
	offsidesHome: z.number(),
	offsidesAway: z.number(),
	yellowHome: z.number(),
	yellowAway: z.number(),
	redHome: z.number(),
	redAway: z.number(),
});

export type MatchStats = z.infer<typeof MatchStatsSchema>;
