import sys
import time
import traceback
import importlib
import subprocess
import os
import json
from typing import Tuple, List, Dict, Any, Optional
from contextlib import redirect_stdout
from tracer import CodeTracer, LimitExceededError

# Whitelist of safe Python builtin names
SAFE_BUILTINS = {
    'abs', 'all', 'any', 'bin', 'bool', 'chr', 'dict', 'divmod', 'enumerate',
    'filter', 'float', 'format', 'frozenset', 'hash', 'hex', 'id', 'int',
    'isinstance', 'issubclass', 'iter', 'len', 'list', 'map', 'max', 'min',
    'next', 'oct', 'ord', 'pow', 'print', 'range', 'repr', 'reversed', 'round',
    'set', 'slice', 'sorted', 'str', 'sum', 'tuple', 'type', 'zip',
    'Exception', 'ValueError', 'TypeError', 'IndexError', 'KeyError', 'AttributeError', 
    'ZeroDivisionError', 'AssertionError', 'NameError', 'RuntimeError', 'StopIteration',
    '__build_class__'
}

# Whitelist of modules allowed for import in DSA solutions
ALLOWED_MODULES = {'math', 'collections', 'heapq', 'bisect', 'random', 'itertools', 'functools'}

_original_import = __import__

def safe_import(name: str, globals=None, locals=None, fromlist=(), level=0):
    # Retrieve base module name (e.g. "collections" from "collections.deque")
    base_module = name.split('.')[0]
    if base_module in ALLOWED_MODULES:
        return _original_import(name, globals, locals, fromlist, level)
    raise ImportError(f"Import of module '{name}' is restricted in this sandbox.")

def execute_sandbox(
    code: str, 
    max_steps: int = 1000, 
    timeout: float = 2.0,
    target_step: Optional[int] = None,
    mutated_variables: Optional[Dict[str, Any]] = None
) -> Tuple[bool, List[Dict[str, Any]], str]:
    """
    Executes Python code safely inside an isolated subprocess using sandbox_runner.py,
    enforcing resource allocation boundaries and interception hooks.
    
    Returns:
        (success: bool, trace: List[Dict], error: str)
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    runner_path = os.path.join(current_dir, "sandbox_runner.py")
    
    # 1. Establish cross-platform resource limits
    preexec = None
    if sys.platform != "win32":
        try:
            import resource
            def limit_resources():
                # Limit process virtual memory to 128 MB
                max_mem = 128 * 1024 * 1024
                resource.setrlimit(resource.RLIMIT_AS, (max_mem, max_mem))
                # Limit CPU time to 5 seconds
                resource.setrlimit(resource.RLIMIT_CPU, (5, 5))
            preexec = limit_resources
        except ImportError:
            pass

    # 2. Build parameter payload
    payload = {
        "code": code,
        "max_steps": max_steps,
        "timeout": timeout,
        "target_step": target_step,
        "mutated_variables": mutated_variables
    }

    # 3. Launch subprocess and pipe communication
    try:
        process = subprocess.Popen(
            [sys.executable, runner_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            preexec_fn=preexec
        )
        
        # We give the subprocess slightly more time (+1s) than the internal tracer hook 
        # so the runner has a chance to catch and serialize internal limits/errors first.
        stdout_data, stderr_data = process.communicate(
            input=json.dumps(payload),
            timeout=timeout + 1.0
        )
    except subprocess.TimeoutExpired:
        process.kill()
        stdout_data, stderr_data = process.communicate()
        error_msg = f"Execution timeout: subprocess exceeded hard timeout limit of {timeout}s."
        synthetic_step = {
            "step": 1,
            "line": 1,
            "event": "exception",
            "scopes": [],
            "heap": {},
            "stdout": "",
            "error": error_msg,
            "timestamp": time.time()
        }
        return False, [synthetic_step], error_msg
    except Exception as e:
        error_msg = f"Sandbox execution process error: {str(e)}"
        synthetic_step = {
            "step": 1,
            "line": 1,
            "event": "exception",
            "scopes": [],
            "heap": {},
            "stdout": "",
            "error": error_msg,
            "timestamp": time.time()
        }
        return False, [synthetic_step], error_msg

    # 4. Check for subprocess crash or memory exhaustion termination
    if process.returncode != 0:
        error_msg = f"Sandbox terminated unexpectedly with exit code {process.returncode}."
        if "MemoryError" in stderr_data or process.returncode in (-9, -15):
            error_msg = "Sandbox terminated: Memory limit (128MB) exceeded."
        elif stderr_data:
            error_msg += f" Details: {stderr_data.strip()}"
        
        synthetic_step = {
            "step": 1,
            "line": 1,
            "event": "exception",
            "scopes": [],
            "heap": {},
            "stdout": "",
            "error": error_msg,
            "timestamp": time.time()
        }
        return False, [synthetic_step], error_msg

    # 5. Parse tracer JSON output
    try:
        result = json.loads(stdout_data)
        return result["success"], result["trace"], result.get("error") or ""
    except Exception as e:
        error_msg = f"Failed to parse trace response: {str(e)}"
        if stderr_data:
            error_msg += f" Subprocess errors: {stderr_data}"
        synthetic_step = {
            "step": 1,
            "line": 1,
            "event": "exception",
            "scopes": [],
            "heap": {},
            "stdout": "",
            "error": error_msg,
            "timestamp": time.time()
        }
        return False, [synthetic_step], error_msg

