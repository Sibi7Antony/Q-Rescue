import heapq
import time
from typing import Any

import networkx as nx

from app.models.schemas import AssignmentRequest, OptimizationRequest


def optimize_assignment(payload: AssignmentRequest | OptimizationRequest, asset_type: str) -> dict[str, Any]:
    start = time.perf_counter()
    candidates = getattr(payload, "candidate_assets", None) or [f"{asset_type.upper()}-{index:02d}" for index in range(1, 6)]
    scored = [
        {
            "asset": candidate,
            "score": round(100 - index * 8.7 - len(candidate) * 0.3, 2),
            "eta_min": 6 + index * 3,
            "reason": "Balances priority, capacity, travel time, and risk in simulated data.",
        }
        for index, candidate in enumerate(candidates)
    ]
    return {
        "asset_type": asset_type,
        "assignments": scored[:3],
        "execution_time_ms": round((time.perf_counter() - start) * 1000, 3),
        "method": "classical heuristic",
        "disclaimer": "Simulated optimization result.",
    }


def optimize_route(payload: OptimizationRequest) -> dict[str, Any]:
    start = time.perf_counter()
    graph = nx.Graph()
    edges = [
        ("Command", "North Hub", 4.2, 18, 10),
        ("Command", "Canal Bridge", 7.1, 67, 62),
        ("North Hub", "Riverside", 3.7, 22, 26),
        ("Riverside", "Incident Zone", 2.8, 35, 49),
        ("Canal Bridge", "Incident Zone", 2.1, 81, 74),
        ("North Hub", "Central Shelter", 2.6, 12, 18),
        ("Central Shelter", "Incident Zone", 4.3, 24, 33),
    ]
    for source, target, distance, blockage, risk in edges:
        if payload.avoid_blocked_roads and blockage > 75:
            continue
        weight = (
            distance * payload.weights.get("distance", 1.0)
            + blockage / 20 * payload.weights.get("congestion", 0.8)
            + risk / 25 * payload.weights.get("risk", 1.5)
        )
        graph.add_edge(source, target, weight=weight, distance=distance, blockage=blockage, risk=risk)
    route = nx.shortest_path(graph, "Command", "Incident Zone", weight="weight")
    distance = sum(graph[route[index]][route[index + 1]]["distance"] for index in range(len(route) - 1))
    eta = heapq.nsmallest(1, [round(distance * 1.35 + 4)])[0]
    return {
        "normal_route": {"distance_km": 12.4, "eta_min": 19},
        "optimized_route": {"nodes": route, "distance_km": round(distance, 2), "eta_min": eta},
        "execution_time_ms": round((time.perf_counter() - start) * 1000, 3),
        "method": "NetworkX shortest path with risk/blockage weights",
        "disclaimer": "Simulation result. No quantum speedup is claimed.",
    }
