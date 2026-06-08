from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import VisualizeRequest, VisualizeResponse
from sandbox import execute_sandbox
from ast_analyzer import analyze_code

app = FastAPI(
    title="Python DSA Visualizer API",
    description="Backend execution engine for tracing Python DSA code line-by-line",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production if needed, allow all for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Python DSA Visualizer API is active"}

@app.post("/api/visualize", response_model=VisualizeResponse)
def visualize_code(payload: VisualizeRequest):
    try:
        success, trace_steps, error_msg = execute_sandbox(
            code=payload.code,
            max_steps=payload.max_steps,
            timeout=payload.timeout,
            target_step=payload.target_step,
            mutated_variables=payload.mutated_variables
        )
        # Run AST and execution telemetry analyzer
        try:
            analysis_result = analyze_code(payload.code, trace_steps if success else None)
        except Exception as ae:
            analysis_result = {
                "time_complexity": "N/A",
                "space_complexity": "N/A",
                "warnings": [f"AST analysis error: {str(ae)}"],
                "metrics": {
                    "step_count": len(trace_steps) if trace_steps else 0,
                    "max_stack_depth": 0,
                    "max_heap_objects": 0
                }
            }

        return VisualizeResponse(
            success=success,
            trace=trace_steps,
            error=error_msg if error_msg else None,
            analysis=analysis_result
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An internal error occurred during code trace execution: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
