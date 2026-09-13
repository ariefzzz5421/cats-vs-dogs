export type Side = "cat" | "dog";
export type GameMode = "solo" | "local";
export type Difficulty = "easy" | "normal" | "hard";
export type Phase =
  | "menu"
  | "starting"
  | "aiming"
  | "charging"
  | "throwing"
  | "flying"
  | "impact"
  | "switching"
  | "gameOver";
export type Item = "double" | "heavy" | "shield" | "heal";
export type Vec2 = { x: number; y: number };
export type ShotInput = {
  side: Side;
  angle: number;
  power: number;
  wind: number;
  item?: Item;
};
export type TrajectoryPoint = Vec2 & { vx: number; vy: number; time: number };
export type ImpactKind = "target" | "wall" | "ground" | "boundary";
export type Impact = {
  kind: ImpactKind;
  point: TrajectoryPoint;
  damage: number;
  target?: Side;
};
export type BallisticResult = {
  input: ShotInput;
  points: TrajectoryPoint[];
  impact: Impact;
};
export type BotMemory = { power: number; lastWind: number; correction: number };
export type Flight = {
  result: BallisticResult;
  delay: number;
  resolved: boolean;
};
export type Effect = { impact: Impact; age: number };
export type MatchState = {
  phase: Phase;
  mode: GameMode;
  difficulty: Difficulty;
  turn: Side;
  turnIndex: number;
  health: Record<Side, number>;
  stock: Record<Side, Record<Item, number>>;
  angle: number;
  power: number;
  wind: number;
  seed: number;
  selected: Item | null;
  elapsed: number;
  clock: number;
  flights: Flight[];
  effects: Effect[];
  winner: Side | null;
  paused: boolean;
  bot: BotMemory;
  botPower: number;
  message: string;
};
