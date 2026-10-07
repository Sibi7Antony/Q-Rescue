from fastapi import APIRouter

from app.models.schemas import (
    AssignmentRequest,
    Incident,
    OptimizationRequest,
    QaoaRequest,
    QuboRequest,
    SimulationCreateRequest,
)
from app.optimization.classical import optimize_assignment, optimize_route
from app.quantum.qaoa import run_qaoa_simulation
from app.quantum.qubo import build_qubo
from app.simulation.demo import (
    create_simulation,
    demo_state,
    hospitals,
    resources,
    shelters,
    whatif_simulation,
)

router = APIRouter()


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Q-RESCUE API",
        "disclaimer": "Tactical disaster digital twin.",
    }


@router.get("/simulation")
def get_simulation():
    return demo_state()


@router.post("/simulation/create")
def post_simulation(payload: SimulationCreateRequest):
    return create_simulation(payload)


@router.post("/simulation/whatif")
def post_whatif(payload: SimulationCreateRequest):
    return whatif_simulation(payload)


@router.get("/incidents")
def get_incidents():
    return demo_state()["incidents"]


@router.post("/incidents")
def post_incident(payload: Incident):
    return {"incident": payload, "status": "assigned", "disclaimer": "Simulated assignment only."}


@router.get("/drones")
def get_drones():
    return demo_state()["drones"]


@router.post("/drones/assign")
def assign_drone(payload: AssignmentRequest):
    return optimize_assignment(payload, asset_type="drone")


@router.get("/rescue-teams")
def get_rescue_teams():
    return demo_state()["rescue_teams"]


@router.post("/rescue-teams/assign")
def assign_rescue_team(payload: AssignmentRequest):
    return optimize_assignment(payload, asset_type="rescue_team")


@router.get("/shelters")
def get_shelters():
    return shelters()


@router.get("/hospitals")
def get_hospitals():
    return hospitals()


@router.get("/resources")
def get_resources():
    return resources()


@router.post("/optimize/routes")
def post_route_optimization(payload: OptimizationRequest):
    return optimize_route(payload)


@router.post("/optimize/evacuation")
def post_evacuation(payload: OptimizationRequest):
    return optimize_assignment(payload, asset_type="shelter")


@router.post("/optimize/resources")
def post_resources(payload: OptimizationRequest):
    return optimize_assignment(payload, asset_type="resource")


@router.post("/optimize/drones")
def post_drone_optimization(payload: OptimizationRequest):
    return optimize_assignment(payload, asset_type="drone")


@router.post("/optimize/rescue-teams")
def post_rescue_team_optimization(payload: OptimizationRequest):
    return optimize_assignment(payload, asset_type="rescue_team")


@router.post("/quantum/qubo")
def post_qubo(payload: QuboRequest):
    return build_qubo(payload)


@router.post("/quantum/qaoa")
def post_qaoa(payload: QaoaRequest):
    return run_qaoa_simulation(payload)
