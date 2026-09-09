export type Die = 1 | 2 | 3 | 4 | 5 | 6;
export type Box = 4 | 5 | 6 | 8 | 9 | 10;
export type Total = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type Roll = {
  a: Die | null;
  b: Die | null;
  total: Total;
  at: number;
  shooter: number;
};

export type Puck = { on: false } | { on: true; point: Box };

export type GoalKind = "dollars" | "percent" | "units" | "minutes";

export type Goal = {
  kind: GoalKind;
  value: number;
};

export type TableRules = {
  min: number;
  fieldTwo: 2 | 3;
  fieldTwelve: 2 | 3 | 4;
  odds: "1x" | "3-4-5x" | "10x" | "100x";
  vigUpFront: boolean;
};

export type StrategyId =
  | "track"
  | "pass-odds"
  | "place-68"
  | "iron-cross"
  | "dont-pass";

export type OpenBets = {
  pass: number;
  passOdds: number;
  dont: number;
  dontOdds: number;
  place: Partial<Record<Box, number>>;
  field: number;
};

export type Session = {
  id: string;
  casino: string;
  startedAt: number;
  endedAt: number | null;
  buyIn: number;
  unit: number;
  winGoal: Goal | null;
  lossLimit: Goal | null;
  table: TableRules;
  strategyId: StrategyId;
  puck: Puck;
  rolls: Roll[];
  shooter: number;
  pnl: number;
  shooterPnl: number;
  lastShooter?: number;
  lastShooterPnl?: number;
  bankroll: number;
  bets: OpenBets;
  goalHitAt: number | null;
  lossHitAt: number | null;
  notes: string;
};

export type PracticeRoll = {
  a: Die;
  b: Die;
  total: Total;
  at: number;
};

export type HardWay = 4 | 6 | 8 | 10;

export type PracticeBets = {
  pass: number;
  passOdds: number;
  dont: number;
  dontOdds: number;
  come: number;
  comeOn: Record<Box, number>;
  comeOddsOn: Record<Box, number>;
  dc: number;
  dcOn: Record<Box, number>;
  dcOddsOn: Record<Box, number>;
  place: Record<Box, number>;
  buy: Record<Box, number>;
  lay: Record<Box, number>;
  layOdds: Record<Box, number>;
  field: number;
  hard: Record<HardWay, number>;
  any7: number;
  anyCraps: number;
  yo: number;
  two: number;
  three: number;
  twelve: number;
  horn: number;
  ce: number;
  threeWay: number;
  world: number;
  hornHigh2: number;
  hornHigh3: number;
  hornHigh11: number;
  hornHigh12: number;
  big6: number;
  big8: number;
};

export type PracticeSpot =
  | "pass"
  | "passOdds"
  | "dont"
  | "dontOdds"
  | "come"
  | "dc"
  | "comeOn4"
  | "comeOn5"
  | "comeOn6"
  | "comeOn8"
  | "comeOn9"
  | "comeOn10"
  | "comeOdds4"
  | "comeOdds5"
  | "comeOdds6"
  | "comeOdds8"
  | "comeOdds9"
  | "comeOdds10"
  | "dcOn4"
  | "dcOn5"
  | "dcOn6"
  | "dcOn8"
  | "dcOn9"
  | "dcOn10"
  | "dcOdds4"
  | "dcOdds5"
  | "dcOdds6"
  | "dcOdds8"
  | "dcOdds9"
  | "dcOdds10"
  | "layOdds4"
  | "layOdds5"
  | "layOdds6"
  | "layOdds8"
  | "layOdds9"
  | "layOdds10"
  | "place4"
  | "place5"
  | "place6"
  | "place8"
  | "place9"
  | "place10"
  | "buy4"
  | "buy5"
  | "buy6"
  | "buy8"
  | "buy9"
  | "buy10"
  | "lay4"
  | "lay5"
  | "lay6"
  | "lay8"
  | "lay9"
  | "lay10"
  | "field"
  | "hard4"
  | "hard6"
  | "hard8"
  | "hard10"
  | "any7"
  | "anyCraps"
  | "yo"
  | "two"
  | "three"
  | "twelve"
  | "horn"
  | "ce"
  | "threeWay"
  | "world"
  | "hornHigh2"
  | "hornHigh3"
  | "hornHigh11"
  | "hornHigh12"
  | "big6"
  | "big8";

export type PracticeLog = {
  a: Die;
  b: Die;
  total: Total;
  delta: number;
  at: number;
};

export type PracticeState = {
  bank: number;
  buyIn: number;
  tableMin: number;
  chip: number;
  take: boolean;
  paused: boolean;
  puck: Puck;
  bets: PracticeBets;
  rolls: Roll[];
  log: PracticeLog[];
  shooter: number;
  shooterPnl: number;
  lastShooterPnl: number;
  lastRepeat: PracticeBets | null;
  last: { a: Die; b: Die; total: Total } | null;
  lastDelta: number;
  msg: string;
};
