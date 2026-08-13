"use client";

/* eslint-disable react/no-unknown-property -- React Three Fiber uses JSX properties that are not DOM attributes. */

import { AdaptiveDpr, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

export type Side = "cat" | "dog";
export type CatHeroId = "blaze" | "luna" | "shadow";
export type DogHeroId = "major" | "bruno" | "snow";

export type ShotVisual = {
  id: number;
  side: Side;
  power: number;
  target: number;
  damage: number;
  hit: boolean;
  perfect: boolean;
};

type ArenaProps = {
  shot: ShotVisual | null;
  hitSide: Side | null;
  catHero: CatHeroId;
  dogHero: DogHeroId;
  reducedMotion: boolean;
  lowPowerDevice: boolean;
  onShotComplete: () => void;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

// Three.js does not currently understand CSS OKLCH custom-property strings.
// Convert theme tokens to linear sRGB so materials keep the intended color.
function oklchToThree(value: string) {
  const match = value.match(/oklch\(\s*([\d.]+)(%)?\s+([\d.]+)\s+([\d.]+)/i);
  if (!match) return new THREE.Color(value || "#ffffff");
  const l = Number(match[1]) / (match[2] ? 100 : 1);
  const c = Number(match[3]);
  const hue = (Number(match[4]) * Math.PI) / 180;
  const a = c * Math.cos(hue);
  const b = c * Math.sin(hue);
  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = l - 0.0894841775 * a - 1.291485548 * b;
  const ll = lPrime ** 3;
  const mm = mPrime ** 3;
  const ss = sPrime ** 3;
  return new THREE.Color().setRGB(
    clamp(4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss),
    clamp(-1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss),
    clamp(-0.0041960863 * ll - 0.7034186147 * mm + 1.707614701 * ss),
  );
}

const readColor = (name: string) => oklchToThree(getComputedStyle(document.documentElement).getPropertyValue(name).trim());

function CharacterMotion({
  children,
  side,
  throwing,
  hit,
  reducedMotion,
}: {
  children: React.ReactNode;
  side: Side;
  throwing: boolean;
  hit: boolean;
  reducedMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const throwStart = useRef(0);
  const wasThrowing = useRef(false);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    if (throwing && !wasThrowing.current) throwStart.current = t;
    wasThrowing.current = throwing;
    const direction = side === "cat" ? 1 : -1;
    const idle = reducedMotion ? 0 : Math.sin(t * 2.15 + (side === "dog" ? 1.2 : 0)) * 0.035;
    const throwPhase = Math.min(1, Math.max(0, (t - throwStart.current) / 0.72));
    const throwLean = throwing ? Math.sin(throwPhase * Math.PI) * 0.22 * direction : 0;
    const hitShake = hit && !reducedMotion ? Math.sin(t * 44) * 0.07 : 0;
    group.current.position.y = idle;
    group.current.position.x = hitShake;
    group.current.rotation.z = throwLean;
  });

  return <group ref={group}>{children}</group>;
}

const catTokens: Record<CatHeroId, { coat: string; light: string; accent: string }> = {
  blaze: { coat: "--color-cat-blaze", light: "--color-cat-blaze-light", accent: "--color-cat-blaze-accent" },
  luna: { coat: "--color-cat-luna", light: "--color-cat-luna-light", accent: "--color-cat-luna-accent" },
  shadow: { coat: "--color-cat-shadow", light: "--color-cat-shadow-light", accent: "--color-cat-shadow-accent" },
};

const dogTokens: Record<DogHeroId, { coat: string; light: string; accent: string }> = {
  major: { coat: "--color-dog-major", light: "--color-dog-major-light", accent: "--color-dog-major-accent" },
  bruno: { coat: "--color-dog-bruno", light: "--color-dog-bruno-light", accent: "--color-dog-bruno-accent" },
  snow: { coat: "--color-dog-snow", light: "--color-dog-snow-light", accent: "--color-dog-snow-accent" },
};

function GroundShadow({ x }: { x: number }) {
  return (
    <mesh position={[x, -0.285, 0.08]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.3, 0.65, 1]}>
      <circleGeometry args={[0.85, 24]} />
      <meshBasicMaterial color={readColor("--color-arena-shadow")} transparent opacity={0.24} depthWrite={false} />
    </mesh>
  );
}

function Cat({ hero, throwing, hit, reducedMotion }: { hero: CatHeroId; throwing: boolean; hit: boolean; reducedMotion: boolean }) {
  const palette = catTokens[hero];
  const coat = readColor(palette.coat);
  const light = readColor(palette.light);
  const accent = readColor(palette.accent);
  const ink = readColor("--color-ink");
  return (
    <group position={[-3.35, 0.55, 0]} rotation={[0, 0.28, 0]}>
      <CharacterMotion side="cat" throwing={throwing} hit={hit} reducedMotion={reducedMotion}>
        <mesh castShadow scale={[0.78, 0.95, 0.7]}><sphereGeometry args={[0.82, 20, 14]} /><meshStandardMaterial color={coat} roughness={0.68} /></mesh>
        <mesh castShadow position={[0, 1.12, 0]}><sphereGeometry args={[0.7, 20, 14]} /><meshStandardMaterial color={coat} roughness={0.62} /></mesh>
        <mesh castShadow position={[-0.42, 1.68, 0]} rotation={[0, 0, -0.16]}><coneGeometry args={[0.28, 0.66, 4]} /><meshStandardMaterial color={coat} roughness={0.65} /></mesh>
        <mesh castShadow position={[0.42, 1.68, 0]} rotation={[0, 0, 0.16]}><coneGeometry args={[0.28, 0.66, 4]} /><meshStandardMaterial color={coat} roughness={0.65} /></mesh>
        <mesh position={[-0.24, 1.22, 0.62]} scale={[1, 1.25, 0.55]}><sphereGeometry args={[0.14, 14, 10]} /><meshStandardMaterial color={ink} roughness={0.35} /></mesh>
        <mesh position={[0.24, 1.22, 0.62]} scale={[1, 1.25, 0.55]}><sphereGeometry args={[0.14, 14, 10]} /><meshStandardMaterial color={ink} roughness={0.35} /></mesh>
        <mesh position={[0, 0.98, 0.7]}><sphereGeometry args={[0.12, 12, 8]} /><meshStandardMaterial color={readColor("--color-nose")} roughness={0.5} /></mesh>
        <mesh castShadow position={[0.52, 0.38, 0.1]} rotation={[0, 0, -0.62]}><capsuleGeometry args={[0.18, 0.58, 6, 10]} /><meshStandardMaterial color={light} roughness={0.7} /></mesh>
        <mesh castShadow position={[-0.52, 0.38, 0.1]} rotation={[0, 0, 0.62]}><capsuleGeometry args={[0.18, 0.58, 6, 10]} /><meshStandardMaterial color={light} roughness={0.7} /></mesh>
        <mesh castShadow position={[-0.76, 0.13, -0.2]} rotation={[0.2, 0.15, 1.05]}><torusGeometry args={[0.48, 0.13, 8, 18, 4.5]} /><meshStandardMaterial color={coat} roughness={0.68} /></mesh>
        <mesh castShadow position={[0, 0.52, 0.58]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.48, 0.08, 8, 22]} /><meshStandardMaterial color={accent} roughness={0.55} /></mesh>
        {hero === "blaze" ? <mesh castShadow position={[0.18, 0.47, 0.66]} rotation={[0.1, 0.2, -0.35]} scale={[0.65, 0.45, 0.18]}><coneGeometry args={[0.32, 0.75, 3]} /><meshStandardMaterial color={accent} roughness={0.8} /></mesh> : null}
        {hero === "luna" ? <mesh position={[0, 0.42, 0.73]}><torusGeometry args={[0.13, 0.045, 8, 18, 4.5]} /><meshStandardMaterial color={accent} metalness={0.35} roughness={0.35} /></mesh> : null}
        {hero === "shadow" ? <mesh position={[0, 0.42, 0.73]}><octahedronGeometry args={[0.12, 0]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.25} /></mesh> : null}
      </CharacterMotion>
    </group>
  );
}

