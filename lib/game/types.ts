export type Side = "cat" | "dog";
export type CatHeroId = "blaze" | "luna" | "shadow";
export type DogHeroId = "major" | "bruno" | "snow";
export type GameMode = "bot" | "local" | "online";
export type Difficulty = "easy" | "medium" | "hard" | "expert";
export type GamePhase =
  | "LOBBY"
  | "MATCH_INTRO"
  | "TURN_START"
  | "AIMING"
  | "CHARGING"
  | "PROJECTILE_FLIGHT"
  | "IMPACT"
  | "TURN_END"
  | "GAME_OVER";

export type ProjectileType = "fishbone" | "rubber-bone";
export type CharacterReaction = "idle" | "aim" | "charge" | "throw" | "hit" | "laugh" | "victory" | "defeat";

export type Vec2 = { x: number; y: number };

export type ProjectileProperties = {
  radius: number;
  mass: number;
  drag: number;
  baseDamage: number;
};

export type ShotInput = {
  shotId: string;
  side: Side;
  angle: number;
  power: number;
  wind: number;
  projectileType: ProjectileType;
  turnIndex: number;
};

export type TrajectoryPoint = Vec2 & {
  time: number;
  vx: number;
  vy: number;
};

export type ImpactKind = "target" | "wall" | "ground" | "boundary";

export type ImpactResult = {
  kind: ImpactKind;
  position: Vec2;
  velocity: Vec2;
  speed: number;
  time: number;
  target?: Side;
  damage: number;
};

export type BallisticResult = {
  input: ShotInput;
  points: TrajectoryPoint[];
  impact: ImpactResult;
  closestTargetDistance: number;
  maxHeight: number;
};

export type ActiveShot = {
  input: ShotInput;
  result: BallisticResult;
};

export type HealthState = { cat: number; dog: number };

export type MatchSnapshot = {
  health: HealthState;
  turn: Side;
  wind: number;
  turnIndex: number;
  winner: Side | null;
  catHero: CatHeroId;
  dogHero: DogHeroId;
};

export type HeroDefinition<T extends string = string> = {
  id: T;
  name: string;
  role: string;
  trait: string;
  artPosition: string;
  projectileType: ProjectileType;
};
