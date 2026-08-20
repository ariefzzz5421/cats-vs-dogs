"use client";

/* eslint-disable react/no-unknown-property -- React Three Fiber JSX uses Three.js properties. */

import { AdaptiveDpr, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

import { originFor } from "@/lib/game/constants";
import { trajectoryPointAt } from "@/lib/game/ballistics";
import type { ActiveShot, CatHeroId, CharacterReaction, DogHeroId, GamePhase, ImpactResult, Side } from "@/lib/game/types";

type ArenaProps = {
  activeShot: ActiveShot | null;
  impact: ImpactResult | null;
  catHero: CatHeroId;
  dogHero: DogHeroId;
  catReaction: CharacterReaction;
  dogReaction: CharacterReaction;
  turn: Side;
  angle: number;
  wind: number;
  phase: GamePhase;
  reducedMotion: boolean;
  lowPowerDevice: boolean;
  onShotComplete: (impact: ImpactResult) => void;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function oklchToThree(value: string) {
  const match = value.match(/oklch\(\s*([\d.]+)(%)?\s+([\d.]+)\s+([\d.]+)/i);
  if (!match) return new THREE.Color(1, 1, 1);
  const l = Number(match[1]) / (match[2] ? 100 : 1);
  const c = Number(match[3]);
  const hue = (Number(match[4]) * Math.PI) / 180;
  const a = c * Math.cos(hue);
  const b = c * Math.sin(hue);
  const lp = l + 0.3963377774 * a + 0.2158037573 * b;
  const mp = l - 0.1055613458 * a - 0.0638541728 * b;
  const sp = l - 0.0894841775 * a - 1.291485548 * b;
  return new THREE.Color().setRGB(
    clamp01(4.0767416621 * lp ** 3 - 3.3077115913 * mp ** 3 + 0.2309699292 * sp ** 3),
    clamp01(-1.2684380046 * lp ** 3 + 2.6097574011 * mp ** 3 - 0.3413193965 * sp ** 3),
    clamp01(-0.0041960863 * lp ** 3 - 0.7034186147 * mp ** 3 + 1.707614701 * sp ** 3),
  );
}

const colorCache = new Map<string, THREE.Color>();
let colorCanvas: HTMLCanvasElement | null = null;

const color = (token: string) => {
  const cached = colorCache.get(token);
  if (cached) return cached;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  if (raw.startsWith("oklch")) {
    const parsed = oklchToThree(raw);
    colorCache.set(token, parsed);
    return parsed;
  }
  // Browsers may serialize an OKLCH custom property as lab(). Canvas converts
  // any supported CSS color to pixels before Three.js sees it.
  colorCanvas ??= document.createElement("canvas");
  colorCanvas.width = 1; colorCanvas.height = 1;
  const context = colorCanvas.getContext("2d", { willReadFrequently: true });
  if (!context) return new THREE.Color(1, 1, 1);
  context.clearRect(0, 0, 1, 1); context.fillStyle = raw; context.fillRect(0, 0, 1, 1);
  const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
  const parsed = new THREE.Color().setRGB(red / 255, green / 255, blue / 255, THREE.SRGBColorSpace);
  colorCache.set(token, parsed);
  return parsed;
};

const catTokens: Record<CatHeroId, [string, string, string]> = {
  blaze: ["--color-cat-blaze", "--color-cat-blaze-light", "--color-cat-blaze-accent"],
  luna: ["--color-cat-luna", "--color-cat-luna-light", "--color-cat-luna-accent"],
  shadow: ["--color-cat-shadow", "--color-cat-shadow-light", "--color-cat-shadow-accent"],
};
const dogTokens: Record<DogHeroId, [string, string, string]> = {
  major: ["--color-dog-major", "--color-dog-major-light", "--color-dog-major-accent"],
  bruno: ["--color-dog-bruno", "--color-dog-bruno-light", "--color-dog-bruno-accent"],
  snow: ["--color-dog-snow", "--color-dog-snow-light", "--color-dog-snow-accent"],
};

function CharacterRig({ side, reaction, reducedMotion, children }: { side: Side; reaction: CharacterReaction; reducedMotion: boolean; children: React.ReactNode }) {
  const body = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const arm = useRef<THREE.Group>(null);
  const start = useRef(0);
  const previous = useRef(reaction);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (reaction !== previous.current) start.current = t;
    previous.current = reaction;
    if (!body.current || !tail.current || !arm.current) return;
    const local = t - start.current;
    const direction = side === "cat" ? 1 : -1;
    const idle = reducedMotion ? 0 : Math.sin(t * 2.25 + (side === "dog" ? 1.1 : 0));
    let x = 0;
    let y = idle * 0.025;
    let rotation = idle * 0.012;
    let scaleX = 1;
    let scaleY = 1;
    let armRotation = reaction === "aim" ? -0.62 * direction : -0.18 * direction;
    if (reaction === "charge") {
      const tension = clamp01(local / 1.1);
      x = -0.09 * direction * tension;
      scaleX = 1 + tension * 0.05;
      scaleY = 1 - tension * 0.035;
      armRotation = -1.05 * direction;
    }
    if (reaction === "throw") {
      const phase = clamp01(local / 0.48);
      rotation = Math.sin(phase * Math.PI) * 0.18 * direction;
      x = Math.sin(phase * Math.PI) * 0.1 * direction;
      armRotation = (-1.1 + phase * 2.25) * direction;
    }
    if (reaction === "hit") {
      const fade = Math.max(0, 1 - local / 0.55);
      x = -Math.sin(local * 44) * 0.09 * direction * fade;
      rotation = -0.17 * direction * fade;
      scaleX = 1 + 0.08 * fade;
      scaleY = 1 - 0.09 * fade;
    }
    if (reaction === "laugh") { y += Math.abs(Math.sin(local * 12)) * 0.1; rotation += Math.sin(local * 12) * 0.055; }
    if (reaction === "victory") { y += Math.abs(Math.sin(local * 7)) * 0.18; rotation += Math.sin(local * 7) * 0.08; }
    if (reaction === "defeat") { rotation = -0.34 * direction; y = -0.12; scaleY = 0.9; }
    body.current.position.set(x, y, 0);
    body.current.rotation.z = rotation;
    body.current.scale.set(scaleX, scaleY, 1);
    arm.current.rotation.z = armRotation;
    tail.current.rotation.z = reducedMotion ? 0 : Math.sin(t * 3.2) * 0.18;
  });
  return <group ref={body}>{children}<group ref={tail} name="tail-slot" /><group ref={arm} name="arm-slot" /></group>;
}

function Eyes({ side }: { side: Side }) {
  const ink = color("--color-ink");
  const z = 0.63;
  return <>{[-0.23, 0.23].map((x) => <group key={x} position={[x, 1.25, z]}><mesh scale={[1, 1.22, 0.5]}><sphereGeometry args={[0.14, 12, 8]} /><meshStandardMaterial color={color("--color-eye-white")} roughness={0.5} /></mesh><mesh position={[side === "cat" ? 0.035 : -0.035, 0, 0.12]}><sphereGeometry args={[0.065, 10, 8]} /><meshStandardMaterial color={ink} roughness={0.25} /></mesh></group>)}</>;
}

function Cat({ hero, reaction, reducedMotion }: { hero: CatHeroId; reaction: CharacterReaction; reducedMotion: boolean }) {
  const [coatToken, lightToken, accentToken] = catTokens[hero];
  const coat = color(coatToken); const light = color(lightToken); const accent = color(accentToken);
  return <group position={[-3.42, 0.7, 0]} rotation={[0, 0.22, 0]}>
    <CharacterRig side="cat" reaction={reaction} reducedMotion={reducedMotion}>
      <mesh castShadow scale={[0.72, 0.88, 0.66]}><sphereGeometry args={[0.8, 18, 14]} /><meshStandardMaterial color={coat} roughness={0.7} /></mesh>
      <mesh castShadow position={[0, 1.08, 0]}><sphereGeometry args={[0.67, 18, 14]} /><meshStandardMaterial color={coat} roughness={0.62} /></mesh>
      {[-0.4, 0.4].map((x) => <mesh key={x} castShadow position={[x, 1.63, 0]} rotation={[0, 0, x * 0.35]}><coneGeometry args={[0.27, 0.64, 4]} /><meshStandardMaterial color={coat} roughness={0.7} /></mesh>)}
      <Eyes side="cat" />
      <mesh position={[0.08, 1.03, 0.68]}><sphereGeometry args={[0.105, 10, 8]} /><meshStandardMaterial color={color("--color-nose")} /></mesh>
      <mesh position={[0, 0.54, 0.59]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.45, 0.075, 8, 20]} /><meshStandardMaterial color={accent} roughness={0.4} /></mesh>
      <group position={[-0.74, 0.13, -0.12]} rotation={[0.2, 0, 0.9]}><mesh castShadow><torusGeometry args={[0.44, 0.115, 8, 18, 4.4]} /><meshStandardMaterial color={coat} roughness={0.7} /></mesh></group>
      <group position={[0.5, 0.43, 0.18]} rotation={[0, 0, -0.62]}><mesh castShadow><capsuleGeometry args={[0.17, 0.54, 6, 10]} /><meshStandardMaterial color={light} roughness={0.72} /></mesh></group>
      <group position={[-0.48, 0.42, 0.12]} rotation={[0, 0, 0.5]}><mesh castShadow><capsuleGeometry args={[0.17, 0.52, 6, 10]} /><meshStandardMaterial color={light} roughness={0.72} /></mesh></group>
      {hero === "blaze" && <mesh position={[0.16, 0.45, 0.69]} rotation={[0.1, 0.2, -0.35]} scale={[0.6, 0.42, 0.16]}><coneGeometry args={[0.3, 0.7, 3]} /><meshStandardMaterial color={accent} /></mesh>}
      {hero === "luna" && <mesh position={[0, 0.43, 0.72]}><torusGeometry args={[0.12, 0.04, 8, 16, 4.7]} /><meshStandardMaterial color={accent} metalness={0.25} /></mesh>}
      {hero === "shadow" && <mesh position={[0, 0.43, 0.72]}><octahedronGeometry args={[0.115]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.18} /></mesh>}
    </CharacterRig>
  </group>;
}

