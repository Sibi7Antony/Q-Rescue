"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { Mesh } from "three";
import type { SimulationState } from "@/types/domain";

export default function CityScene({ state }: { state: SimulationState }) {
  return (
    <Canvas camera={{ position: [12, 14, 12], fov: 42 }} dpr={[1, 1.6]} shadows>
      <color attach="background" args={["#1a1e2e"]} />
      <fog attach="fog" args={["#1a1e2e", 18, 38]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[8, 16, 10]}
        intensity={1.8}
        color="#ffeedd"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <pointLight position={[-6, 5, -4]} intensity={0.3} color="#88ccff" />
      <pointLight position={[5, 3, 6]} intensity={0.2} color="#ffaa44" />
      <GroundPlane />
      <CityBlocks state={state} />
      <Roads />
      <Parks />
      <FloodPlane severity={state.disaster.severity} />
      {state.hospitals.map((hospital) => (
        <Marker key={hospital.id} x={hospital.position.x} y={hospital.position.y} color="#B10DC9" height={1.6} label={hospital.name} />
      ))}
      {state.shelters.map((shelter) => (
        <Marker key={shelter.id} x={shelter.position.x} y={shelter.position.y} color="#0074D9" height={0.9} label={shelter.name} />
      ))}
      {state.peopleGroups.map((group) => (
        <DisasterZone key={group.id} x={group.position.x} y={group.position.y} critical={group.risk === "Critical"} label={`${group.zone} (${group.count})`} />
      ))}
      {state.drones.map((drone, index) => (
        <Drone key={drone.id} x={drone.position.x} y={drone.position.y} index={index} label={drone.id} battery={drone.battery} status={drone.status} />
      ))}
      {state.rescueTeams.slice(0, 16).map((team, index) => (
        <Vehicle key={team.id} x={team.position.x} y={team.position.y} index={index} label={team.id} />
      ))}
      {state.incidents.slice(0, 24).map((incident) => (
        <IncidentMarker3D key={incident.id} x={incident.position.x} y={incident.position.y} label={`${incident.id}: ${incident.type}`} priority={incident.priority} />
      ))}
      <OrbitControls enablePan enableZoom minDistance={6} maxDistance={30} maxPolarAngle={Math.PI / 2.2} />
    </Canvas>
  );
}

function toScene(value: number) {
  return (value - 50) / 7;
}

/* ── Ground ── */
function GroundPlane() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color="#2a2d35" roughness={0.95} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#1e2028" roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}

/* ── City Buildings ── */
const BUILDING_COLORS = [
  "#6b7280", "#7c8594", "#5a6270", "#8b939e", "#4a5568",
  "#9ca3af", "#656d78", "#78818d", "#525c69", "#a0a8b4",
  "#3d4654", "#6e7a8a", "#889099", "#445060", "#b0b8c4",
  "#394150", "#727d8c", "#5e6875", "#8a919d", "#4d5866",
];
const GLASS_COLORS = ["#4a8fa8", "#3a7898", "#5ba0b8", "#2d6e88", "#6aafcf"];

function CityBlocks({ state }: { state: SimulationState }) {
  const buildings = useMemo(() => {
    const disasterPositions = state.peopleGroups.map((group) => ({
      x: toScene(group.position.x),
      z: toScene(group.position.y),
      critical: group.risk === "Critical",
    }));

    const result: {
      x: number; z: number; w: number; d: number; h: number;
      color: string; nearDisaster: boolean; nearCritical: boolean;
    }[] = [];

    for (let gx = 0; gx < 11; gx++) {
      for (let gz = 0; gz < 11; gz++) {
        const blockX = -7.5 + gx * 1.45;
        const blockZ = -7.5 + gz * 1.45;
        const blockIdx = gx * 11 + gz;

        // Skip some blocks for parks
        if (blockIdx === 24 || blockIdx === 36 || blockIdx === 78 || blockIdx === 95 || blockIdx === 55) continue;

        const numBuildings = 1 + ((blockIdx * 7) % 3);
        for (let b = 0; b < numBuildings; b++) {
          const offsetX = b === 0 ? 0 : (b === 1 ? 0.35 : -0.3);
          const offsetZ = b === 0 ? 0 : (b === 1 ? -0.25 : 0.3);
          const bx = blockX + offsetX;
          const bz = blockZ + offsetZ;

          const seed = (blockIdx * 13 + b * 37) % 100;
          const h = 0.3 + (seed / 100) * 3.2;
          const w = 0.28 + ((seed * 3) % 40) / 100;
          const d = 0.28 + ((seed * 7) % 40) / 100;

          const distFromCenter = Math.sqrt(bx * bx + bz * bz);
          const centerBoost = distFromCenter < 3 ? 1.5 : distFromCenter < 5 ? 0.8 : 0;
          const finalH = h + centerBoost;

          const nearDisaster = disasterPositions.some(
            (pos) => Math.abs(pos.x - bx) < 2.4 && Math.abs(pos.z - bz) < 2.4
          );
          const nearCritical = disasterPositions.some(
            (pos) => pos.critical && Math.abs(pos.x - bx) < 1.8 && Math.abs(pos.z - bz) < 1.8
          );

          let color: string;
          if (nearCritical) {
            color = "#8b5e3c";
          } else if (nearDisaster) {
            color = "#7a6e5e";
          } else if (finalH > 2.5 && distFromCenter < 4) {
            color = GLASS_COLORS[seed % GLASS_COLORS.length];
          } else {
            color = BUILDING_COLORS[seed % BUILDING_COLORS.length];
          }

          result.push({ x: bx, z: bz, w, d, h: finalH, color, nearDisaster, nearCritical });
        }
      }
    }
    return result;
  }, [state.peopleGroups]);

  return (
    <group>
      {buildings.map((b, index) => (
        <mesh key={index} position={[b.x, b.h / 2, b.z]} castShadow receiveShadow>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial
            color={b.color}
            roughness={b.h > 2 ? 0.3 : 0.85}
            metalness={b.h > 2 ? 0.4 : 0.05}
          />
        </mesh>
      ))}
      {buildings
        .filter((b) => b.h > 2.5)
        .map((b, index) => (
          <mesh key={`roof-${index}`} position={[b.x, b.h + 0.05, b.z]}>
            <boxGeometry args={[b.w * 0.3, 0.08, b.d * 0.3]} />
            <meshStandardMaterial color="#ff4444" emissive="#ff2222" emissiveIntensity={0.8} />
          </mesh>
        ))}
    </group>
  );
}

