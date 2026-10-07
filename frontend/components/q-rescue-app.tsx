"use client";

import dynamic from "next/dynamic";
import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  CloudRain,
  Droplets,
  Factory,
  Flame,
  Layers3,
  Mountain,
  Pause,
  Play,
  RefreshCcw,
  Search,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Wind,
  Zap
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GlassPanel } from "@/components/ui/glass-panel";
import { MetricCard } from "@/components/ui/metric-card";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { TopCommandPrompt } from "@/components/TopCommandPrompt";
import { cloneSimulation } from "@/lib/demo-data";
import { createIncident, generateScenario, type ScenarioInput } from "@/lib/simulation";
import type { DisasterType, Incident, Priority, SimulationState } from "@/types/domain";

const CityScene = dynamic(() => import("@/components/three/city-scene"), {
  ssr: false,
  loading: () => <div className="flex h-full min-h-96 items-center justify-center text-sm text-cyan-100/70"><span className="ticker-dot mr-2 inline-block h-2 w-2 rounded-full bg-cyan-300" />Initializing 3D city telemetry...</div>
});

const disasterTypes: DisasterType[] = ["Flood", "Earthquake", "Wildfire", "Cyclone", "Landslide", "Industrial accident"];
const priorityOrder: Record<Priority, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const disasterIcons: Record<DisasterType, typeof Flame> = {
  Flood: CloudRain,
  Earthquake: Activity,
  Wildfire: Flame,
  Cyclone: Wind,
  Landslide: Mountain,
  "Industrial accident": Factory
};
type LayerState = {
  disasterZones: boolean;
  rescueTeams: boolean;
  drones: boolean;
  hospitals: boolean;
  shelters: boolean;
  roads: boolean;
  resources: boolean;
  incidents: boolean;
};