function Dog({ hero, reaction, reducedMotion }: { hero: DogHeroId; reaction: CharacterReaction; reducedMotion: boolean }) {
  const [coatToken, lightToken, accentToken] = dogTokens[hero];
  const coat = color(coatToken); const light = color(lightToken); const accent = color(accentToken);
  const bodyScale: [number, number, number] = hero === "bruno" ? [0.9, 0.88, 0.8] : hero === "snow" ? [0.7, 0.95, 0.65] : [0.8, 0.92, 0.73];
  return <group position={[3.42, 0.69, 0]} rotation={[0, -0.22, 0]}>
    <CharacterRig side="dog" reaction={reaction} reducedMotion={reducedMotion}>
      <mesh castShadow scale={bodyScale}><sphereGeometry args={[0.84, 18, 14]} /><meshStandardMaterial color={coat} roughness={0.76} /></mesh>
      <mesh castShadow position={[0, 1.08, 0]} scale={[1.04, 0.96, 1]}><sphereGeometry args={[0.69, 18, 14]} /><meshStandardMaterial color={coat} roughness={0.72} /></mesh>
      <mesh castShadow position={[-0.04, 0.91, 0.62]} scale={[0.8, 0.62, 0.7]}><sphereGeometry args={[0.49, 16, 12]} /><meshStandardMaterial color={light} roughness={0.78} /></mesh>
      <Eyes side="dog" />
      <mesh position={[-0.08, 1.11, 0.89]} scale={[1, 0.72, 1]}><sphereGeometry args={[0.16, 12, 8]} /><meshStandardMaterial color={color("--color-ink")} /></mesh>
      {[-0.58, 0.58].map((x) => <mesh key={x} castShadow position={[x, 1.45, -0.03]} rotation={[0.2, 0, x * -1.1]} scale={[0.42, hero === "snow" ? 0.78 : 1.05, 0.32]}><sphereGeometry args={[0.43, 14, 9]} /><meshStandardMaterial color={hero === "snow" ? coat : color("--color-ink")} roughness={0.8} /></mesh>)}
      <mesh position={[0, 0.55, 0.59]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.46, 0.08, 8, 20]} /><meshStandardMaterial color={accent} roughness={0.45} /></mesh>
      <mesh position={[0, 0.46, 0.72]}><octahedronGeometry args={[0.12]} /><meshStandardMaterial color={accent} metalness={0.22} /></mesh>
      <group position={[0.8, 0.15, -0.15]} rotation={[0.2, 0, -0.95]}><mesh castShadow><torusGeometry args={[0.43, 0.13, 8, 18, 4.3]} /><meshStandardMaterial color={coat} roughness={0.75} /></mesh></group>
      <group position={[-0.5, 0.42, 0.14]} rotation={[0, 0, -0.5]}><mesh castShadow><capsuleGeometry args={[0.18, 0.54, 6, 10]} /><meshStandardMaterial color={light} roughness={0.75} /></mesh></group>
      <group position={[0.5, 0.43, 0.18]} rotation={[0, 0, 0.58]}><mesh castShadow><capsuleGeometry args={[0.18, 0.55, 6, 10]} /><meshStandardMaterial color={light} roughness={0.75} /></mesh></group>
    </CharacterRig>
  </group>;
}

