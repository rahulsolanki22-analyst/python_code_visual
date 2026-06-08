# Security tests for isolated Python Sandbox Subprocess
import sys
from sandbox import execute_sandbox

def test_safe_execution():
    code = "x = 10\ny = 20\nprint(x + y)"
    success, trace, error = execute_sandbox(code)
    assert success
    assert not error
    assert trace[-1]["stdout"].strip() == "30"
    print("[PASS] test_safe_execution")

def test_subclass_introspection_block():
    # Attempt to traverse subclasses to access forbidden methods
    code = """
unsafe_classes = ().__class__.__base__.__subclasses__()
found = False
for cls in unsafe_classes:
    if cls.__name__ == '_wrap_close':
        found = True
        cls.__init__.__globals__['system']('echo hacked')
if not found:
    print("Class not found")
"""
    success, trace, error = execute_sandbox(code)
    # The tracer event loop will catch the audit hook exception during the exec()
    assert not success
    assert "Security Restriction" in error or "restricted" in error or "blocked" in error
    print("[PASS] test_subclass_introspection_block")

def test_traceback_frame_escalation_block():
    # Attempt to climb frame tree to inspect parent environment globals
    code = """
try:
    1 / 0
except Exception as e:
    tb = e.__traceback__
    curr = tb.tb_frame
    found_parent = False
    while curr:
        if curr.f_code.co_name == 'execute_sandbox':
            found_parent = True
        curr = curr.f_back
    print("Accessed parent function execute_sandbox:", found_parent)
"""
    success, trace, error = execute_sandbox(code)
    assert not success
    assert "Security Restriction" in error
    print("[PASS] test_traceback_frame_escalation_block")


def test_cpu_timeout_block():
    # Infinite CPU loop execution
    code = "while True: pass"
    success, trace, error = execute_sandbox(code, timeout=0.5)
    assert not success
    assert "timeout" in error.lower()
    print("[PASS] test_cpu_timeout_block")

def test_memory_exhaustion_block():
    # Allocation of too much memory
    # We request a huge list to trigger a memory error or termination.
    code = "huge_list = [0] * (10 ** 8)"
    success, trace, error = execute_sandbox(code)
    assert not success
    assert any(term in error.lower() for term in ("memory", "exit code", "timeout"))

    print("[PASS] test_memory_exhaustion_block")

def test_file_write_block():
    # Attempt to open file for writing
    code = "open('hacked.txt', 'w').write('hello')"
    success, trace, error = execute_sandbox(code)
    assert not success
    assert any(term in error.lower() for term in ("security restriction", "file write/append", "name 'open' is not defined"))
    print("[PASS] test_file_write_block")

def test_arbitrary_file_read_block():
    # Attempt to read a file using subclass introspection
    code = """
sys_module = None
for cls in ().__class__.__base__.__subclasses__():
    try:
        sys_module = cls.__init__.__globals__['sys']
        if sys_module:
            break
    except Exception:
        pass

if sys_module:
    builtins = sys_module.modules['builtins']
    with builtins.open('d:\\\\code_visual\\\\README.md', 'r') as f:
        print(f.read())
"""
    success, trace, error = execute_sandbox(code)
    assert not success
    assert "Security Restriction" in error
    print("[PASS] test_arbitrary_file_read_block")

def run_all_security_tests():
    print("Running Security Sandbox Tests...")
    test_safe_execution()
    test_subclass_introspection_block()
    test_traceback_frame_escalation_block()
    test_cpu_timeout_block()
    test_memory_exhaustion_block()
    test_file_write_block()
    test_arbitrary_file_read_block()
    print("All security tests passed successfully!")

if __name__ == "__main__":
    run_all_security_tests()
