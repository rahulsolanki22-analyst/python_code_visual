import sys
import time
from typing import List, Dict, Any
from io import StringIO
from serializers import TraceSerializer

class LimitExceededError(Exception):
    """Raised when execution limits (max steps or timeout) are exceeded."""
    pass

class CodeTracer:
    def __init__(
        self, 
        max_steps: int = 1000, 
        timeout: float = 2.0,
        target_step: int = None,
        mutated_variables: Dict[str, Any] = None
    ):
        self.max_steps = max_steps
        self.timeout = timeout
        self.target_step = target_step
        self.mutated_variables = mutated_variables
        self.steps: List[Dict[str, Any]] = []
        self.step_count = 0
        self.start_time = 0.0
        self.stdout_buffer = StringIO()

    def start(self):
        self.start_time = time.time()
        self.step_count = 0
        self.steps = []

    def trace_func(self, frame, event: str, arg: Any):
        # Only trace user code compiled in the sandbox
        if frame.f_code.co_filename != '<string>':
            return None

        # Enforce execution limits to prevent infinite loops
        self.step_count += 1

        # Inject variable mutation if we reached target step
        if self.target_step and self.mutated_variables and self.step_count == self.target_step:
            import ctypes
            try:
                for k, v in self.mutated_variables.items():
                    frame.f_locals[k] = v
                # Force interpreter to flush local dict updates back to fast local cells
                ctypes.pythonapi.PyFrame_LocalsToFast(ctypes.py_object(frame), ctypes.c_int(0))
            except Exception:
                # Fallback in case of ctypes variations in interpreter setups
                pass
        if self.step_count > self.max_steps:
            raise LimitExceededError(f"Execution limit exceeded: ran more than {self.max_steps} steps.")
        if time.time() - self.start_time > self.timeout:
            raise LimitExceededError(f"Execution timeout: took more than {self.timeout}s.")

        # Line number (1-based index)
        line_no = frame.f_lineno

        # Instantiate serializer for this specific execution snapshot
        serializer = TraceSerializer()

        # Build active call stack frames (oldest to newest)
        scopes = []
        curr_frame = frame
        while curr_frame:
            if curr_frame.f_code.co_filename == '<string>':
                frame_name = curr_frame.f_code.co_name
                raw_locals = curr_frame.f_locals
                
                # Filter locals to remove internal details & classes/functions definitions
                filtered_locals = {}
                for k, v in raw_locals.items():
                    if k.startswith('__') and k.endswith('__'):
                        continue
                    
                    serialized_val = serializer.serialize(v)
                    # Filter out functions/classes/modules from standard visual variable list
                    if isinstance(serialized_val, str) and serialized_val.startswith('<class/function'):
                        continue
                    filtered_locals[k] = serialized_val

                scopes.append({
                    "name": frame_name,
                    "line": curr_frame.f_lineno,
                    "variables": filtered_locals
                })
            curr_frame = curr_frame.f_back

        # Reverse stack order so that global frame is first (index 0) and current frame is last
        scopes.reverse()

        # Build current trace step entry
        step_entry = {
            "step": self.step_count,
            "line": line_no,
            "event": event,
            "scopes": scopes,
            "heap": serializer.heap,
            "stdout": self.stdout_buffer.getvalue(),
            "timestamp": time.time()
        }

        # Enrich with exceptions or return arguments if present
        if event == 'exception' and isinstance(arg, tuple) and len(arg) >= 2:
            exc_type, exc_val = arg[0], arg[1]
            step_entry["error"] = f"{exc_type.__name__}: {exc_val}"
        elif event == 'return':
            # Optionally serialize returned value
            step_entry["return_value"] = serializer.serialize(arg)

        self.steps.append(step_entry)
        
        # Return reference to trace_func so we continue tracing lines in this scope
        return self.trace_func