function Dog({ hero, throwing, hit, reducedMotion }: { hero: DogHeroId; throwing: boolean; hit: boolean; reducedMotion: boolean }) {
  const palette = dogTokens[hero];
  const coat = readColor(palette.coat);
  const light = readColor(palette.light);
  const accent = readColor(palette.accent);
  const ink = readColor("--color-ink");
  const bodyScale: [number, number, number] = hero === "bruno" ? [0.92, 0.9, 0.82] : hero === "snow" ? [0.72, 1.02, 0.68] : [0.82, 0.98, 0.75];
  return (
    <group position={[3.35, 0.58, 0]} rotation={[0, -0.28, 0]}>
      <CharacterMotion side="dog" throwing={throwing} hit={hit} reducedMotion={reducedMotion}>
        <mesh castShadow scale={bodyScale}><sphereGeometry args={[0.84, 20, 14]} /><meshStandardMaterial color={coat} roughness={0.76} /></mesh>
        <mesh castShadow position={[0, 1.15, 0]} scale={[1.05, 0.95, 1]}><sphereGeometry args={[0.72, 20, 14]} /><meshStandardMaterial color={coat} roughness={0.72} /></mesh>
        <mesh castShadow position={[0, 0.98, 0.62]} scale={[0.78, 0.6, 0.7]}><sphereGeometry args={[0.52, 18, 12]} /><meshStandardMaterial color={light} roughness={0.8} /></mesh>
        <mesh castShadow position={[0, 1.2, 0.9]} scale={[1, 0.7, 1]}><sphereGeometry args={[0.18, 14, 10]} /><meshStandardMaterial color={ink} roughness={0.32} /></mesh>
        <mesh position={[-0.25, 1.42, 0.58]}><sphereGeometry args={[0.13, 14, 10]} /><meshStandardMaterial color={ink} roughness={0.35} /></mesh>
        <mesh position={[0.25, 1.42, 0.58]}><sphereGeometry args={[0.13, 14, 10]} /><meshStandardMaterial color={ink} roughness={0.35} /></mesh>
        <mesh castShadow position={[-0.58, 1.54, -0.02]} rotation={[0.2, 0.1, hero === "snow" ? 0.2 : 0.75]} scale={[0.42, 1.1, 0.3]}><sphereGeometry args={[0.45, 16, 10]} /><meshStandardMaterial color={hero === "snow" ? coat : ink} roughness={0.82} /></mesh>
        <mesh castShadow position={[0.58, 1.54, -0.02]} rotation={[0.2, -0.1, hero === "snow" ? -0.2 : -0.75]} scale={[0.42, 1.1, 0.3]}><sphereGeometry args={[0.45, 16, 10]} /><meshStandardMaterial color={hero === "snow" ? coat : ink} roughness={0.82} /></mesh>
        <mesh castShadow position={[0.54, 0.33, 0.05]} rotation={[0, 0, 0.62]}><capsuleGeometry args={[0.2, 0.6, 6, 10]} /><meshStandardMaterial color={light} roughness={0.76} /></mesh>
        <mesh castShadow position={[-0.54, 0.33, 0.05]} rotation={[0, 0, -0.62]}><capsuleGeometry args={[0.2, 0.6, 6, 10]} /><meshStandardMaterial color={light} roughness={0.76} /></mesh>
        <mesh castShadow position={[0.83, 0.15, -0.25]} rotation={[0.2, 0.2, -1.05]}><torusGeometry args={[0.48, 0.15, 8, 18, 4.3]} /><meshStandardMaterial color={coat} roughness={0.78} /></mesh>
        <mesh castShadow position={[0, 0.58, 0.57]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.49, 0.09, 8, 22]} /><meshStandardMaterial color={accent} roughness={0.5} /></mesh>
        <mesh position={[0, 0.48, 0.73]}><octahedronGeometry args={[0.13, 0]} /><meshStandardMaterial color={accent} metalness={0.25} roughness={0.3} /></mesh>
      </CharacterMotion>
    </group>
  );
}