function Wall() {
  const bricks = useMemo(() => Array.from({ length: 15 }, (_, index) => {
    const row = Math.floor(index / 3); const col = index % 3; const offset = row % 2 ? 0.18 : 0;
    return <RoundedBox key={index} args={[0.52, 0.43, 1.55]} radius={0.045} smoothness={2} position={[offset, 0.22 + row * 0.42, -0.52 + col * 0.53]} castShadow receiveShadow><meshStandardMaterial color={color(row % 2 ? "--color-brick-light" : "--color-brick")} roughness={0.9} /></RoundedBox>;
  }), []);
  return <group position={[-0.08, 0, -0.28]}>{bricks}</group>;
}

function FishBone() {
  const bone = color("--color-bone");
  return <group><mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.045, 0.045, 0.65, 8]} /><meshStandardMaterial color={bone} roughness={0.58} /></mesh><mesh position={[0.38, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.2, 0.3, 3]} /><meshStandardMaterial color={bone} /></mesh>{[-0.2, 0, 0.2].map((x) => <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 4]}><capsuleGeometry args={[0.02, 0.24, 4, 6]} /><meshStandardMaterial color={bone} /></mesh>)}</group>;
}

function RubberBone() {
  const bone = color("--color-rubber-bone");
  return <group><mesh rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[0.1, 0.48, 6, 10]} /><meshStandardMaterial color={bone} roughness={0.48} /></mesh>{[-0.35, 0.35].flatMap((x) => [-0.11, 0.11].map((y) => <mesh key={`${x}-${y}`} position={[x, y, 0]}><sphereGeometry args={[0.14, 10, 8]} /><meshStandardMaterial color={bone} /></mesh>))}</group>;
}