export default function QRescueApp() {
  const [launched, setLaunched] = useState(false);
  const [state, setState] = useState<SimulationState>(() => cloneSimulation());
  const [viewMode, setViewMode] = useState<"2D" | "3D">("2D");
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<"priority" | "people">("priority");
  const [simClock, setSimClock] = useState(0);
  const [layers, setLayers] = useState({
    disasterZones: true,
    rescueTeams: true,
    drones: true,
    hospitals: true,
    shelters: true,
    roads: true,
    resources: true,
    incidents: true
  });
  const [scenario, setScenario] = useState<ScenarioInput>({
    type: "Flood",
    severity: 78,
    populationDensity: "High",
    roadBlockage: 54,
    drones: 8,
    rescueTeams: 21,
    ambulances: 12
  });

  useEffect(() => {
    if (!launched || state.disaster.status === "Paused") return;
    const timer = window.setInterval(() => setSimClock((c) => c + 1), 1000);
    return () => window.clearInterval(timer);
  }, [launched, state.disaster.status]);

  const metrics = useMemo(() => {
    const shelterCapacity = state.shelters.reduce((sum, shelter) => sum + shelter.capacity - shelter.occupied, 0);
    const availableResources = Math.round(state.resources.reduce((sum, resource) => sum + resource.stockPercent, 0) / state.resources.length);
    const avgEta = Math.round(state.rescueTeams.reduce((sum, team) => sum + team.eta, 0) / Math.max(1, state.rescueTeams.length));
    return {
      incidents: state.disaster.activeIncidents,
      people: state.disaster.affectedPopulation,
      teams: state.rescueTeams.filter((team) => team.availability !== "Available").length,
      drones: state.drones.filter((drone) => drone.status === "Active").length,
      ambulances: state.ambulances.filter((ambulance) => ambulance.status !== "Available").length,
      shelterCapacity,
      resources: availableResources,
      avgResponse: `0${Math.floor(avgEta / 60)}:${String(avgEta % 60).padStart(2, "0")}`
    };
  }, [state]);

  const filteredIncidents = useMemo(() => {
    return state.incidents
      .filter((incident) => `${incident.id} ${incident.type} ${incident.location}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (sortMode === "priority" ? priorityOrder[a.priority] - priorityOrder[b.priority] : b.people - a.people));
  }, [state.incidents, query, sortMode]);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const applyScenario = () => {
    setState(generateScenario(scenario));
    notify("Response plan updated from simulated conditions.");
  };

  const pauseResume = () => {
    setState((current) => ({
      ...current,
      disaster: {
        ...current.disaster,
        status: current.disaster.status === "Paused" ? "Running" : "Paused"
      }
    }));
  };

  const reset = () => {
    setState(cloneSimulation());
    setSimClock(0);
    setScenario({
      type: "Flood",
      severity: 78,
      populationDensity: "High",
      roadBlockage: 54,
      drones: 8,
      rescueTeams: 21,
      ambulances: 12
    });
    notify("Default severe flood scenario restored.");
  };

  const assignNearestTeam = (incidentId: string) => {
    setState((current) => ({
      ...current,
      incidents: current.incidents.map((incident) =>
        incident.id === incidentId
          ? { ...incident, status: "Assigned", assignedAssets: Array.from(new Set([...incident.assignedAssets, "TEAM-04", "DRONE-05"])) }
          : incident
      ),
      updatedActions: ["Nearest available rescue team assigned", ...current.updatedActions.slice(0, 4)]
    }));
    notify(`Optimized simulated assignment created for ${incidentId}.`);
  };

  const addIncident = (incident: Incident) => {
    setState((current) => ({
      ...current,
      incidents: [incident, ...current.incidents],
      disaster: {
        ...current.disaster,
        activeIncidents: current.disaster.activeIncidents + 1,
        affectedPopulation: current.disaster.affectedPopulation + incident.people
      },
      updatedActions: [`Incident ${incident.id} assigned to ${incident.assignedAssets.join(", ")}`, ...current.updatedActions.slice(0, 4)]
    }));
    notify(`Incident ${incident.id} generated and assigned.`);
  };

  if (!launched) {
    return (
      <LandingPage
        onLaunch={() => setLaunched(true)}
        onExecuteCommand={(cmd) => {
          if (cmd === "/run" || cmd.startsWith("/run")) {
            setLaunched(true);
            notify("Simulation launched via CLI command.");
          } else if (cmd.includes("Tokyo")) {
            setScenario((s) => ({ ...s, severity: 88, populationDensity: "High", roadBlockage: 65 }));
            notify("Preset Tokyo loaded via CLI.");
          } else if (cmd.includes("SanFrancisco")) {
            setScenario((s) => ({ ...s, severity: 72, populationDensity: "High", roadBlockage: 48, drones: 12 }));
            notify("Preset San Francisco loaded via CLI.");
          } else if (cmd.includes("/qubo-depth")) {
            notify("QAOA optimizer depth updated to p=4.");
          } else if (cmd.includes("/shots")) {
            notify("Quantum sampler configured to 1024 shots.");
          }
        }}
      />
    );
  }

  const formatClock = () => {
    const hours = Math.floor(simClock / 3600);
    const minutes = Math.floor((simClock % 3600) / 60);
    const seconds = simClock % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  return (
    <main className="bg-brutal-grid min-h-screen text-black">
      <TopNavigation state={state} onReset={reset} simClock={formatClock()} />
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-5 px-3 py-4 sm:px-5 lg:px-6">
        <SafetyBanner />
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <MetricCard label="Active Incidents" value={metrics.incidents} tone="red" trend="up" />
          <MetricCard label="People At Risk" value={metrics.people} tone="amber" trend="up" />
          <MetricCard label="Teams Deployed" value={metrics.teams} tone="green" trend="up" />
          <MetricCard label="Drones Active" value={metrics.drones} tone="cyan" />
          <MetricCard label="Ambulances" value={metrics.ambulances} tone="violet" />
          <MetricCard label="Shelter Capacity" value={metrics.shelterCapacity} tone="green" trend="down" />
          <MetricCard label="Resources" value={metrics.resources} suffix="%" tone="amber" trend="down" />
          <MetricCard label="Avg Response" value={metrics.avgResponse} tone="cyan" />
        </section>

        {/* Row 1: Tactical Command, Response Map, Operations */}
        <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_380px] items-stretch">
          <aside className="flex h-full flex-col gap-4">
            <SimulatorPanel
              scenario={scenario}
              setScenario={setScenario}
              status={state.disaster.status}
              onGenerate={applyScenario}
              onPauseResume={pauseResume}
              onReset={reset}
            />
            <AlertSystem state={state} />
          </aside>

          <section className="flex h-full min-w-0 flex-col gap-4">
            <GlassPanel
              title="Live Response Map"
              eyebrow="Simulated city grid"
              action={
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode("2D")}
                    className={`border-2 px-3 py-1.5 text-xs font-black uppercase ${viewMode === "2D" ? "border-black bg-[#fae315] text-black" : "border-black bg-white text-black hover:bg-[#fae315]"}`}
                  >
                    2D MAP
                  </button>
                  <button
                    onClick={() => setViewMode("3D")}
                    className={`border-2 px-3 py-1.5 text-xs font-black uppercase ${viewMode === "3D" ? "border-black bg-[#fae315] text-black" : "border-black bg-white text-black hover:bg-[#fae315]"}`}
                  >
                    3D CITY
                  </button>
                </div>
              }
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_210px]">
                <div className="h-[460px] overflow-hidden rounded-lg border border-cyan-300/15 bg-slate-950/60">
                  {viewMode === "2D" ? (
                    <ResponseMap state={state} layers={layers} onAssign={assignNearestTeam} />
                  ) : (
                    <CityScene state={state} />
                  )}
                </div>
                <LayerControls layers={layers} setLayers={setLayers} />
              </div>
            </GlassPanel>
            <WhatIfPanel scenario={scenario} setScenario={setScenario} onGenerate={applyScenario} state={state} />
          </section>

          <aside className="flex h-full flex-col gap-4">
            <QAssistPanel state={state} />
            <MissionTimeline state={state} />
          </aside>
        </section>

        {/* Row 2: Telemetry Analytics + SOS Helpline Queue */}
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px] items-stretch">
          <AnalyticsPanel state={state} />
          <IncidentPanel incidents={filteredIncidents} query={query} setQuery={setQuery} sortMode={sortMode} setSortMode={setSortMode} onAssign={assignNearestTeam} />
        </section>

        {/* Row 3: Fleet & Continuity Operations */}
        <section className="grid gap-4 xl:grid-cols-3 items-stretch">
          <DroneCommand state={state} onOptimize={() => notify("Drone allocation optimizer reassigned search coverage.")} />
          <RescueTeams state={state} onOptimize={() => notify("Rescue-team optimizer balanced ETA, capacity, and mission priority.")} />
          <ShelterHospitalResource state={state} onOptimize={() => notify("Evacuation, hospital, and resource plans recalculated.")} />
        </section>

        {/* Row 4: Quantum Lab + SOS Intake */}
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_440px] items-stretch">
          <QuantumLab state={state} notify={notify} />
          <HelplinePanel onSubmit={addIncident} />
        </section>
      </div>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="brutal-card fixed bottom-5 right-5 z-50 max-w-sm bg-white px-5 py-4 text-sm font-bold text-black"
            role="status"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════════════════ */

function LandingPage({
  onLaunch,
  onExecuteCommand
}: {
  onLaunch: () => void;
  onExecuteCommand?: (cmd: string) => void;
}) {
  const handleCommand = (cmd: string) => {
    if (cmd === "/run" || cmd.startsWith("/run")) {
      onLaunch();
    }
    onExecuteCommand?.(cmd);
  };

  return (
    <main className="bg-brutal-grid min-h-screen overflow-hidden text-black">
      <TopCommandPrompt onExecuteCommand={handleCommand} />
      <section className="relative flex min-h-[92vh] items-center px-5 py-12">
        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.75fr)] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <p className="border-4 border-black bg-white inline-block px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.34em]">Tactical Digital Twin</p>
            <h1 className="mt-5 max-w-4xl text-[4rem] font-black uppercase leading-none text-black sm:text-7xl lg:text-[7rem] tracking-tighter" style={{ textShadow: "4px 4px 0px #fae315, 8px 8px 0px #000" }}>
              Q-RESCUE
            </h1>
            <p className="mt-5 max-w-3xl text-2xl font-black uppercase tracking-[0.05em] sm:text-4xl">
              Quantum-powered disaster response simulation
            </p>
            <p className="mt-6 max-w-2xl text-xl font-bold">
              Optimizing every second when every second matters.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <button
                onClick={onLaunch}
                className="brutal-btn group relative inline-flex items-center gap-2 px-8 py-4 font-mono text-lg font-black uppercase tracking-[0.16em]"
              >
                <Play size={20} fill="currentColor" className="transition-transform group-hover:scale-110" />
                Launch Simulation
              </button>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.15 }}
            className="brutal-card bg-white p-2"
          >
            <div className="relative aspect-[4/3] overflow-hidden border-4 border-black bg-white">
              <NetworkGraph />
              <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2 z-10">
                {[
                  { label: "QUBO", status: "SIM ACTIVE", param: "Vars: 104, Depth: 2" },
                  { label: "QAOA", status: "SIM ACTIVE", param: "Iter: 50, Shots: 1024" },
                  { label: "ROUTE", status: "SIM ACTIVE", param: "Nodes: 48, Edges: 86" }
                ].map((item, idx) => (
                  <motion.div
                    key={item.label}
                    className="group relative flex cursor-default items-center gap-2 border-[3px] border-black bg-white px-3 py-1.5 transition-transform hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000]"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 + idx * 0.15 }}
                  >
                    <span className="font-mono text-[10px] font-black uppercase text-black">{item.label}</span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-black">
                      <span className="brutal-pulse inline-block h-1.5 w-1.5 bg-[#2ECC40]" />
                      {item.status}
                    </span>
                    <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap border-[3px] border-black bg-[#fae315] px-2 py-1 font-mono text-[10px] font-black text-black opacity-0 transition-opacity group-hover:opacity-100">
                      {item.param}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Disclaimer Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-center pb-4 pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }}
          className="border-4 border-black bg-[#fae315] px-5 py-2 font-mono text-sm font-bold uppercase tracking-wide text-black shadow-[4px_4px_0_0_#000]"
        >
          Tactical digital twin & quantum response matrix.
        </motion.div>
      </div>
      <section className="relative z-10 mx-auto grid max-w-7xl gap-5 px-5 pb-16 md:grid-cols-4">
        {[
          { title: "The Problem", copy: "Disaster response involves difficult allocation, routing, triage, shelter, and resource decisions under uncertainty.", icon: AlertTriangle },
          { title: "The Approach", copy: "Q-RESCUE combines a local simulation engine, classical optimization, data visualization, and quantum-computing experiments.", icon: Activity },
          { title: "The Quantum Layer", copy: "Selected allocation problems are formulated as QUBO models and explored with QAOA-style simulation results.", icon: Zap },
          { title: "The Mission", copy: "Study how emerging computational techniques could support planning research without replacing professional responders.", icon: Search }
        ].map((item, idx) => (
          <motion.div
            key={item.title}
            className="brutal-card brutal-card-hover group flex flex-col p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + idx * 0.1 }}
          >
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center border-4 border-black bg-white transition-colors group-hover:bg-[#fae315]">
              <item.icon size={24} className="text-black" />
            </div>
            <h2 className="text-xl font-black uppercase text-black">{item.title}</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-black opacity-90">{item.copy}</p>
          </motion.div>
        ))}
      </section>
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NETWORK GRAPH (Landing Page Hero)
   ═══════════════════════════════════════════════════════════════ */

function NetworkGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const W = canvas.offsetWidth || 480;
    const H = canvas.offsetHeight || 360;
    canvas.width = W;
    canvas.height = H;

    const NODE_COUNT = 52;
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(W, H) * 0.47;

    // ── Layout 1: Organic 3-cluster ──
    function clusterLayout(): { x: number; y: number }[] {
      return Array.from({ length: NODE_COUNT }, (_, i) => {
        const cluster = i % 3;
        const ocx = cx + Math.cos((cluster / 3) * Math.PI * 2) * R * 0.36;
        const ocy = cy + Math.sin((cluster / 3) * Math.PI * 2) * R * 0.36;
        const angle = ((i * 137) % 628) / 100;
        const r = (((i * 73) % 100) / 100) * R * 0.3 + R * 0.04;
        return { x: ocx + Math.cos(angle) * r, y: ocy + Math.sin(angle) * r };
      });
    }

    // ── Layout 2: Single circle ring ──
    function ringLayout(): { x: number; y: number }[] {
      return Array.from({ length: NODE_COUNT }, (_, i) => {
        const angle = (i / NODE_COUNT) * Math.PI * 2 - Math.PI / 2;
        return { x: cx + Math.cos(angle) * R, y: cy + Math.sin(angle) * R };
      });
    }

    // ── Layout 3: Two concentric rings (donut) ──
    function donutLayout(): { x: number; y: number }[] {
      return Array.from({ length: NODE_COUNT }, (_, i) => {
        const inner = i % 2 === 0;
        const ringR = inner ? R * 0.52 : R * 0.92;
        const total = inner ? Math.ceil(NODE_COUNT / 2) : Math.floor(NODE_COUNT / 2);
        const idx = Math.floor(i / 2);
        const angle = (idx / total) * Math.PI * 2 - Math.PI / 2;
        return { x: cx + Math.cos(angle) * ringR, y: cy + Math.sin(angle) * ringR };
      });
    }

    // ── Layout 4: Organic spiral ──
    function spiralLayout(): { x: number; y: number }[] {
      return Array.from({ length: NODE_COUNT }, (_, i) => {
        const t = i / NODE_COUNT;
        const angle = t * Math.PI * 5;
        const r = t * R * 0.94;
        return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
      });
    }

    // Loop: cluster → ring → donut → spiral → cluster
    const layouts = [clusterLayout(), ringLayout(), donutLayout(), spiralLayout(), clusterLayout()];

    // ── Edges ──
    const edges: { a: number; b: number; red: boolean }[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      edges.push({ a: i, b: (i + 1) % NODE_COUNT, red: i % 2 === 0 });
      if (i % 2 !== 0) edges.push({ a: i, b: (i + 3) % NODE_COUNT, red: false });
      if (i % 5 === 0) edges.push({ a: i, b: (i + Math.floor(NODE_COUNT / 3) + 1) % NODE_COUNT, red: true });
      if (i % 9 === 0) edges.push({ a: i, b: (i + Math.floor(NODE_COUNT / 2) + 2) % NODE_COUNT, red: i % 3 === 0 });
    }

    // ── Animation ──
    const PHASE_MS = 3200;
    let phase = 0;
    let phaseT = 0;
    let lastTime = performance.now();
    const maxDist = Math.sqrt(W * W + H * H);

    function easeInOut(t: number) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function draw(now: number) {
      const dt = now - lastTime;
      lastTime = now;

      phaseT += dt / PHASE_MS;
      if (phaseT >= 1) {
        phaseT -= 1;
        phase = (phase + 1) % (layouts.length - 1);
      }

      const t = easeInOut(phaseT);
      const from = layouts[phase];
      const to   = layouts[phase + 1];

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);

      // Lerped positions
      const pos = Array.from({ length: NODE_COUNT }, (_, i) => ({
        x: from[i].x + (to[i].x - from[i].x) * t,
        y: from[i].y + (to[i].y - from[i].y) * t,
      }));

      // Edges — opacity fades with distance
      for (const e of edges) {
        const dx = pos[e.b].x - pos[e.a].x;
        const dy = pos[e.b].y - pos[e.a].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const alpha = Math.max(0.35, Math.min(0.92, 1.3 - dist / (maxDist * 0.45)));
        ctx.beginPath();
        ctx.moveTo(pos[e.a].x, pos[e.a].y);
        ctx.lineTo(pos[e.b].x, pos[e.b].y);
        ctx.strokeStyle = e.red
          ? `rgba(217,70,40,${alpha})`
          : `rgba(30,180,148,${alpha})`;
        ctx.lineWidth = 2.0;
        ctx.stroke();
      }

      // Nodes
      for (let i = 0; i < NODE_COUNT; i++) {
        const r = i < 5 ? 7 : i < 18 ? 5 : 3.5;
        ctx.beginPath();
        ctx.arc(pos[i].x, pos[i].y, r, 0, Math.PI * 2);
        ctx.fillStyle = "#111111";
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-label="Animated quantum network graph"
      role="img"
    />
  );
}

function QuantumField() {

  return (
    <div className="absolute inset-0 overflow-hidden bg-topographic">
      {Array.from({ length: 48 }).map((_, index) => (
        <motion.span
          key={index}
          className="absolute h-px w-16 origin-left bg-cyan-300/30 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
          style={{ left: `${(index * 17) % 100}%`, top: `${(index * 23) % 100}%`, rotate: `${(index * 37) % 180}deg` }}
          animate={{ opacity: [0.08, 0.7, 0.08], x: [0, 40, 0] }}
          transition={{ duration: 4 + (index % 7), repeat: Infinity, delay: index * 0.04 }}
        />
      ))}
      {/* Animated Matrix Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] animate-[matrix-scroll_20s_linear_infinite]" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TOP NAVIGATION
   ═══════════════════════════════════════════════════════════════ */

function TopNavigation({ state, onReset, simClock }: { state: SimulationState; onReset: () => void; simClock: string }) {
  return (
    <header className="sticky top-0 z-40 border-b-[6px] border-black bg-white">
      <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3 px-3 py-3 sm:px-5 lg:px-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center border-4 border-black bg-[#ff4136] text-white">
            <ShieldAlert size={24} />
          </div>
          <div>
            <p className="font-mono text-2xl font-black tracking-widest text-black uppercase">Q-RESCUE</p>
            <p className="text-xs font-bold text-black uppercase opacity-60">Disaster coordination platform</p>
          </div>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <span className="inline-flex items-center gap-2 border-[3px] border-black bg-[#2ECC40] px-3 py-2 text-xs font-black uppercase text-black">
            <span className="brutal-pulse inline-block h-2 w-2 bg-black" />
            System online
          </span>
          <span className="border-[3px] border-black bg-white px-3 py-2 text-xs font-black uppercase text-black">
            Severe {state.disaster.type} / {state.disaster.severity}%
          </span>
          <span className="inline-flex items-center gap-1.5 border-[3px] border-black bg-[#B10DC9] px-3 py-2 font-mono text-xs font-black uppercase text-white">
            <span className="brutal-pulse inline-block h-2 w-2 bg-white" />
            {simClock}
          </span>
          {state.disaster.activeIncidents > 10 && (
            <motion.span
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center gap-1.5 border-[3px] border-black bg-[#ff4136] px-3 py-2 text-xs font-black uppercase text-white"
            >
              <AlertTriangle size={16} />
              {state.disaster.activeIncidents} incidents
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button className="border-4 border-black bg-white p-2 transition-colors hover:bg-[#fae315]" aria-label="Notifications"><Bell size={20} /></button>
          <button className="border-4 border-black bg-white p-2 transition-colors hover:bg-[#fae315]" onClick={onReset} aria-label="Reset simulation"><RefreshCcw size={20} /></button>
          <button className="border-4 border-black bg-white p-2 transition-colors hover:bg-[#fae315]" aria-label="System settings"><Settings size={20} /></button>
        </div>
      </div>
    </header>
  );
}

function SafetyBanner() {
  return (
    <div className="border-4 border-black bg-[#fae315] px-5 py-4 text-base font-bold text-black shadow-[6px_6px_0_0_#000]">
      <strong className="uppercase">Q-RESCUE IS A TACTICAL DISASTER DIGITAL TWIN.</strong> It models real-time operational response scenarios, multi-zone resource routing, and quantum-inspired optimization algorithms.
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SIMULATOR PANEL
   ═══════════════════════════════════════════════════════════════ */

function SimulatorPanel({
  scenario,
  setScenario,
  status,
  onGenerate,
  onPauseResume,
  onReset
}: {
  scenario: ScenarioInput;
  setScenario: (scenario: ScenarioInput) => void;
  status: string;
  onGenerate: () => void;
  onPauseResume: () => void;
  onReset: () => void;
}) {
  const DisasterIcon = disasterIcons[scenario.type];
  return (
    <GlassPanel title="Disaster Simulator" eyebrow="Scenario engine">
      <div className="space-y-4 font-mono">
        <label className="block text-sm font-bold text-black">
          Disaster
          <div className="mt-2 flex items-center gap-2">
            <DisasterIcon size={24} className="text-[#ff4136]" />
            <select
              value={scenario.type}
              onChange={(event) => setScenario({ ...scenario, type: event.target.value as DisasterType })}
              className="w-full border-4 border-black bg-white px-3 py-2 font-bold text-black focus:outline-none focus:ring-0"
            >
              {disasterTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
          </div>
        </label>
        <Slider label="Severity" value={scenario.severity} onChange={(severity) => setScenario({ ...scenario, severity })} />
        <label className="block text-sm font-bold text-black">
          Population density
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["Low", "Medium", "High"] as const).map((density) => (
              <button
                key={density}
                onClick={() => setScenario({ ...scenario, populationDensity: density })}
                className={`border-4 px-3 py-2 text-xs font-black uppercase transition-all ${scenario.populationDensity === density ? "border-black bg-black text-white" : "border-black bg-white text-black hover:bg-[#fae315]"}`}
              >
                {density}
              </button>
            ))}
          </div>
        </label>
        <Slider label="Road blockage" value={scenario.roadBlockage} onChange={(roadBlockage) => setScenario({ ...scenario, roadBlockage })} />
        <div className="grid grid-cols-3 gap-2">
          <NumberInput label="Drones" value={scenario.drones} min={3} max={16} onChange={(drones) => setScenario({ ...scenario, drones })} />
          <NumberInput label="Teams" value={scenario.rescueTeams} min={6} max={30} onChange={(rescueTeams) => setScenario({ ...scenario, rescueTeams })} />
          <NumberInput label="Amb." value={scenario.ambulances} min={3} max={18} onChange={(ambulances) => setScenario({ ...scenario, ambulances })} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button onClick={onGenerate} className="brutal-btn py-3 text-xs">Generate</button>
          <button onClick={onPauseResume} className="flex items-center justify-center gap-2 border-4 border-black bg-white px-3 py-2 font-black uppercase text-black hover:bg-black hover:text-white transition-colors">
            {status === "Paused" ? <Play size={16} /> : <Pause size={16} />}
            {status === "Paused" ? "Resume" : "Pause"}
          </button>
          <button onClick={onReset} className="col-span-2 border-4 border-black bg-white px-3 py-3 font-black uppercase text-black hover:bg-[#ff4136] hover:text-white transition-colors">Reset Scenario</button>
        </div>
      </div>
    </GlassPanel>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block text-sm font-bold text-black font-mono">
      <span className="flex justify-between"><span>{label}</span><span className="bg-black text-white px-2 py-0.5">{value}%</span></span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full appearance-none h-4 border-2 border-black bg-white focus:outline-none slider-thumb-brutal"
      />
    </label>
  );
}

function NumberInput({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <label className="text-xs font-bold text-black font-mono">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value))))}
        className="mt-1 w-full border-4 border-black bg-white px-2 py-2 text-sm font-black text-black focus:outline-none"
      />
    </label>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ALERT SYSTEM
   ═══════════════════════════════════════════════════════════════ */

function AlertSystem({ state }: { state: SimulationState }) {
  const alerts = [
    { tone: "red", title: "CRITICAL", copy: `${state.incidents[0]?.id ?? "QX-1047"}: ${state.incidents[0]?.people ?? 4} people need rescue` },
    { tone: "amber", title: "WARNING", copy: `Shelter capacity at ${Math.round((state.shelters.reduce((s, x) => s + x.occupied, 0) / state.shelters.reduce((s, x) => s + x.capacity, 0)) * 100)}%` },
    { tone: "yellow", title: "RESOURCE ALERT", copy: `${state.resources.sort((a, b) => a.stockPercent - b.stockPercent)[0]?.name} below ${state.resources.sort((a, b) => a.stockPercent - b.stockPercent)[0]?.stockPercent}%` }
  ];
  return (
    <GlassPanel title="Alert System" eyebrow="Simulated notifications" variant="alert">
      <div className="space-y-3">
        {alerts.map((alert, index) => (
          <motion.div
            key={alert.title}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            className={`border-4 border-black p-3 ${alert.tone === "red" ? "bg-white text-black" : alert.tone === "amber" ? "bg-white text-black" : "bg-white text-black"} shadow-[4px_4px_0_0_#000]`}
          >
            <p className={`font-mono text-xs font-black uppercase ${alert.tone === "red" ? "text-[#ff4136]" : alert.tone === "amber" ? "text-[#FF851B]" : "text-[#B10DC9]"}`}>{alert.title}</p>
            <p className="mt-1 text-sm font-bold text-black">{alert.copy}</p>
          </motion.div>
        ))}
      </div>
    </GlassPanel>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RESPONSE MAP
   ═══════════════════════════════════════════════════════════════ */

function ResponseMap({ state, layers, onAssign }: { state: SimulationState; layers: LayerState; onAssign: (id: string) => void }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(4, Math.max(0.5, z + (e.deltaY > 0 ? -0.15 : 0.15))));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan({ x: panStart.current.panX + dx / zoom, y: panStart.current.panY + dy / zoom });
  }, [isPanning, zoom]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const zoomIn = () => setZoom((z) => Math.min(4, z + 0.3));
  const zoomOut = () => setZoom((z) => Math.max(0.5, z - 0.3));
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // District polygons for colorful geographic look
  const districts = [
    { id: "d1", color: "#4ade80", path: "M0,0 L25,0 L28,12 L22,25 L0,22 Z" },
    { id: "d2", color: "#fb923c", path: "M25,0 L50,0 L48,15 L40,22 L28,12 Z" },
    { id: "d3", color: "#c084fc", path: "M50,0 L75,0 L72,18 L60,20 L48,15 Z" },
    { id: "d4", color: "#f472b6", path: "M75,0 L100,0 L100,20 L85,22 L72,18 Z" },
    { id: "d5", color: "#facc15", path: "M0,22 L22,25 L25,40 L18,48 L0,45 Z" },
    { id: "d6", color: "#34d399", path: "M22,25 L40,22 L45,38 L38,48 L25,40 Z" },
    { id: "d7", color: "#60a5fa", path: "M40,22 L60,20 L62,35 L55,45 L45,38 Z" },
    { id: "d8", color: "#f87171", path: "M60,20 L85,22 L88,38 L75,45 L62,35 Z" },
    { id: "d9", color: "#a78bfa", path: "M85,22 L100,20 L100,42 L88,38 Z" },
    { id: "d10", color: "#2dd4bf", path: "M0,45 L18,48 L20,65 L12,72 L0,68 Z" },
    { id: "d11", color: "#fb7185", path: "M18,48 L38,48 L42,62 L35,72 L20,65 Z" },
    { id: "d12", color: "#fbbf24", path: "M38,48 L55,45 L58,60 L50,70 L42,62 Z" },
    { id: "d13", color: "#86efac", path: "M55,45 L75,45 L78,62 L65,70 L58,60 Z" },
    { id: "d14", color: "#c4b5fd", path: "M75,45 L100,42 L100,65 L82,68 L78,62 Z" },
    { id: "d15", color: "#fdba74", path: "M0,68 L12,72 L15,88 L0,90 Z" },
    { id: "d16", color: "#67e8f9", path: "M12,72 L35,72 L38,88 L15,88 Z" },
    { id: "d17", color: "#f9a8d4", path: "M35,72 L50,70 L52,85 L38,88 Z" },
    { id: "d18", color: "#a3e635", path: "M50,70 L65,70 L68,85 L52,85 Z" },
    { id: "d19", color: "#e879f9", path: "M65,70 L82,68 L85,85 L68,85 Z" },
    { id: "d20", color: "#fca5a1", path: "M82,68 L100,65 L100,88 L85,85 Z" },
    { id: "d21", color: "#93c5fd", path: "M0,90 L15,88 L18,100 L0,100 Z" },
    { id: "d22", color: "#d8b4fe", path: "M15,88 L38,88 L40,100 L18,100 Z" },
    { id: "d23", color: "#fde047", path: "M38,88 L52,85 L55,100 L40,100 Z" },
    { id: "d24", color: "#6ee7b7", path: "M52,85 L68,85 L70,100 L55,100 Z" },
    { id: "d25", color: "#f9a8d4", path: "M68,85 L85,85 L88,100 L70,100 Z" },
    { id: "d26", color: "#fdba74", path: "M85,85 L100,88 L100,100 L88,100 Z" },
  ];

  // Water bodies
  const waterBodies = [
    "M-5,-5 L105,-5 L105,0 L-5,0 Z",
    "M-5,100 L105,100 L105,105 L-5,105 Z",
    "M-5,-5 L0,-5 L0,105 L-5,105 Z",
    "M100,-5 L105,-5 L105,105 L100,105 Z",
  ];

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Zoom Controls */}
      <div className="absolute top-3 right-3 z-30 flex flex-col gap-1">
        <button onClick={zoomIn} className="flex h-8 w-8 items-center justify-center border-4 border-black bg-white font-mono text-lg font-black text-black shadow-[2px_2px_0_0_#000] hover:bg-[#fae315] transition-colors" title="Zoom in">+</button>
        <button onClick={zoomOut} className="flex h-8 w-8 items-center justify-center border-4 border-black bg-white font-mono text-lg font-black text-black shadow-[2px_2px_0_0_#000] hover:bg-[#fae315] transition-colors" title="Zoom out">−</button>
        <button onClick={resetView} className="flex h-8 w-8 items-center justify-center border-4 border-black bg-white font-mono text-[10px] font-black text-black shadow-[2px_2px_0_0_#000] hover:bg-[#fae315] transition-colors" title="Reset view">⟲</button>
      </div>
      {/* Zoom level indicator */}
      <div className="absolute top-3 left-3 z-30 border-2 border-black bg-white px-2 py-1 font-mono text-[10px] font-bold text-black shadow-[2px_2px_0_0_#000]">
        {Math.round(zoom * 100)}%
      </div>

      <div
        className="h-full w-full transition-transform duration-100"
        style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, transformOrigin: "center center" }}
      >
        {/* Water background */}
        <div className="absolute inset-0 bg-[#3b9fd4]" />

        <svg className="absolute inset-0 h-full w-full" viewBox="-5 -5 110 110" role="img" aria-label="Simulated city response map">
          {/* Water borders */}
          {waterBodies.map((d, i) => (
            <path key={`water-${i}`} d={d} fill="#2980b9" opacity={0.7} />
          ))}

          {/* Colorful districts */}
          {districts.map((district) => (
            <path
              key={district.id}
              d={district.path}
              fill={district.color}
              stroke="#000"
              strokeWidth="0.5"
              opacity={0.75}
            />
          ))}

          {/* District grid pattern overlay */}
          <defs>
            <pattern id="mapGrid" width="5" height="5" patternUnits="userSpaceOnUse">
              <path d="M5,0 L0,0 L0,5" fill="none" stroke="#00000015" strokeWidth="0.3" />
            </pattern>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill="url(#mapGrid)" />

          {/* Roads */}
          {layers.roads && state.roads.map((road) => (
            <line
              key={road.id}
              x1={road.from.x}
              y1={road.from.y}
              x2={road.to.x}
              y2={road.to.y}
              stroke={road.blockage > 65 ? "#dc2626" : road.blockage > 30 ? "#d97706" : "#1e293b"}
              strokeWidth={road.blockage > 65 ? 1.8 : 1.2}
              strokeOpacity={0.85}
              strokeDasharray={road.blockage > 60 ? "2 2" : "0"}
            />
          ))}
          {/* Disaster Zones */}
          {layers.disasterZones && state.peopleGroups.map((group) => (
            <g key={group.id}>
              <circle cx={group.position.x} cy={group.position.y} r={group.risk === "Critical" ? 10 : 7} fill={group.risk === "Critical" ? "rgba(220,38,38,0.35)" : "rgba(234,179,8,0.4)"} stroke={group.risk === "Critical" ? "#dc2626" : "#eab308"} strokeWidth="2" />
              <text x={group.position.x} y={group.position.y + 1.2} textAnchor="middle" fill="#000" fontSize="3" fontWeight="bold" fontFamily="monospace">{group.zone}</text>
            </g>
          ))}
        </svg>

        {/* Incident markers */}
        {layers.incidents && state.incidents.map((incident) => (
          <button
            key={incident.id}
            onClick={() => onAssign(incident.id)}
            title={`${incident.id}: ${incident.type}`}
            className="group absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer"
            style={{ left: `${incident.position.x}%`, top: `${incident.position.y}%` }}
          >
            <span className="relative flex h-7 w-7 items-center justify-center border-3 border-black bg-[#ff4136] text-xs font-black text-white shadow-[2px_2px_0_0_#000] hover:scale-110 transition-transform">!</span>
            <span className="pointer-events-none absolute left-8 top-0 hidden min-w-[210px] border-4 border-black bg-white p-2.5 text-left font-mono text-xs font-bold text-black shadow-[4px_4px_0_0_#000] group-hover:block z-30">
              <span className="font-black text-[#ff4136] uppercase">{incident.id} • {incident.type}</span><br />
              <span>{incident.priority} | {incident.people} people</span><br />
              <span className="text-[10px] text-gray-700">{incident.location}</span>
            </span>
          </button>
        ))}
        {/* Drones */}
        {layers.drones && state.drones.map((drone, index) => (
          <motion.div
            key={drone.id}
            className="absolute h-4 w-4 border-3 border-black bg-[#fae315] z-10 shadow-[2px_2px_0_0_#000]"
            style={{ left: `${drone.position.x}%`, top: `${drone.position.y}%` }}
            animate={{ x: [0, 8 + index, -3, 0], y: [0, -6, 4, 0] }}
            transition={{ duration: 5 + index * 0.4, repeat: Infinity, ease: "linear" }}
            title={`${drone.id}: ${drone.mission}`}
          />
        ))}
        {/* Rescue Teams */}
        {layers.rescueTeams && state.rescueTeams.map((team) => (
          <div
            key={team.id}
            className="group absolute -translate-x-1/2 -translate-y-1/2 z-15"
            style={{ left: `${team.position.x}%`, top: `${team.position.y}%` }}
          >
            <span className="flex h-4 w-4 items-center justify-center border-2 border-black bg-[#2ECC40] shadow-[2px_2px_0_0_#000]" />
            <div className="pointer-events-none absolute left-6 top-0 hidden min-w-[170px] border-3 border-black bg-white p-2 text-left font-mono text-[11px] font-bold text-black shadow-[3px_3px_0_0_#000] group-hover:block z-30">
              <p className="font-black text-[#2ECC40] uppercase">{team.id} • {team.type}</p>
              <p>{team.availability} | ETA: {team.eta}m</p>
              <p className="text-[10px] text-gray-600">{team.location}</p>
            </div>
          </div>
        ))}
        {/* Hospitals */}
        {layers.hospitals && state.hospitals.map((hospital) => (
          <div
            key={hospital.id}
            className="group absolute -translate-x-1/2 -translate-y-1/2 z-15"
            style={{ left: `${hospital.position.x}%`, top: `${hospital.position.y}%` }}
          >
            <span className="flex h-6 w-6 items-center justify-center border-3 border-black bg-[#B10DC9] font-mono text-xs font-black text-white shadow-[2px_2px_0_0_#000] cursor-pointer hover:scale-110 transition-transform">H</span>
            <div className="pointer-events-none absolute left-7 top-0 hidden min-w-[210px] border-4 border-black bg-white p-2.5 text-left font-mono text-xs font-bold text-black shadow-[4px_4px_0_0_#000] group-hover:block z-30">
              <p className="font-black text-[#B10DC9] uppercase">{hospital.name}</p>
              <p className="mt-1">Pts: {hospital.currentPatients}/{hospital.capacity}</p>
              <p>ER Beds: {hospital.emergencyBeds} | ICU: {hospital.icuCapacity}</p>
              <p>Doctors: {hospital.doctorsAvailable} | Amb: {hospital.ambulancesAvailable}</p>
            </div>
          </div>
        ))}
        {/* Shelters */}
        {layers.shelters && state.shelters.map((shelter) => (
          <div
            key={shelter.id}
            className="group absolute -translate-x-1/2 -translate-y-1/2 z-15"
            style={{ left: `${shelter.position.x}%`, top: `${shelter.position.y}%` }}
          >
            <span className="flex h-6 w-6 items-center justify-center border-3 border-black bg-[#0074D9] font-mono text-xs font-black text-white shadow-[2px_2px_0_0_#000] cursor-pointer hover:scale-110 transition-transform">S</span>
            <div className="pointer-events-none absolute left-7 top-0 hidden min-w-[200px] border-4 border-black bg-white p-2.5 text-left font-mono text-xs font-bold text-black shadow-[4px_4px_0_0_#000] group-hover:block z-30">
              <p className="font-black text-[#0074D9] uppercase">{shelter.name}</p>
              <p className="mt-1">Occ: {shelter.occupied}/{shelter.capacity}</p>
              <p>Risk: {shelter.riskLevel} | Access: {shelter.accessibility}</p>
              <p>Medical Support: {shelter.medicalSupport ? "Available" : "None"}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Road blockage legend */}
      <div className="absolute bottom-3 left-3 z-30 border-4 border-black bg-white px-3 py-2 font-mono text-xs font-bold text-black shadow-[4px_4px_0_0_#000]">
        <p className="mb-2 uppercase border-b-2 border-black pb-1">Road Status</p>
        <div className="flex flex-col gap-1.5">
          <span><span className="legend-swatch" style={{ background: "#1e293b" }} />Clear (&lt;30%)</span>
          <span><span className="legend-swatch" style={{ background: "#d97706" }} />Congested (30-65%)</span>
          <span><span className="legend-swatch" style={{ background: "#dc2626" }} />Blocked (&gt;65%)</span>
        </div>
      </div>
    </div>
  );
}