function BrickWall() {
  const bricks = useMemo(() => {
    const items = [];
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const offset = row % 2 === 0 ? 0 : 0.28;
        items.push(
          <RoundedBox key={`${row}-${col}`} args={[0.58, 0.46, 1.8]} radius={0.07} smoothness={2} position={[offset, 0.26 + row * 0.42, -0.62 + col * 0.62]} castShadow receiveShadow>
            <meshStandardMaterial color={readColor(row % 2 === 0 ? "--color-brick" : "--color-brick-light")} roughness={0.9} />
          </RoundedBox>,
        );
      }
    }
    return items;
  }, []);
  return <group position={[-0.12, 0, -0.2]}>{bricks}</group>;
}

function FishBone() {
  const bone = readColor("--color-bone");
  return <group rotation={[0.2, 0, -0.15]}><mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.055, 0.055, 0.72, 8]} /><meshStandardMaterial color={bone} roughness={0.65} /></mesh><mesh position={[0.42, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.24, 0.34, 3]} /><meshStandardMaterial color={bone} roughness={0.65} /></mesh>{[-0.24, 0, 0.24].map((x) => <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 4]}><capsuleGeometry args={[0.025, 0.28, 4, 6]} /><meshStandardMaterial color={bone} roughness={0.65} /></mesh>)}</group>;
}