function Projectile({ activeShot, reducedMotion, onComplete }: { activeShot: ActiveShot; reducedMotion: boolean; onComplete: (impact: ImpactResult) => void }) {
  const ref = useRef<THREE.Group>(null); const trail = useRef<THREE.Group>(null); const elapsed = useRef(0); const done = useRef(false);
  useFrame((_, delta) => {
    if (!ref.current || done.current) return;
    elapsed.current += delta * (reducedMotion ? 1.7 : 1);
    const point = trajectoryPointAt(activeShot.result, elapsed.current);
    ref.current.position.set(point.x, point.y, 0.32);
    ref.current.rotation.z = Math.atan2(point.vy, point.vx) + elapsed.current * 5;
    ref.current.rotation.y += delta * 5;
    if (trail.current) trail.current.scale.x = 0.7 + Math.min(1.5, Math.hypot(point.vx, point.vy) / 8);
    if (elapsed.current >= activeShot.result.impact.time) { done.current = true; onComplete(activeShot.result.impact); }
  });
  return <group ref={ref} scale={0.72}><group ref={trail} position={[-0.4, 0, -0.06]}><mesh rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[0.035, 0.55, 4, 6]} /><meshBasicMaterial color={color(activeShot.input.side === "cat" ? "--color-trail-cat" : "--color-trail-dog")} transparent opacity={0.5} depthWrite={false} /></mesh></group>{activeShot.input.side === "cat" ? <FishBone /> : <RubberBone />}</group>;
}

function AimHint({ side, angle }: { side: Side; angle: number }) {
  const origin = originFor(side); const radians = angle * Math.PI / 180; const direction = side === "cat" ? 1 : -1;
  return <group>{[0.35, 0.62, 0.9, 1.18].map((distance, index) => <mesh key={distance} position={[origin.x + Math.cos(radians) * distance * direction, origin.y + Math.sin(radians) * distance, 0.25]} scale={0.08 - index * 0.009}><sphereGeometry args={[1, 10, 8]} /><meshBasicMaterial color={color("--color-trail-cat")} transparent opacity={0.9 - index * 0.15} /></mesh>)}</group>;
}

