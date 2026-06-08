import sys
import json
import traceback
import time
from typing import Dict, Any, List, Optional

# Import CodeTracer and configurations from existing backend modules
from tracer import CodeTracer, LimitExceededError
from sandbox import SAFE_BUILTINS, safe_import

def audit_hook(event: str, args: tuple):
    # Prohibit process execution / terminal commands (excluding internal Python eval/exec)
    if any(keyword in event for keyword in ("subprocess", "system", "spawn", "fork")) or event.startswith("os.exec"):
        raise RuntimeError(f"Security Restriction: Spawning processes or running shell commands ({event}) is blocked.")
    
    # Prohibit network calls
    if any(keyword in event for keyword in ("socket", "connect", "bind")):
        raise RuntimeError(f"Security Restriction: Network socket operations ({event}) are blocked.")
    
    # Prohibit writing/editing files
    if event == "open":
        file_path = args[0]
        mode = args[1] if len(args) > 1 else "r"
        if any(m in mode for m in ("w", "a", "x", "+")):
            raise RuntimeError("Security Restriction: File write/append operations are blocked.")

def main():
    # 1. Read input payload from parent process stdin
    try:
        payload_str = sys.stdin.read()
        payload = json.loads(payload_str)
    except Exception as e:
        print(json.dumps({
            "success": False,
            "trace": [],
            "error": f"Failed to parse runner payload: {str(e)}"
        }))
        return

    code = payload.get("code", "")
    max_steps = payload.get("max_steps", 1000)
    timeout = payload.get("timeout", 2.0)
    target_step = payload.get("target_step", None)
    mutated_variables = payload.get("mutated_variables", None)

    # 2. Parse and validate code safety statically
    import ast
    try:
        tree = ast.parse(code)
    except SyntaxError as se:
        tb = traceback.format_exc()
        error_msg = f"SyntaxError: {se.msg} (line {se.lineno})"
        synthetic_step = {
            "step": 1,
            "line": se.lineno or 1,
            "event": "exception",
            "scopes": [],
            "heap": {},
            "stdout": "",
            "error": error_msg,
            "traceback": tb,
            "timestamp": time.time()
        }
        print(json.dumps({
            "success": False,
            "trace": [synthetic_step],
            "error": error_msg
        }))
        return

    # Walk AST to prevent sandbox escaping via introspection or frame climbing
    UNSAFE_ATTRIBUTES = {
        '__subclasses__', '__globals__', '__builtins__', '__code__', 
        '__func__', '__self__', '__module__', '__dict__', 
        '__base__', '__bases__', 'f_back', 'tb_frame', 
        'f_globals', 'f_locals', 'gi_frame', 'cr_frame'
    }

    try:
        for node in ast.walk(tree):
            if isinstance(node, ast.Attribute) and node.attr in UNSAFE_ATTRIBUTES:
                raise RuntimeError(f"Security Restriction: Access to attribute '{node.attr}' is blocked.")
            if isinstance(node, ast.Name) and node.id in UNSAFE_ATTRIBUTES:
                raise RuntimeError(f"Security Restriction: Access to name '{node.id}' is blocked.")
    except RuntimeError as re:
        error_msg = str(re)
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
        print(json.dumps({
            "success": False,
            "trace": [synthetic_step],
            "error": error_msg
        }))
        return

    # Compile the validated AST tree
    try:
        compiled_code = compile(tree, '<string>', 'exec')
    except Exception as ce:
        error_msg = f"CompileError: {str(ce)}"
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
        print(json.dumps({
            "success": False,
            "trace": [synthetic_step],
            "error": error_msg
        }))
        return

    # 3. Apply low-level Python system audit hooks
    sys.addaudithook(audit_hook)

    # 4. Build restricted builtin dictionary
    raw_builtins = __builtins__
    if not isinstance(raw_builtins, dict):
        raw_builtins = raw_builtins.__dict__

    safe_builtins_dict = {}
    for name in SAFE_BUILTINS:
        if name in raw_builtins:
            safe_builtins_dict[name] = raw_builtins[name]

    # Override raw import helper with whitelisted version
    safe_builtins_dict['__import__'] = safe_import

    safe_globals = {
        "__builtins__": safe_builtins_dict,
        "__name__": "__main__",
    }

    # 5. Initialize code tracer
    tracer = CodeTracer(
        max_steps=max_steps, 
        timeout=timeout,
        target_step=target_step,
        mutated_variables=mutated_variables
    )
    tracer.start()
    
    success = True
    error_msg = ""

    sys.settrace(tracer.trace_func)
    try:
        from contextlib import redirect_stdout
        with redirect_stdout(tracer.stdout_buffer):
            exec(compiled_code, safe_globals)
    except LimitExceededError as lee:
        success = False
        error_msg = str(lee)
        tracer.steps.append({
            "step": len(tracer.steps) + 1,
            "line": tracer.steps[-1]["line"] if tracer.steps else 1,
            "event": "exception",
            "scopes": tracer.steps[-1]["scopes"] if tracer.steps else [],
            "heap": tracer.steps[-1]["heap"] if tracer.steps else {},
            "stdout": tracer.stdout_buffer.getvalue(),
            "error": error_msg,
            "timestamp": time.time()
        })
    except Exception as e:
        success = False
        tb = traceback.format_exc()
        error_msg = f"{e.__class__.__name__}: {str(e)}"
        tracer.steps.append({
            "step": len(tracer.steps) + 1,
            "line": tracer.steps[-1]["line"] if tracer.steps else 1,
            "event": "exception",
            "scopes": tracer.steps[-1]["scopes"] if tracer.steps else [],
            "heap": tracer.steps[-1]["heap"] if tracer.steps else {},
            "stdout": tracer.stdout_buffer.getvalue(),
            "error": error_msg,
            "traceback": tb,
            "timestamp": time.time()
        })
    finally:
        sys.settrace(None)

    # Normalize line numbers
    for step in tracer.steps:
        if step["line"] == 0:
            step["line"] = 1

    # 6. Return trace results to parent process via stdout
    print(json.dumps({
        "success": success,
        "trace": tracer.steps,
        "error": error_msg if error_msg else None
    }))

if __name__ == "__main__":
    main()