/* ── Roads ── */
function Roads() {
  const roadPositions = [-7.5, -6.05, -4.6, -3.15, -1.7, -0.25, 1.2, 2.65, 4.1, 5.55, 7.0];
  return (
    <group>
      {roadPositions.map((pos, i) => (
        <group key={`h-${i}`}>
          <mesh position={[0, 0.005, pos]} receiveShadow>
            <boxGeometry args={[18, 0.02, 0.22]} />
            <meshStandardMaterial color="#3a3d45" roughness={0.9} />
          </mesh>
          {Array.from({ length: 18 }, (_, j) => (
            <mesh key={j} position={[-8.5 + j, 0.012, pos]} receiveShadow>
              <boxGeometry args={[0.3, 0.01, 0.03]} />
              <meshStandardMaterial color="#f59e0b" roughness={0.8} emissive="#f59e0b" emissiveIntensity={0.15} />
            </mesh>
          ))}
        </group>
      ))}
      {roadPositions.map((pos, i) => (
        <group key={`v-${i}`}>
          <mesh position={[pos, 0.005, 0]} receiveShadow>
            <boxGeometry args={[0.22, 0.02, 18]} />
            <meshStandardMaterial color="#3a3d45" roughness={0.9} />
          </mesh>
          {Array.from({ length: 18 }, (_, j) => (
            <mesh key={j} position={[pos, 0.012, -8.5 + j]} receiveShadow>
              <boxGeometry args={[0.03, 0.01, 0.3]} />
              <meshStandardMaterial color="#f59e0b" roughness={0.8} emissive="#f59e0b" emissiveIntensity={0.15} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* ── Parks / Green Areas ── */
function Parks() {
  const parks = [
    { x: -4.1, z: -3.85, w: 1.2, d: 1.2 },
    { x: -0.8, z: -1.0, w: 1.0, d: 1.4 },
    { x: 3.5, z: 4.5, w: 1.4, d: 1.0 },
    { x: 5.0, z: -2.0, w: 1.0, d: 1.0 },
    { x: -2.5, z: 3.8, w: 1.3, d: 1.1 },
  ];
  return (
    <group>
      {parks.map((park, i) => (
        <group key={i}>
          <mesh position={[park.x, 0.01, park.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[park.w, park.d]} />
            <meshStandardMaterial color="#3d7a4a" roughness={1} />
          </mesh>
          {Array.from({ length: 3 + (i % 3) }, (_, j) => {
            const tx = park.x + (j * 0.35 - 0.35);
            const tz = park.z + ((j * 17) % 5) * 0.15 - 0.3;
            return (
              <group key={j} position={[tx, 0, tz]}>
                <mesh position={[0, 0.2, 0]} castShadow>
                  <cylinderGeometry args={[0.03, 0.04, 0.4, 6]} />
                  <meshStandardMaterial color="#5c4033" roughness={1} />
                </mesh>
                <mesh position={[0, 0.5, 0]} castShadow>
                  <sphereGeometry args={[0.18 + (j % 2) * 0.06, 8, 6]} />
                  <meshStandardMaterial color={j % 2 === 0 ? "#2d6b3f" : "#4a8c5e"} roughness={0.9} />
                </mesh>
              </group>
            );
          })}
        </group>
      ))}
    </group>
  );
}

/* ── Flood Water ── */
function FloodPlane({ severity }: { severity: number }) {
  const ref = useRef<Mesh>(null);
  const waterLevel = severity > 40 ? -0.02 + (severity / 100) * 0.08 : -0.15;

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = waterLevel + Math.sin(clock.elapsedTime * 0.8) * 0.02;
      ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.3) * 0.005;
    }
  });

  if (severity < 30) return null;

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, waterLevel, 0]} receiveShadow>
      <planeGeometry args={[20, 20, 16, 16]} />
      <meshStandardMaterial color="#1a6fa8" transparent opacity={0.7} roughness={0.2} metalness={0.3} />
    </mesh>
  );
}

/* ── Markers ── */
function Marker({ x, y, color, height, label }: { x: number; y: number; color: string; height: number; label: string }) {
  return (
    <group position={[toScene(x), 0, toScene(y)]}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, height, 16]} />
        <meshStandardMaterial color={color} roughness={0.6} emissive={color} emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, height, 0]}>
        <sphereGeometry args={[0.12, 12, 8]} />
        <meshStandardMaterial color="#fff" emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <Html position={[0, height + 0.4, 0]} center distanceFactor={10} style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap border-2 border-black bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-black shadow-[2px_2px_0_0_#000]">
          {label}
        </div>
      </Html>
    </group>
  );
}

