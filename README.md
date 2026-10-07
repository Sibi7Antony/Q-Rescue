# Q-RESCUE

Quantum Disaster Response & Coordination Platform

**Optimizing every second when every second matters.**

Q-RESCUE is a polished tactical disaster digital twin showing how disaster-response planning can be modeled with classical optimization and small quantum-computing experiments. It is not an emergency service, dispatch tool, warning system, navigation product, or source of real operational intelligence.

## Overview

The default scenario is a severe flood: 78% severity, 480 affected people, 17 active incidents, 8 drones, 21 rescue teams, 12 ambulances, 6 shelters, 3 hospitals, and 14 blocked roads. The interface starts alive with a cinematic landing page, a command center, a simulated city grid, animated drones, rescue assignments, alerts, charts, and a quantum optimization lab.

## Features

- Cinematic landing page with animated quantum/city telemetry.
- Command Center with animated operational counters.
- Disaster Simulator for flood, earthquake, wildfire, cyclone, landslide, and industrial accident scenarios.
- Live 2D response map with layer toggles, clickable incidents, roads, shelters, hospitals, drones, and teams.
- Optional 3D City mode using Three.js, React Three Fiber, and Drei.
- Drone Fleet module with missions, battery, altitude, signal, search radius, and people detected.
- Rescue Team Management for medical, fire, search, engineering, and road-clearance units.
- Emergency Helpline that generates simulated incident IDs and assignments.
- Shelter, hospital, and resource management with capacity and stock alerts.
- What If Simulator that recalculates people affected, assignments, routes, shelter allocation, and resource distribution.
- Analytics charts for response time, resource stock, and classical vs QAOA-style results.
- Quantum Optimization Lab: QUBO variables, QAOA workflow, circuit viewer, simulation output, and accuracy disclaimers.
- FastAPI backend endpoints for simulation, incidents, assets, routing, QUBO, and QAOA simulation.

## Architecture

```text
q-rescue/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   └── types/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── optimization/
│   │   ├── quantum/
│   │   └── simulation/
│   └── requirements.txt
└── README.md
```

## Tech Stack

Frontend: Next.js, TypeScript, React, Tailwind CSS, Framer Motion, Three.js, React Three Fiber, Drei, Recharts, Lucide React.

Backend: Python, FastAPI, Pydantic, NumPy, SciPy, NetworkX.

Quantum: Qiskit, Qiskit Aer, Qiskit Optimization, QAOA-inspired local simulation and graceful fallback when quantum packages are not installed.

## Quantum Computing Concepts

### QUBO

Quadratic Unconstrained Binary Optimization represents selected optimization problems using binary variables. In Q-RESCUE, a binary value can mean whether a drone, team, shelter, or route choice is selected.

### QAOA

The Quantum Approximate Optimization Algorithm is a hybrid quantum-classical algorithm designed to approximate solutions to combinatorial optimization problems. Q-RESCUE treats QAOA results as experimental simulation outputs.

### Qiskit

Qiskit is a Python framework for building and running quantum circuits.

### Qiskit Aer

Qiskit Aer provides simulators for executing quantum circuits locally. Running on a classical simulator is not the same as demonstrating quantum computational advantage.

## Optimization Problems

- Drone allocation to search zones.
- Rescue-team assignment to priority incidents.
- Shelter assignment for affected populations.
- Hospital routing for simulated patients.
- Resource allocation under shortage.
- Route optimization over a road network with blockage, congestion, distance, and risk.

## Installation

From this folder:

```bash
cd q-rescue/frontend
npm install
```

For the backend:

```bash
cd q-rescue/backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

If Python is not installed on Windows, install Python 3.11 or newer first.

## Running Frontend

```bash
cd q-rescue/frontend
npm run dev
```

Then open `http://localhost:3000`.

## Running Backend

```bash
cd q-rescue/backend
uvicorn app.main:app --reload
```

The frontend can run without the backend; the QAOA panel displays a deterministic local fallback if `http://localhost:8000` is unavailable.

## Example API Calls

```bash
curl http://localhost:8000/simulation
```

```bash
curl -X POST http://localhost:8000/quantum/qaoa \
  -H "Content-Type: application/json" \
  -d "{\"problem\":\"drone_allocation\",\"number_of_variables\":4,\"qaoa_depth\":2,\"cost_matrix\":[[1,0.2,0,0],[0.2,1,0.1,0],[0,0.1,1,0.2],[0,0,0.2,1]]}"
```

## Screenshots

Add screenshots here after running the frontend locally.

## Future Improvements

- Persist simulations in a database.
- Add authenticated scenario libraries.
- Add real GIS data adapters while keeping emergency disclaimers explicit.
- Expand QUBO builders for richer constraints.
- Add test suites for frontend interactions and backend optimization endpoints.
- Add replayable event timelines and exportable simulation reports.

## Limitations

- Data is simulated and local.
- Optimization outputs are demonstrations, not operational recommendations.
- QAOA experiments are intentionally small.
- Classical simulation through Aer does not imply quantum advantage.
- Real quantum hardware has noise, connectivity limits, queue time, calibration drift, and other constraints.

## Disclaimer

**Q-RESCUE IS A TACTICAL DISASTER DIGITAL TWIN.**

It does not provide real emergency dispatch, navigation, medical advice, disaster warnings, or operational rescue coordination. It should not replace emergency services, government disaster-management systems, professional rescue teams, or medical professionals.