function LayerControls({ layers, setLayers }: { layers: LayerState; setLayers: Dispatch<SetStateAction<LayerState>> }) {
  const labels: Record<string, string> = {
    disasterZones: "Disaster Zones",
    rescueTeams: "Rescue Teams",
    drones: "Drones",
    hospitals: "Hospitals",
    shelters: "Shelters",
    roads: "Roads",
    resources: "Resources",
    incidents: "Incidents"
  };
  return (
    <div className="flex h-full flex-col justify-between space-y-1.5">
      <p className="flex items-center gap-2 border-b-2 border-black pb-1.5 font-mono text-xs font-black uppercase tracking-[0.1em] text-black">
        <Layers3 size={15} /> Map Layers
      </p>
      <div className="flex flex-1 flex-col justify-between gap-1.5">
        {(Object.entries(layers) as [keyof LayerState, boolean][]).map(([key, value]) => (
          <label key={key} className="flex cursor-pointer items-center justify-between gap-2 border-2 border-black bg-white px-2.5 py-1.5 text-xs font-black uppercase text-black hover:bg-[#fae315] transition-colors shadow-[2px_2px_0_0_#000]">
            <span className="truncate">{labels[key]}</span>
            <input type="checkbox" checked={value} onChange={() => setLayers({ ...layers, [key]: !value })} className="h-4 w-4 border-2 border-black accent-black shrink-0" />
          </label>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   WHAT-IF + ANALYTICS
   ═══════════════════════════════════════════════════════════════ */

function WhatIfPanel({ scenario, setScenario, onGenerate, state }: { scenario: ScenarioInput; setScenario: (scenario: ScenarioInput) => void; onGenerate: () => void; state: SimulationState }) {
  return (
    <GlassPanel title="What If Simulator" eyebrow="Dynamic recalculation" action={<button onClick={onGenerate} className="brutal-btn px-4 py-2 text-xs">Apply</button>}>
      <div className="grid gap-3 md:grid-cols-3">
        <Slider label="Flood severity" value={scenario.severity} onChange={(severity) => setScenario({ ...scenario, severity })} />
        <Slider label="Road blockage" value={scenario.roadBlockage} onChange={(roadBlockage) => setScenario({ ...scenario, roadBlockage })} />
        <div className="flex flex-col justify-between border-4 border-black bg-white p-3 shadow-[4px_4px_0_0_#000]">
          <p className="font-mono text-xs font-bold uppercase text-black">People affected</p>
          <p className="mt-1 text-2xl xl:text-3xl font-black text-[#ff4136]">120 → {state.disaster.affectedPopulation}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {state.updatedActions.map((action, idx) => (
          <div key={idx} className="flex h-full flex-col justify-between border-3 border-black bg-[#fae315] p-2.5 shadow-[3px_3px_0_0_#000]">
            <span className="font-mono text-[9px] font-black uppercase tracking-wider text-black/70">ACTION {idx + 1}</span>
            <p className="mt-1 text-xs font-bold leading-snug text-black">{action}</p>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

function AnalyticsPanel({ state }: { state: SimulationState }) {
  const responseData = state.peopleGroups.map((group, index) => ({ zone: group.zone, risk: group.count, response: state.rescueTeams[index]?.eta ?? 10 }));
  const resourceData = state.resources.map((resource) => ({ name: resource.name.split(" ")[0], stock: resource.stockPercent }));
  const optimizationData = state.optimizations.map((item) => ({ name: item.algorithm, objective: item.objectiveValue, time: item.executionTimeMs / 1000 }));
  return (
    <GlassPanel title="Analytics" eyebrow="Operational telemetry" className="h-full flex flex-col justify-between">
      <div className="grid gap-4 lg:grid-cols-3 flex-1">
        <ChartFrame title="Response Time by Zone">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={responseData} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#000" strokeDasharray="2 2" strokeWidth={1} opacity={0.25} />
              <XAxis dataKey="zone" stroke="#000" tick={{ fontSize: 11, fontWeight: 'bold' }} />
              <YAxis stroke="#000" tick={{ fontSize: 11, fontWeight: 'bold' }} />
              <Tooltip contentStyle={{ background: "#fff", border: "4px solid #000", borderRadius: "0", boxShadow: "4px 4px 0px #000", fontWeight: 'bold', color: '#000' }} itemStyle={{ color: '#000' }} />
              <Line type="step" dataKey="response" stroke="#ff4136" strokeWidth={4} dot={{ fill: "#fae315", r: 5, stroke: "#000", strokeWidth: 2 }} activeDot={{ r: 7, fill: "#fff", stroke: "#000", strokeWidth: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
        <ChartFrame title="Resource Stock Levels">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={resourceData} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#000" strokeDasharray="2 2" strokeWidth={1} opacity={0.25} />
              <XAxis dataKey="name" stroke="#000" tick={{ fontSize: 11, fontWeight: 'bold' }} />
              <YAxis stroke="#000" tick={{ fontSize: 11, fontWeight: 'bold' }} />
              <Tooltip contentStyle={{ background: "#fff", border: "4px solid #000", borderRadius: "0", boxShadow: "4px 4px 0px #000", fontWeight: 'bold', color: '#000' }} cursor={{ fill: "rgba(0,0,0,0.1)" }} />
              <Bar dataKey="stock" radius={0} stroke="#000" strokeWidth={3}>
                {resourceData.map((entry, index) => (
                  <Cell key={index} fill={entry.stock < 30 ? "#ff4136" : entry.stock < 50 ? "#FF851B" : "#2ECC40"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
        <ChartFrame title="Classical vs Quantum">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={optimizationData} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#000" strokeDasharray="2 2" strokeWidth={1} opacity={0.25} />
              <XAxis dataKey="name" stroke="#000" tick={{ fontSize: 11, fontWeight: 'bold' }} />
              <YAxis stroke="#000" tick={{ fontSize: 11, fontWeight: 'bold' }} />
              <Tooltip contentStyle={{ background: "#fff", border: "4px solid #000", borderRadius: "0", boxShadow: "4px 4px 0px #000", fontWeight: 'bold', color: '#000' }} itemStyle={{ color: '#000' }} />
              <Area dataKey="objective" type="step" stroke="#000" strokeWidth={4} fill="#B10DC9" activeDot={{ r: 7, fill: "#fae315", stroke: "#000", strokeWidth: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>
    </GlassPanel>
  );
}

function ChartFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden border-4 border-black bg-[#f4f0e6] p-3.5 shadow-[4px_4px_0_0_#000] h-full">
      <div className="absolute inset-0 bg-brutal-grid opacity-20 pointer-events-none" />
      <div className="relative z-10 mb-2 border-b-4 border-black pb-2 flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-wider text-black">{title}</p>
        <span className="inline-block h-2 w-2 border border-black bg-black" />
      </div>
      <div className="relative z-10 w-full flex-1 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Q-ASSIST + MISSION TIMELINE
   ═══════════════════════════════════════════════════════════════ */

function QAssistPanel({ state }: { state: SimulationState }) {
  const highestRisk = state.peopleGroups.find((group) => group.risk === "Critical") ?? state.peopleGroups[0];
  const hospital = [...state.hospitals].sort((a, b) => b.currentPatients / b.capacity - a.currentPatients / a.capacity)[0];
  const lowestResource = [...state.resources].sort((a, b) => a.stockPercent - b.stockPercent)[0];
  return (
    <GlassPanel title="Q-Assist" eyebrow="Simulation-only assistant">
      <div className="space-y-3">
        <p className="text-xs font-bold leading-5 text-black">
          <strong className="bg-[#ff4136] text-white px-1.5 py-0.5">{highestRisk.zone}</strong> highest simulated risk with <strong className="text-[#ff4136]">{highestRisk.count}</strong> people affected.
          Rescue teams in range. <strong className="text-[#B10DC9]">{hospital.name}</strong> at <strong className="text-[#FF851B]">{Math.round((hospital.currentPatients / hospital.capacity) * 100)}%</strong> occupancy.
        </p>
        {lowestResource && lowestResource.stockPercent < 40 && (
          <p className="border-3 border-black bg-[#ff4136] p-2.5 font-mono text-[11px] font-black text-white shadow-[3px_3px_0_0_#000]">
            ⚠ {lowestResource.name} critically low at {lowestResource.stockPercent}%.
          </p>
        )}
        <p className="border-3 border-black bg-[#fae315] p-2.5 font-mono text-[11px] font-bold leading-4 text-black shadow-[3px_3px_0_0_#000]">
          Q-Assist summarizes local simulated scenario. Not a real emergency intelligence feed.
        </p>
      </div>
    </GlassPanel>
  );
}

function MissionTimeline({ state }: { state: SimulationState }) {
  return (
    <GlassPanel title="Mission Timeline" eyebrow="Active operations" className="flex-1 flex flex-col justify-between">
      <div className="thin-scrollbar max-h-[300px] space-y-2.5 overflow-y-auto pr-1">
        {state.missions.map((mission) => (
          <div key={mission.id} className="flex items-center gap-3 border-3 border-black bg-white p-2.5 shadow-[3px_3px_0_0_#000]">
            <span className={`inline-block h-3 w-3 shrink-0 border-2 border-black ${mission.status === "Active" ? "bg-[#2ECC40] brutal-pulse" : "bg-[#FF851B]"}`} />
            <div className="flex-1 text-xs font-bold min-w-0">
              <p className="text-black truncate"><span className="bg-black text-white px-1 py-0.5 font-mono">{mission.assetId}</span> → {mission.target}</p>
              <p className="mt-0.5 text-[11px] opacity-70">{mission.status} / ETA {mission.eta} min</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t-2 border-black pt-2 flex items-center justify-between text-[11px] font-mono font-bold text-black/70">
        <span>ACTIVE MISSIONS: {state.missions.length}</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 bg-[#2ECC40] border border-black" /> LIVE ROUTING</span>
      </div>
    </GlassPanel>
  );
}

/* ═══════════════════════════════════════════════════════════════
   INCIDENT PANEL
   ═══════════════════════════════════════════════════════════════ */

function IncidentPanel({
  incidents,
  query,
  setQuery,
  sortMode,
  setSortMode,
  onAssign
}: {
  incidents: Incident[];
  query: string;
  setQuery: (query: string) => void;
  sortMode: "priority" | "people";
  setSortMode: (mode: "priority" | "people") => void;
  onAssign: (id: string) => void;
}) {
  return (
    <GlassPanel title="Helpline Queue" eyebrow="SOS requests" className="h-full flex flex-col justify-between">
      <div>
        <div className="mb-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 text-black" size={15} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search incidents by ID, zone, status..."
              className="w-full border-3 border-black bg-white py-1.5 pl-8 pr-2 text-xs font-bold text-black focus:outline-none"
            />
          </div>
          <button
            onClick={() => setSortMode(sortMode === "priority" ? "people" : "priority")}
            className="flex items-center gap-1 border-3 border-black bg-[#fae315] px-2.5 py-1.5 text-xs font-black uppercase hover:bg-black hover:text-white transition-colors"
            title="Sort incidents"
          >
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">{sortMode === "priority" ? "PRIORITY" : "PEOPLE"}</span>
          </button>
        </div>
        <div className="thin-scrollbar max-h-[300px] space-y-2.5 overflow-y-auto pr-1">
          {incidents.length === 0 ? (
            <p className="border-3 border-black p-3 text-xs font-bold text-black bg-white">
              No simulated incidents match the current filter.
            </p>
          ) : (
            incidents.map((incident) => (
              <article key={incident.id} className="border-3 border-black bg-white p-3 shadow-[3px_3px_0_0_#000]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] font-black text-black bg-black/10 px-1.5 py-0.5">#{incident.id}</span>
                    <h3 className="mt-1 text-xs font-black uppercase text-black">{incident.type}</h3>
                  </div>
                  <span className={`border-2 border-black px-2 py-0.5 text-[10px] font-black ${
                    incident.priority === "Critical" ? "bg-[#ff4136] text-white" :
                    incident.priority === "High" ? "bg-[#FF851B] text-black" : "bg-[#0074D9] text-white"
                  }`}>
                    {incident.priority}
                  </span>
                </div>
                <p className="mt-1.5 text-xs font-bold text-black/80">{incident.location}</p>
                <div className="mt-1.5 flex items-center justify-between text-xs font-bold text-black">
                  <span>{incident.people} people affected</span>
                  <span className="font-mono text-[10px] uppercase opacity-70">{incident.status}</span>
                </div>
                {incident.assignedAssets.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {incident.assignedAssets.map((asset) => (
                      <span key={asset} className="border border-black bg-[#fae315] px-1.5 py-0.5 font-mono text-[9px] font-black text-black">{asset}</span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => onAssign(incident.id)}
                  className="brutal-btn mt-2.5 w-full py-1.5 text-[11px] font-black"
                >
                  Optimize Assignment
                </button>
              </article>
            ))
          )}
        </div>
      </div>
      <div className="mt-3 border-t-2 border-black pt-2 flex items-center justify-between text-[11px] font-mono font-bold text-black/70">
        <span>TOTAL: {incidents.length} INCIDENTS</span>
        <span>STATUS: LIVE STREAM</span>
      </div>
    </GlassPanel>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DRONE / RESCUE / SHELTER PANELS
   ═══════════════════════════════════════════════════════════════ */

function DroneCommand({ state, onOptimize }: { state: SimulationState; onOptimize: () => void }) {
  return (
    <GlassPanel title="Drone Fleet" eyebrow="Aerial command" action={<button onClick={onOptimize} className="brutal-btn px-4 py-2 text-xs">Optimize</button>} className="h-full flex flex-col justify-between">
      <div className="thin-scrollbar max-h-[460px] space-y-3 overflow-y-auto pr-1">
        {state.drones.map((drone) => (
          <div key={drone.id} className="border-3 border-black bg-white p-3 shadow-[3px_3px_0_0_#000]">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs font-black text-black">{drone.id}</p>
              <span className={`border-2 border-black px-2 py-0.5 text-[10px] font-bold ${drone.status === "Active" ? "bg-[#2ECC40] text-black" : drone.status === "Charging" ? "bg-[#fae315] text-black" : "bg-white text-black"}`}>{drone.status}</span>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2 text-xs font-bold text-black opacity-90">
              <span>Battery <b className={drone.battery > 60 ? "text-[#2ECC40]" : drone.battery > 30 ? "text-[#FF851B]" : "text-[#ff4136]"}>{drone.battery}%</b></span>
              <span>Alt <b className="text-black">{drone.altitude}m</b></span>
              <span>Signal <b className="text-black">{drone.signal}%</b></span>
            </div>
            <p className="mt-2.5 text-xs font-bold text-black">Mission: {drone.mission} / Detected: <span className="bg-[#ff4136] text-white px-1">{drone.peopleDetected}</span></p>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t-2 border-black pt-2 flex items-center justify-between text-[11px] font-mono font-bold text-black/70">
        <span>ACTIVE FLEET: {state.drones.filter(d => d.status === "Active").length}/{state.drones.length}</span>
        <span>COVERAGE: 100%</span>
      </div>
    </GlassPanel>
  );
}

function RescueTeams({ state, onOptimize }: { state: SimulationState; onOptimize: () => void }) {
  return (
    <GlassPanel title="Rescue Teams" eyebrow="Ground operations" action={<button onClick={onOptimize} className="brutal-btn px-4 py-2 text-xs">Optimize</button>} className="h-full flex flex-col justify-between">
      <div className="thin-scrollbar max-h-[460px] space-y-3 overflow-y-auto pr-1">
        {state.rescueTeams.map((team) => (
          <div key={team.id} className="border-3 border-black bg-white p-3 shadow-[3px_3px_0_0_#000]">
            <div className="flex justify-between items-center gap-2">
              <span className="font-mono text-xs font-black text-black bg-black text-white px-1.5 py-0.5">{team.id}</span>
              <span className="text-xs font-bold text-black">{team.eta} min ETA</span>
            </div>
            <p className="mt-1.5 text-xs font-black uppercase text-black">{team.type}</p>
            <p className="mt-2 border-t-2 border-black pt-2 text-xs font-bold text-black/80">{team.availability} / {team.mission}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t-2 border-black pt-2 flex items-center justify-between text-[11px] font-mono font-bold text-black/70">
        <span>TEAMS READY: {state.rescueTeams.length}</span>
        <span>DEPLOYED: {state.rescueTeams.filter(t => t.availability.toLowerCase().includes("deploy") || t.availability.toLowerCase().includes("assign")).length || 15}</span>
      </div>
    </GlassPanel>
  );
}

function ShelterHospitalResource({ state, onOptimize }: { state: SimulationState; onOptimize: () => void }) {
  return (
    <GlassPanel title="Shelters & Resources" eyebrow="Continuity operations" action={<button onClick={onOptimize} className="brutal-btn px-4 py-2 text-xs">Optimize</button>} className="h-full flex flex-col justify-between">
      <div className="space-y-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between font-mono text-xs font-black uppercase text-black">
            <span>Shelters ({state.shelters.length} Locations)</span>
            <span className="text-[10px] text-gray-600">Scroll for more</span>
          </div>
          <div className="thin-scrollbar grid max-h-[160px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {state.shelters.map((shelter) => {
              const pct = Math.round((shelter.occupied / shelter.capacity) * 100);
              return (
                <div key={shelter.id} className="border-2 border-black bg-white p-2 shadow-[2px_2px_0_0_#000]">
                  <p className="text-[11px] font-black uppercase text-black truncate" title={shelter.name}>{shelter.name}</p>
                  <p className="mt-0.5 text-[10px] font-bold text-black opacity-70">
                    Avail: {shelter.capacity - shelter.occupied} / {shelter.capacity}
                  </p>
                  <div className="mt-1.5 h-1.5 border border-black bg-white">
                    <div
                      className={`h-full ${pct > 85 ? "bg-[#ff4136]" : pct > 65 ? "bg-[#FF851B]" : "bg-[#2ECC40]"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between font-mono text-xs font-black uppercase text-black">
            <span>Hospitals ({state.hospitals.length} Centers)</span>
            <span className="text-[10px] text-gray-600">Scroll for more</span>
          </div>
          <div className="thin-scrollbar grid max-h-[150px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {state.hospitals.map((hospital) => {
              const pct = Math.round((hospital.currentPatients / hospital.capacity) * 100);
              return (
                <div key={hospital.id} className="border-2 border-black bg-[#B10DC9] p-2 text-white shadow-[2px_2px_0_0_#000]">
                  <p className="text-[11px] font-black uppercase truncate" title={hospital.name}>{hospital.name}</p>
                  <p className="mt-0.5 text-[10px] font-bold text-white/90">
                    {hospital.currentPatients}/{hospital.capacity} pts | ER: {hospital.emergencyBeds}
                  </p>
                  <div className="mt-1.5 h-1.5 border border-black bg-white">
                    <div className={`h-full ${pct > 85 ? "bg-[#ff4136]" : "bg-black"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 border-3 border-black bg-white p-3 shadow-[3px_3px_0_0_#000]">
          <p className="font-mono text-[11px] font-black uppercase text-black">Critical Supply Stock</p>
          {state.resources.slice(0, 3).map((resource) => (
            <div key={resource.id}>
              <div className="mb-0.5 flex justify-between font-mono text-[10px] font-bold text-black">
                <span>{resource.name}</span>
                <span>{resource.stockPercent}%</span>
              </div>
              <div className="h-2 border border-black bg-white">
                <div className={`h-full ${resource.stockPercent < 30 ? "bg-[#ff4136]" : resource.stockPercent < 50 ? "bg-[#FF851B]" : "bg-[#2ECC40]"}`} style={{ width: `${resource.stockPercent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 border-t-2 border-black pt-2 flex items-center justify-between text-[11px] font-mono font-bold text-black/70">
        <span>SHELTER CAP: {state.shelters.reduce((s, x) => s + x.capacity, 0).toLocaleString()}</span>
        <span>HOSPITAL BEDS: {state.hospitals.reduce((s, x) => s + x.capacity, 0).toLocaleString()}</span>
      </div>
    </GlassPanel>
  );
}

/* ═══════════════════════════════════════════════════════════════
   QUANTUM LAB
   ═══════════════════════════════════════════════════════════════ */

function QuantumLab({ state, notify }: { state: SimulationState; notify: (message: string) => void }) {
  const [depth, setDepth] = useState(2);
  const [variables, setVariables] = useState(8);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(state.optimizations[1]);

  const runExperiment = async () => {
    setRunning(true);
    try {
      const response = await fetch("http://localhost:8000/quantum/qaoa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: "drone_allocation",
          number_of_variables: variables,
          qaoa_depth: depth,
          cost_matrix: Array.from({ length: variables }, (_, i) => Array.from({ length: variables }, (_, j) => (i === j ? 1 : (i + j) % 3 === 0 ? -0.2 : 0.1)))
        })
      });
      if (!response.ok) throw new Error("Backend unavailable");
      const payload = await response.json() as { best_bitstring: string; objective_value: number; execution_time_ms: number; circuit_info: { depth: number; gates: number }; probability_distribution: Record<string, number> };
      setResult({
        algorithm: "QAOA Simulation",
        objectiveValue: payload.objective_value,
        executionTimeMs: payload.execution_time_ms,
        solutionQuality: 0.82,
        variables,
        iterations: 36,
        bestBitstring: payload.best_bitstring,
        probabilityDistribution: payload.probability_distribution,
        circuitDepth: payload.circuit_info.depth,
        gates: payload.circuit_info.gates
      });
      notify("QAOA simulation completed through FastAPI backend.");
    } catch {
      setResult({
        ...state.optimizations[1],
        variables,
        bestBitstring: "101001101010".slice(0, variables).padEnd(variables, "0"),
        circuitDepth: 18 + depth * variables,
        gates: 32 + depth * variables * 3,
        executionTimeMs: 950 + depth * variables * 80
      });
      notify("Backend not running; displayed deterministic local QAOA-style fallback.");
    } finally {
      setRunning(false);
    }
  };

  const probData = result.probabilityDistribution
    ? Object.entries(result.probabilityDistribution).map(([bits, prob]) => ({ bits, probability: Math.round(prob * 100) }))
    : [];

  return (
    <GlassPanel title="Quantum Optimization Lab" eyebrow="QUBO → QAOA → optimized response plan" variant="quantum">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              ["QUBO", "Quadratic Unconstrained Binary Optimization represents selected planning problems with binary variables."],
              ["QAOA", "The Quantum Approximate Optimization Algorithm is a hybrid quantum-classical method for combinatorial optimization."],
              ["Qiskit", "Qiskit is a Python framework for building and running quantum circuits."],
              ["Aer", "Qiskit Aer provides local simulators for executing quantum circuits."]
            ].map(([title, copy]) => (
              <div key={title} className="border-4 border-black bg-white p-3 shadow-[4px_4px_0_0_#000]">
                <p className="font-mono text-sm font-black text-black">{title}</p>
                <p className="mt-2 text-xs font-bold leading-5 text-black opacity-80">{copy}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
              <p className="font-mono text-xs font-black uppercase text-black">QUBO variables</p>
              <div className="mt-3 grid gap-2 text-sm font-bold text-black">
                {Array.from({ length: Math.min(variables, 8) }, (_, index) => (
                  <p key={index}>x{index + 1} = Drone {Math.floor(index / 2) + 1} → Zone {index % 2 === 0 ? "A" : "B"} <span className="bg-[#2ECC40] px-1 text-black">{index % 3 === 0 ? "1" : "0"}</span></p>
                ))}
              </div>
              <p className="mt-3 text-xs font-bold text-black opacity-70">Objective: minimize ETA + risk + unmet demand while penalizing duplicate assignments.</p>
            </div>
            <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
              <p className="font-mono text-xs font-black uppercase text-black">Quantum circuit viewer</p>
              <pre className="mt-3 overflow-x-auto border-2 border-black bg-[#f4f0e6] p-3 font-mono text-xs font-bold leading-6 text-black shadow-inner">{`q0 --H--RZ--RY--●--M
                 |
q1 --H--RZ--RY--X--M
q2 --H--RZ--RY--●--M
                 |
q3 --H--RZ--RY--X--M`}</pre>
              <p className="mt-3 text-xs font-bold text-black opacity-70">Qubits: {variables} / Depth: {result.circuitDepth} / Gates: {result.gates}</p>
            </div>
          </div>
          {/* Probability Distribution */}
          {probData.length > 0 && (
            <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
              <p className="font-mono text-xs font-black uppercase text-black mb-3">Probability distribution</p>
              <div className="space-y-3">
                {probData.map((item) => (
                  <div key={item.bits} className="flex items-center gap-3">
                    <span className="w-28 flex-shrink-0 font-mono text-xs font-bold text-black">{item.bits}</span>
                    <div className="flex-1 h-5 border-2 border-black bg-[#f4f0e6] overflow-hidden">
                      <div className="h-full bg-[#B10DC9]" style={{ width: `${item.probability}%` }} />
                    </div>
                    <span className="w-10 text-right font-mono text-xs font-bold text-black">{item.probability}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <NumberInput label="Variables" value={variables} min={4} max={12} onChange={setVariables} />
          <NumberInput label="QAOA depth" value={depth} min={1} max={5} onChange={setDepth} />
          <button onClick={runExperiment} disabled={running} className="brutal-btn mt-2 w-full py-3 text-xs bg-[#B10DC9] text-white shadow-[4px_4px_0_0_#000] hover:bg-black hover:text-white border-[#B10DC9]">
            {running ? "Running..." : "Run QAOA Simulation"}
          </button>
          <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
            <p className="font-mono text-xs font-black uppercase text-black border-b-4 border-black pb-1">SIMULATION RESULT</p>
            <p className="mt-3 text-sm font-bold text-black">Best bitstring: <span className="bg-black text-white px-1 font-mono">{result.bestBitstring}</span></p>
            <p className="mt-2 text-sm font-bold text-black">Objective: {result.objectiveValue}</p>
            <p className="mt-2 text-sm font-bold text-black">Execution: {(result.executionTimeMs / 1000).toFixed(2)} sec</p>
          </div>
          <ClassicalVsQuantum state={state} qaoa={result} />
          <EducationalMode />
        </div>
      </div>
    </GlassPanel>
  );
}

function ClassicalVsQuantum({ state, qaoa }: { state: SimulationState; qaoa: SimulationState["optimizations"][number] }) {
  const classical = state.optimizations[0];
  return (
    <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
      <p className="font-mono text-xs font-black uppercase text-black">Classical vs quantum</p>
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm font-bold text-black">
        <div className="border-2 border-black p-2 bg-[#fae315]"><p className="opacity-70">Classical</p><p>Objective {classical.objectiveValue}</p><p className="opacity-70">{(classical.executionTimeMs / 1000).toFixed(2)} sec</p></div>
        <div className="border-2 border-black p-2 bg-[#B10DC9] text-white"><p className="opacity-70">QAOA Simulation</p><p>Objective {qaoa.objectiveValue}</p><p className="opacity-70">{(qaoa.executionTimeMs / 1000).toFixed(2)} sec</p></div>
      </div>
      <p className="mt-4 border-4 border-black bg-[#FF851B] p-3 text-xs font-bold leading-5 text-black shadow-[4px_4px_0_0_#000]">
        These results are experimental and depend heavily on problem size, implementation, simulator, hardware, and algorithm parameters. Aer simulation on a classical computer is not quantum computational advantage.
      </p>
    </div>
  );
}

function EducationalMode() {
  return (
    <div className="border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
      <p className="font-mono text-xs font-black uppercase text-black">Understand the Quantum Layer</p>
      <div className="mt-4 space-y-3 text-xs font-bold leading-5 text-black opacity-90">
        <p><b className="bg-black text-white px-1">QUBIT</b> A quantum version of a binary information unit.</p>
        <p><b className="bg-black text-white px-1">SUPERPOSITION</b> A quantum state can represent a combination of possibilities.</p>
        <p><b className="bg-black text-white px-1">MEASUREMENT</b> Observing a quantum state produces a classical result.</p>
        <p><b className="bg-black text-white px-1">QUBO</b> A mathematical formulation for optimization.</p>
        <p><b className="bg-black text-white px-1">QAOA</b> A hybrid quantum-classical optimization algorithm.</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HELPLINE PANEL
   ═══════════════════════════════════════════════════════════════ */

function HelplinePanel({ onSubmit }: { onSubmit: (incident: Incident) => void }) {
  const [form, setForm] = useState({
    emergencyType: "Trapped",
    location: "Zone C / Riverside Towers",
    people: 4,
    priority: "Critical" as Priority,
    medicalRequired: true,
    description: "People trapped with rising water level."
  });
  return (
    <GlassPanel title="Emergency Helpline" eyebrow="Simulated SOS intake">
      <div className="space-y-4">
        <label className="block text-sm font-bold text-black font-mono">
          Location
          <input
            list="location-options"
            value={form.location}
            onChange={(event) => setForm({ ...form, location: event.target.value })}
            placeholder="Type or select emergency location..."
            className="mt-1 w-full border-4 border-black bg-white px-3 py-2 font-black text-black focus:outline-none"
          />
          <datalist id="location-options">
            <option value="Zone C / Riverside Towers Complex" />
            <option value="Zone B / Central Market Square" />
            <option value="Zone F / Old Bus Depot & Terminal" />
            <option value="Zone E / Canal Bridge & Sluice Gate" />
            <option value="Zone A / Northern Residential Heights" />
            <option value="Zone D / East Industrial Park Bay 4" />
            <option value="Zone G / Coastal Harbor Pier 9 Warehouse" />
            <option value="Zone J / Pinecrest Senior Care Pavilion" />
            <option value="Zone H / University Tech Campus Quad" />
            <option value="Zone I / Grand Central Railway Concourse" />
            <option value="Zone B / Metro Electrical Substation" />
            <option value="Zone C / Fishermans Wharf Marina" />
            <option value="Zone A / Hillside Community Center" />
            <option value="Zone F / West Embankment Causeway" />
            <option value="Zone E / South Arterial Overpass" />
            <option value="Zone D / Solar Grid Transformer Yard" />
            <option value="Zone I / Downtown Metro Underground" />
            <option value="Zone J / South Valley Community Sports Field" />
            <option value="Zone H / Medical Research Wing 3" />
            <option value="Zone G / Container Terminal Crane 4" />
          </datalist>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <NumberInput label="People" value={form.people} min={1} max={80} onChange={(people) => setForm({ ...form, people })} />
          <label className="block text-xs font-bold text-black font-mono">Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as Priority })} className="mt-1 w-full border-4 border-black bg-white px-3 py-2 text-sm font-black text-black focus:outline-none">{["Critical", "High", "Medium", "Low"].map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <label className="flex cursor-pointer items-center justify-between border-4 border-black bg-white px-3 py-3 text-sm font-bold text-black hover:bg-[#fae315] transition-colors shadow-[4px_4px_0_0_#000]">Medical requirement<input type="checkbox" checked={form.medicalRequired} onChange={() => setForm({ ...form, medicalRequired: !form.medicalRequired })} className="h-5 w-5 border-2 border-black accent-black" /></label>
        <label className="block text-sm font-bold text-black font-mono">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} className="mt-1 w-full border-4 border-black bg-white px-3 py-2 font-black text-black focus:outline-none" /></label>
        <button onClick={() => onSubmit(createIncident(form))} className="brutal-btn mt-2 w-full py-3 text-xs bg-[#ff4136] text-white shadow-[4px_4px_0_0_#000] hover:bg-black hover:text-white border-[#ff4136]">Generate Incident ID</button>
      </div>
    </GlassPanel>
  );
}
