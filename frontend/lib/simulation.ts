import type { DisasterType, Incident, OptimizationResult, SimulationState } from "@/types/domain";
import { cloneSimulation } from "@/lib/demo-data";

export interface ScenarioInput {
  type: DisasterType;
  severity: number;
  populationDensity: "Low" | "Medium" | "High";
  roadBlockage: number;
  drones: number;
  rescueTeams: number;
  ambulances: number;
}

export const densityMultiplier = {
  Low: 0.72,
  Medium: 1,
  High: 1.34
};

export function generateScenario(input: ScenarioInput): SimulationState {
  const state = cloneSimulation();
  const affectedPopulation = Math.round(input.severity * 4.65 * densityMultiplier[input.populationDensity]);
  const activeIncidents = Math.max(4, Math.round(input.severity / 5));
  const blockedRoads = Math.max(1, Math.round(input.roadBlockage / 4));

  state.disaster = {
    type: input.type,
    severity: input.severity,
    populationDensity: input.populationDensity,
    roadBlockage: input.roadBlockage,
    affectedPopulation,
    activeIncidents,
    blockedRoads,
    status: "Running"
  };

  const zoneWeights = [0.16, 0.20, 0.15, 0.11, 0.09, 0.08, 0.06, 0.06, 0.05, 0.04];
  state.peopleGroups = state.peopleGroups.map((group, index) => ({
    ...group,
    count: Math.max(12, Math.round(affectedPopulation * (zoneWeights[index] ?? 0.05))),
    risk: input.severity > 76 && (index < 3 || index === 6 || index === 9) ? "Critical" : input.severity > 52 ? "High" : "Medium"
  }));

  const maxIncidents = Math.min(activeIncidents, state.incidents.length);
  state.incidents = state.incidents.slice(0, maxIncidents).map((incident, index) => ({
    ...incident,
    priority: index % 5 === 0 || input.severity > 82 ? "Critical" : index % 3 === 0 ? "High" : incident.priority,
    people: Math.max(2, Math.round(incident.people * (input.severity / 65))),
    status: index % 4 === 0 ? "New" : index % 3 === 0 ? "In Progress" : "Assigned",
    assignedAssets: index % 4 === 0 ? [] : [`DRONE-${String((index % input.drones) + 1).padStart(2, "0")}`, `TEAM-${String((index % input.rescueTeams) + 1).padStart(2, "0")}`]
  }));

  state.drones = state.drones.slice(0, input.drones).map((drone, index) => ({
    ...drone,
    status: index % 5 === 0 ? "Charging" : "Active",
    mission: index % 2 === 0 ? `Search Zone ${String.fromCharCode(65 + (index % 5))}` : "Damage assessment",
    peopleDetected: Math.round((input.severity / 18) + (index % 5)),
    battery: Math.max(18, drone.battery - Math.round(input.severity / 10))
  }));

  state.rescueTeams = state.rescueTeams.slice(0, input.rescueTeams).map((team, index) => ({
    ...team,
    availability: index < activeIncidents ? "Assigned" : "Available",
    mission: index < activeIncidents ? `Incident QX-${1100 + index}` : "Awaiting tasking",
    eta: 6 + Math.round(input.roadBlockage / 10) + (index % 12)
  }));

  state.ambulances = state.ambulances.slice(0, input.ambulances).map((ambulance, index) => ({
    ...ambulance,
    status: index < Math.ceil(activeIncidents / 2) ? "Assigned" : "Available",
    eta: 5 + Math.round(input.roadBlockage / 8) + (index % 8)
  }));

  state.roads = state.roads.map((road, index) => ({
    ...road,
    blockage: index % 2 === 0 ? Math.min(100, input.roadBlockage + index * 4) : Math.max(0, input.roadBlockage - index * 7),
    travelTimeMin: Math.round(road.distanceKm * 1.5 + input.roadBlockage / 3 + road.congestion / 9),
    risk: Math.min(100, Math.round(input.severity * 0.6 + index * 7))
  }));

  state.shelters = state.shelters.map((shelter, index) => ({
    ...shelter,
    occupied: Math.min(shelter.capacity, Math.round(shelter.capacity * (0.44 + input.severity / 220 + index / 38))),
    riskLevel: index === 4 && input.severity > 60 ? "High" : index % 3 === 0 ? "Low" : "Medium"
  }));

  state.resources = state.resources.map((resource, index) => ({
    ...resource,
    stockPercent: Math.max(8, Math.round(resource.stockPercent - input.severity / (index + 7))),
    trend: -Math.round(input.severity / (index + 8))
  }));

  state.optimizations = recalculateOptimizations(input.severity, input.roadBlockage, input.drones + input.rescueTeams);
  state.updatedActions = [
    `${Math.max(1, Math.round(input.severity / 28))} drones reassigned`,
    `${Math.max(1, Math.round(input.roadBlockage / 12))} ambulances rerouted`,
    `${Math.max(1, Math.round(input.severity / 42))} rescue teams deployed`,
    `${Math.round(affectedPopulation * 0.38)} people redirected to safer shelters`,
    input.severity > 70 ? "Water and medicine allocations increased" : "Fuel and food distribution rebalanced"
  ];

  return state;
}

function recalculateOptimizations(severity: number, blockage: number, variables: number): OptimizationResult[] {
  const pressure = severity * 0.72 + blockage * 0.48;
  const classical = Math.round((120 + pressure * 0.82) * 10) / 10;
  const qaoa = Math.round((122 + pressure * 0.9 + Math.sin(severity) * 3) * 10) / 10;
  return [
    {
      algorithm: "Classical",
      objectiveValue: classical,
      executionTimeMs: Math.round(420 + variables * 28 + blockage * 4),
      solutionQuality: Math.max(0.72, Math.min(0.96, 1 - pressure / 700)),
      variables,
      iterations: 42 + Math.round(variables / 3)
    },
    {
      algorithm: "QAOA Simulation",
      objectiveValue: qaoa,
      executionTimeMs: Math.round(1100 + variables * 64 + severity * 9),
      solutionQuality: Math.max(0.62, Math.min(0.92, 0.94 - pressure / 620)),
      variables,
      iterations: 32,
      bestBitstring: "101001101010".slice(0, Math.min(12, variables)).padEnd(Math.min(12, variables), "0"),
      probabilityDistribution: {
        "101001101010": 0.31,
        "101001001011": 0.18,
        "001001101010": 0.14,
        "101101100010": 0.09
      },
      circuitDepth: 24 + Math.round(variables * 0.8),
      gates: 42 + variables * 4
    }
  ];
}

export function createIncident(form: {
  emergencyType: string;
  location: string;
  people: number;
  priority: "Critical" | "High" | "Medium" | "Low";
  medicalRequired: boolean;
  description: string;
}): Incident {
  const id = `QX-${Math.floor(2000 + Math.random() * 7000)}`;
  return {
    id,
    type: form.emergencyType,
    priority: form.priority,
    location: form.location,
    position: { x: 20 + Math.random() * 62, y: 20 + Math.random() * 58 },
    people: form.people,
    medicalRequired: form.medicalRequired,
    status: "Assigned",
    assignedAssets: ["DRONE-03", "AMB-07", "TEAM-12"],
    createdAt: new Date().toISOString(),
    description: form.description || "SOS request submitted through simulated helpline."
  };
}