function WindScenery({ wind, reducedMotion, lowPowerDevice }: { wind: number; reducedMotion: boolean; lowPowerDevice: boolean }) {
  const clouds = useRef<THREE.Group>(null); const flag = useRef<THREE.Mesh>(null); const leaves = useRef<THREE.Group>(null);
  useFrame(({ clock }, delta) => {
    if (reducedMotion) return;
    if (clouds.current) { clouds.current.position.x += wind * delta * 0.12; if (clouds.current.position.x > 1.5) clouds.current.position.x = -1.5; if (clouds.current.position.x < -1.5) clouds.current.position.x = 1.5; }
    if (flag.current) flag.current.rotation.y = wind >= 0 ? 0 : Math.PI;
    if (leaves.current) { leaves.current.position.x += wind * delta * 0.45; leaves.current.rotation.z = Math.sin(clock.elapsedTime * 3) * 0.1; if (leaves.current.position.x > 5.5) leaves.current.position.x = -5.5; if (leaves.current.position.x < -5.5) leaves.current.position.x = 5.5; }
  });
  return <>
    <group ref={clouds} position={[0, 4.5, -4.4]}>{[-3.6, 1.4, 4.1].map((x) => <group key={x} position={[x, Math.abs(x) * 0.05, 0]}>{[-0.35, 0, 0.38].map((offset, i) => <mesh key={offset} position={[offset, i === 1 ? 0.12 : 0, 0]} scale={[0.75, 0.38, 0.3]}><sphereGeometry args={[0.65, 12, 8]} /><meshBasicMaterial color={color("--color-cloud")} /></mesh>)}</group>)}</group>
    <group position={[0.62, 2.35, -0.8]}><mesh><cylinderGeometry args={[0.035, 0.045, 2.4, 8]} /><meshStandardMaterial color={color("--color-wood")} /></mesh><mesh ref={flag} position={[0.36, 1.02, 0]}><planeGeometry args={[0.7, 0.38]} /><meshStandardMaterial color={color("--color-flag")} side={THREE.DoubleSide} /></mesh></group>
    {!lowPowerDevice && <group ref={leaves} position={[wind >= 0 ? -4.8 : 4.8, 2.7, -0.4]}>{[0, 0.7, 1.4, 2.1].map((x, i) => <mesh key={x} position={[x, Math.sin(i) * 0.42, 0]} rotation={[0, 0, i]}><planeGeometry args={[0.18, 0.09]} /><meshBasicMaterial color={color(i % 2 ? "--color-leaf-gold" : "--color-leaf-green")} side={THREE.DoubleSide} /></mesh>)}</group>}
  </>;
}

function Backyard({ wind, reducedMotion, lowPowerDevice }: { wind: number; reducedMotion: boolean; lowPowerDevice: boolean }) {
  return <>
    <mesh position={[-4.5, 2.35, -4.8]}><boxGeometry args={[3.8, 3.4, 1.1]} /><meshStandardMaterial color={color("--color-house-cat")} roughness={0.95} /></mesh>
    <mesh position={[4.5, 2.25, -4.9]}><boxGeometry args={[3.6, 3.2, 1.1]} /><meshStandardMaterial color={color("--color-house-dog")} roughness={0.95} /></mesh>
    {[-4.5, 4.5].map((x) => <mesh key={x} position={[x, 4.1, -4.65]} rotation={[0, 0, x < 0 ? -0.08 : 0.08]}><coneGeometry args={[2.55, 1.6, 4]} /><meshStandardMaterial color={color(x < 0 ? "--color-roof-cat" : "--color-roof-dog")} roughness={0.9} /></mesh>)}
    {[-5.1, -4.35, 4.2, 5].map((x, i) => <group key={x} position={[x, 0.45, -2.3]}><mesh scale={[1.15, 0.72, 0.7]}><sphereGeometry args={[0.75, 12, 9]} /><meshStandardMaterial color={color(i % 2 ? "--color-bush-dark" : "--color-bush-light")} roughness={0.95} /></mesh></group>)}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 2]} receiveShadow><planeGeometry args={[13, 24]} /><meshStandardMaterial color={color("--color-cat-ground")} roughness={0.98} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3.3, -0.025, 2.01]}><planeGeometry args={[6.4, 24]} /><meshStandardMaterial color={color("--color-dog-ground")} roughness={0.98} /></mesh>
    <mesh position={[4.65, 0.36, -0.55]}><cylinderGeometry args={[0.38, 0.33, 0.72, 12]} /><meshStandardMaterial color={color("--color-trash")} metalness={0.2} roughness={0.7} /></mesh>
    <mesh position={[-4.65, 0.08, 0.25]} scale={[1.2, 0.35, 0.8]}><torusGeometry args={[0.35, 0.11, 8, 20]} /><meshStandardMaterial color={color("--color-cat-bowl")} roughness={0.65} /></mesh>
    <Wall /><WindScenery wind={wind} reducedMotion={reducedMotion} lowPowerDevice={lowPowerDevice} />
  </>;
}

