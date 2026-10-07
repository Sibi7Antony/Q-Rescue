from typing import Literal

from pydantic import BaseModel, Field


Priority = Literal["Critical", "High", "Medium", "Low"]


class Coordinate(BaseModel):
    x: float
    y: float


class Incident(BaseModel):
    id: str
    type: str
    priority: Priority
    location: str
    position: Coordinate
    people: int = Field(ge=1)
    medical_required: bool = False
    status: Literal["New", "Assigned", "In Progress", "Resolved"] = "New"
    assigned_assets: list[str] = []
    description: str = ""


class Drone(BaseModel):
    id: str
    status: Literal["Active", "Charging", "Idle", "Maintenance"]
    battery: int = Field(ge=0, le=100)
    position: Coordinate
    altitude: int
    mission: str
    signal: int = Field(ge=0, le=100)
    search_radius: int
    people_detected: int


class RescueTeam(BaseModel):
    id: str
    type: Literal["Medical", "Fire & Rescue", "Search & Rescue", "Engineering", "Road Clearance"]
    location: str
    position: Coordinate
    availability: Literal["Available", "Assigned", "En Route", "Operating"]
    capacity: int
    mission: str
    eta: int


class Ambulance(BaseModel):
    id: str
    status: Literal["Available", "En Route", "At Hospital", "Assigned"]
    position: Coordinate
    patients: int
    eta: int


class Hospital(BaseModel):
    id: str
    name: str
    position: Coordinate
    capacity: int
    icu_capacity: int
    emergency_beds: int
    doctors_available: int
    ambulances_available: int
    current_patients: int


class Shelter(BaseModel):
    id: str
    name: str
    position: Coordinate
    capacity: int
    occupied: int
    distance_km: float
    risk_level: Literal["Low", "Medium", "High"]
    medical_support: bool
    accessibility: Literal["Open", "Limited", "Blocked"]


class Resource(BaseModel):
    id: str
    name: str
    stock_percent: int = Field(ge=0, le=100)
    units: int
    unit_name: str
    trend: int


class Road(BaseModel):
    id: str
    from_position: Coordinate
    to_position: Coordinate
    distance_km: float
    travel_time_min: int
    congestion: int
    blockage: int
    risk: int


class SimulationCreateRequest(BaseModel):
    disaster_type: Literal["Flood", "Earthquake", "Wildfire", "Cyclone", "Landslide", "Industrial accident"]
    severity: int = Field(ge=0, le=100)
    population_density: Literal["Low", "Medium", "High"]
    road_blockage: int = Field(ge=0, le=100)
    drones: int = Field(ge=0, le=50)
    rescue_teams: int = Field(ge=0, le=100)
    ambulances: int = Field(ge=0, le=50)


class AssignmentRequest(BaseModel):
    incident_id: str
    candidate_assets: list[str] = []
    constraints: dict[str, float | int | str | bool] = {}


class OptimizationRequest(BaseModel):
    origin: str = "command-center"
    destination: str = "incident-zone"
    avoid_blocked_roads: bool = True
    weights: dict[str, float] = {"distance": 1.0, "risk": 1.5, "congestion": 0.8}


class QuboRequest(BaseModel):
    problem: str
    variables: list[str]
    objective_weights: dict[str, float] = {}
    constraints: dict[str, float] = {}


class QaoaRequest(BaseModel):
    problem: str
    number_of_variables: int = Field(ge=2, le=14)
    qaoa_depth: int = Field(ge=1, le=6)
    cost_matrix: list[list[float]]
