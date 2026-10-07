export type Priority = "Critical" | "High" | "Medium" | "Low";
export type DisasterType =
  | "Flood"
  | "Earthquake"
  | "Wildfire"
  | "Cyclone"
  | "Landslide"
  | "Industrial accident";

export interface Coordinate {
  x: number;
  y: number;
}

export interface Incident {
  id: string;
  type: string;
  priority: Priority;
  location: string;
  position: Coordinate;
  people: number;
  medicalRequired: boolean;
  status: "New" | "Assigned" | "In Progress" | "Resolved";
  assignedAssets: string[];
  createdAt: string;
  description: string;
}

export interface PersonGroup {
  id: string;
  zone: string;
  count: number;
  risk: Priority;
  medicalNeed: boolean;
  position: Coordinate;
}

export interface Drone {
  id: string;
  status: "Active" | "Charging" | "Idle" | "Maintenance";
  battery: number;
  position: Coordinate;
  altitude: number;
  mission: string;
  signal: number;
  searchRadius: number;
  peopleDetected: number;
}

export interface RescueTeam {
  id: string;
  type: "Medical" | "Fire & Rescue" | "Search & Rescue" | "Engineering" | "Road Clearance";
  location: string;
  position: Coordinate;
  availability: "Available" | "Assigned" | "En Route" | "Operating";
  capacity: number;
  mission: string;
  eta: number;
}

export interface Ambulance {
  id: string;
  status: "Available" | "En Route" | "At Hospital" | "Assigned";
  position: Coordinate;
  patients: number;
  eta: number;
}

export interface Hospital {
  id: string;
  name: string;
  position: Coordinate;
  capacity: number;
  icuCapacity: number;
  emergencyBeds: number;
  doctorsAvailable: number;
  ambulancesAvailable: number;
  currentPatients: number;
}

export interface Shelter {
  id: string;
  name: string;
  position: Coordinate;
  capacity: number;
  occupied: number;
  distanceKm: number;
  riskLevel: "Low" | "Medium" | "High";
  medicalSupport: boolean;
  accessibility: "Open" | "Limited" | "Blocked";
}

export interface Resource {
  id: string;
  name: string;
  stockPercent: number;
  units: number;
  unitName: string;
  trend: number;
}

export interface Road {
  id: string;
  from: Coordinate;
  to: Coordinate;
  distanceKm: number;
  travelTimeMin: number;
  congestion: number;
  blockage: number;
  risk: number;
}

export interface Disaster {
  type: DisasterType;
  severity: number;
  populationDensity: "Low" | "Medium" | "High";
  roadBlockage: number;
  affectedPopulation: number;
  activeIncidents: number;
  blockedRoads: number;
  status: "Running" | "Paused" | "Reset";
}

export interface Mission {
  id: string;
  assetId: string;
  target: string;
  status: "Queued" | "Active" | "Complete";
  eta: number;
}

export interface OptimizationResult {
  algorithm: "Classical" | "QAOA Simulation";
  objectiveValue: number;
  executionTimeMs: number;
  solutionQuality: number;
  variables: number;
  iterations: number;
  bestBitstring?: string;
  probabilityDistribution?: Record<string, number>;
  circuitDepth?: number;
  gates?: number;
}

export interface SimulationState {
  disaster: Disaster;
  incidents: Incident[];
  peopleGroups: PersonGroup[];
  drones: Drone[];
  rescueTeams: RescueTeam[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
  shelters: Shelter[];
  resources: Resource[];
  roads: Road[];
  missions: Mission[];
  optimizations: OptimizationResult[];
  updatedActions: string[];
}