function RubberBone() {
  const bone = readColor("--color-rubber-bone");
  return <group rotation={[0.2, 0.2, 0.2]}><mesh rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[0.12, 0.54, 6, 10]} /><meshStandardMaterial color={bone} roughness={0.48} /></mesh>{[-0.4, 0.4].flatMap((x) => [-0.12, 0.12].map((y) => <mesh key={`${x}-${y}`} position={[x, y, 0]}><sphereGeometry args={[0.16, 10, 8]} /><meshStandardMaterial color={bone} roughness={0.48} /></mesh>))}</group>;
}

function Projectile({ shot, reducedMotion, onComplete }: { shot: ShotVisual; reducedMotion: boolean; onComplete: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const done = useRef(false);
  useFrame((_, delta) => {
    if (!ref.current || done.current) return;
    progress.current = Math.min(1, progress.current + delta / (reducedMotion ? 0.28 : 1.05));
    const t = progress.current;
    const direction = shot.side === "cat" ? 1 : -1;
    const startX = shot.side === "cat" ? -2.75 : 2.75;
    let endX = shot.side === "cat" ? 2.95 : -2.95;
    if (!shot.hit) endX = shot.power < shot.target ? direction * 0.08 : direction * 4.9;
    const arc = shot.hit ? 3.45 : shot.power < shot.target ? 1.55 : 4.2;
    ref.current.position.set(THREE.MathUtils.lerp(startX, endX, t), 1.15 + 4 * arc * t * (1 - t), Math.sin(t * Math.PI) * 0.12);
    ref.current.rotation.z += delta * direction * 8;
    ref.current.rotation.y += delta * 2;
    if (t >= 1) { done.current = true; onComplete(); }
  });
  return <group ref={ref} scale={0.7}>{shot.side === "cat" ? <FishBone /> : <RubberBone />}</group>;
}

function Scene({ shot, hitSide, catHero, dogHero, reducedMotion, lowPowerDevice, onShotComplete }: ArenaProps) {
  return <><color attach="background" args={[readColor("--color-arena-sky")]} /><fog attach="fog" args={[readColor("--color-arena-sky"), 12, 20]} /><ambientLight intensity={1.45} /><directionalLight position={[-4, 8, 6]} intensity={2.35} castShadow={!lowPowerDevice} shadow-mapSize={[lowPowerDevice ? 256 : 512, lowPowerDevice ? 256 : 512]} /><hemisphereLight args={[readColor("--color-arena-light"), readColor("--color-arena-earth"), 1.05]} /><mesh rotation={[-Math.PI / 2, 0, 0]} position={[-3.35, -0.32, 0]} receiveShadow><planeGeometry args={[7, 6]} /><meshStandardMaterial color={readColor("--color-cat-ground")} roughness={0.96} /></mesh><mesh rotation={[-Math.PI / 2, 0, 0]} position={[3.35, -0.32, 0]} receiveShadow><planeGeometry args={[7, 6]} /><meshStandardMaterial color={readColor("--color-dog-ground")} roughness={0.96} /></mesh><GroundShadow x={-3.35} /><GroundShadow x={3.35} /><BrickWall /><Cat hero={catHero} throwing={shot?.side === "cat"} hit={hitSide === "cat"} reducedMotion={reducedMotion} /><Dog hero={dogHero} throwing={shot?.side === "dog"} hit={hitSide === "dog"} reducedMotion={reducedMotion} />{shot ? <Projectile key={shot.id} shot={shot} reducedMotion={reducedMotion} onComplete={onShotComplete} /> : null}</>;
}

export function GameArena3D(props: ArenaProps) {
  return <Canvas className="arena-canvas" aria-label="Interactive 3D backyard arena with selected cat and dog heroes separated by a brick wall" role="img" shadows={!props.lowPowerDevice} dpr={props.lowPowerDevice ? [0.75, 1] : [0.85, 1.35]} camera={{ position: [0, 4.6, 10.6], fov: 40 }} gl={{ antialias: !props.lowPowerDevice, alpha: false, powerPreference: "high-performance" }} performance={{ min: 0.55 }}><AdaptiveDpr /><Suspense fallback={null}><Scene {...props} /></Suspense></Canvas>;
}