function DisasterZone({ x, y, critical, label }: { x: number; y: number; critical: boolean; label: string }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const scale = 1 + Math.sin(clock.elapsedTime * 2.2) * 0.1;
      ref.current.scale.set(scale, 1, scale);
    }
  });
  return (
    <group position={[toScene(x), 0, toScene(y)]}>
      <mesh ref={ref} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[critical ? 0.9 : 0.65, 32]} />
        <meshStandardMaterial
          color={critical ? "#ff4136" : "#fae315"}
          roughness={1}
          transparent
          opacity={0.6}
          emissive={critical ? "#ff0000" : "#ffcc00"}
          emissiveIntensity={0.4}
        />
      </mesh>
      <Html position={[0, 0.6, 0]} center distanceFactor={10} style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap border-2 border-black bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-black shadow-[2px_2px_0_0_#000]">
          {label}
        </div>
      </Html>
    </group>
  );
}

function Drone({ x, y, index, label, battery, status }: { x: number; y: number; index: number; label: string; battery: number; status: string }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = 2.2 + Math.sin(clock.elapsedTime * 1.7 + index) * 0.25;
      ref.current.rotation.y += 0.04;
    }
  });

  return (
    <group position={[toScene(x), 0, toScene(y)]}>
      <mesh ref={ref} position={[0, 2.2, 0]} castShadow>
        <octahedronGeometry args={[0.22]} />
        <meshStandardMaterial
          color={status === "Charging" ? "#fae315" : "#0074D9"}
          roughness={0.5}
          emissive={status === "Charging" ? "#fae315" : "#0074D9"}
          emissiveIntensity={0.3}
        />
      </mesh>
      <Html position={[0, 3.0, 0]} center distanceFactor={10} style={{ pointerEvents: "none" }}>
        <div className="flex flex-col items-center gap-1">
          <div className="whitespace-nowrap border-2 border-black bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-black shadow-[2px_2px_0_0_#000]">
            {label}
          </div>
          <div className="whitespace-nowrap border-2 border-black bg-[#fae315] px-1 py-0.5 font-mono text-[9px] font-bold text-black shadow-[2px_2px_0_0_#000]">
            ⚡ {battery}%
          </div>
        </div>
      </Html>
    </group>
  );
}

function Vehicle({ x, y, index, label }: { x: number; y: number; index: number; label: string }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.x = toScene(x) + Math.sin(clock.elapsedTime * 0.6 + index) * 0.3;
    }
  });
  return (
    <group>
      <mesh ref={ref} position={[toScene(x), 0.2, toScene(y)]} castShadow>
        <boxGeometry args={[0.35, 0.28, 0.5]} />
        <meshStandardMaterial color="#2ECC40" roughness={0.7} emissive="#2ECC40" emissiveIntensity={0.15} />
      </mesh>
      <Html position={[toScene(x), 0.8, toScene(y)]} center distanceFactor={12} style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap border-2 border-black bg-white px-2 py-0.5 font-mono text-[9px] font-bold text-black shadow-[2px_2px_0_0_#000]">
          {label}
        </div>
      </Html>
    </group>
  );
}

function IncidentMarker3D({ x, y, label, priority }: { x: number; y: number; label: string; priority: string }) {
  const ref = useRef<Mesh>(null);
  const isCritical = priority === "Critical";

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = 0.7 + Math.sin(clock.elapsedTime * 3 + x) * 0.12;
      ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.15);
    }
  });

  return (
    <group position={[toScene(x), 0, toScene(y)]}>
      <mesh ref={ref} position={[0, 0.7, 0]} castShadow>
        <coneGeometry args={[0.17, 0.45, 4]} />
        <meshStandardMaterial
          color={isCritical ? "#ff4136" : "#FF851B"}
          roughness={0.8}
          emissive={isCritical ? "#ff0000" : "#ff8800"}
          emissiveIntensity={0.4}
        />
      </mesh>
      <Html position={[0, 1.4, 0]} center distanceFactor={10} style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap border-2 border-black bg-black px-2 py-0.5 font-mono text-[9px] font-bold text-white shadow-[2px_2px_0_0_#ff4136]">
          {label}
        </div>
      </Html>
    </group>
  );
}