function ImpactFx({ impact, lowPowerDevice }: { impact: ImpactResult; lowPowerDevice: boolean }) {
  const group = useRef<THREE.Group>(null); const start = useRef<number | null>(null);
  const pieces = useMemo(() => Array.from({ length: lowPowerDevice ? 5 : 11 }, (_, i) => ({ angle: (i / (lowPowerDevice ? 5 : 11)) * Math.PI * 2, speed: 0.45 + (i % 4) * 0.16 })), [lowPowerDevice]);
  useFrame(({ clock }) => {
    start.current ??= clock.elapsedTime;
    if (!group.current) return;
    const t = clock.elapsedTime - start.current;
    group.current.children.forEach((child, i) => { const piece = pieces[i]; child.position.set(Math.cos(piece.angle) * piece.speed * t, Math.sin(piece.angle) * piece.speed * t - t * t * 0.55, 0); child.scale.setScalar(Math.max(0.01, 1 - t * 1.8)); });
  });
  return <group position={[impact.position.x, impact.position.y, 0.4]} ref={group}>{pieces.map((piece, i) => <mesh key={`${piece.angle}-${i}`} scale={impact.kind === "target" ? 0.12 : 0.08}><octahedronGeometry args={[1]} /><meshBasicMaterial color={color(impact.kind === "target" ? "--color-impact-hit" : impact.kind === "wall" ? "--color-impact-wall" : "--color-impact-ground")} /></mesh>)}</group>;
}

function Scene(props: ArenaProps) {
  const aiming = props.phase === "AIMING" || props.phase === "CHARGING";
  return <>
    <color attach="background" args={[color("--color-arena-sky")]} />
    <fog attach="fog" args={[color("--color-arena-sky"), 11, 19]} />
    <ambientLight intensity={1.4} />
    <hemisphereLight args={[color("--color-arena-light"), color("--color-arena-earth"), 1.2]} />
    <directionalLight position={[-4, 8, 6]} intensity={2.2} castShadow={!props.lowPowerDevice} shadow-mapSize={[props.lowPowerDevice ? 256 : 768, props.lowPowerDevice ? 256 : 768]} />
    <Backyard wind={props.wind} reducedMotion={props.reducedMotion} lowPowerDevice={props.lowPowerDevice} />
    <Cat hero={props.catHero} reaction={props.catReaction} reducedMotion={props.reducedMotion} />
    <Dog hero={props.dogHero} reaction={props.dogReaction} reducedMotion={props.reducedMotion} />
    {aiming && <AimHint side={props.turn} angle={props.angle} />}
    {props.activeShot && <Projectile key={props.activeShot.input.shotId} activeShot={props.activeShot} reducedMotion={props.reducedMotion} onComplete={props.onShotComplete} />}
    {props.impact && <ImpactFx key={`${props.impact.time}-${props.impact.position.x}`} impact={props.impact} lowPowerDevice={props.lowPowerDevice} />}
  </>;
}

export function GameArena3D(props: ArenaProps) {
  return <Canvas className="arena-canvas" aria-label="Side-on 3D backyard artillery arena" role="img" shadows={!props.lowPowerDevice} dpr={props.lowPowerDevice ? [0.7, 1] : [0.85, 1.4]} camera={{ position: [0, 4.15, 11.8], fov: 42 }} onCreated={({ camera, gl }) => { camera.lookAt(0, 1.35, 0); gl.shadowMap.type = THREE.PCFShadowMap; }} gl={{ antialias: !props.lowPowerDevice, alpha: false, powerPreference: "high-performance" }} performance={{ min: 0.55 }}><AdaptiveDpr /><Suspense fallback={null}><Scene {...props} /></Suspense></Canvas>;
}
