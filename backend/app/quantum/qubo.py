from app.models.schemas import QuboRequest


def build_qubo(payload: QuboRequest) -> dict:
    variables = payload.variables
    linear = {variable: payload.objective_weights.get(variable, 1.0) for variable in variables}
    quadratic = {}
    for index, variable in enumerate(variables):
        for other in variables[index + 1 :]:
            quadratic[f"{variable},{other}"] = payload.constraints.get("duplicate_assignment_penalty", 2.0)
    return {
        "problem": payload.problem,
        "variables": variables,
        "linear_terms": linear,
        "quadratic_terms": quadratic,
        "meaning": "Binary 1 selects an assignment; 0 leaves it unselected.",
        "disclaimer": "QUBO model for tactical disaster digital twin, not operational dispatch.",
    }
