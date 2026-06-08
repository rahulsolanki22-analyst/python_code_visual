import ast
from typing import Dict, Any, List, Set

class ASTComplexityAnalyzer(ast.NodeVisitor):
    def __init__(self):
        self.current_loop_depth = 0
        self.max_loop_depth = 0
        
        # Track function definitions and recursion
        self.defined_functions: Dict[str, ast.FunctionDef] = {}
        self.recursive_functions: Set[str] = set()
        self.called_functions: Set[str] = set()
        
        # Indicators for logarithmic behavior (halving steps)
        self.has_halving_operations = False
        
        # Indicators for space allocation
        self.has_linear_storage = False
        self.has_quadratic_storage = False
        
        # Linter warnings and performance suggestions
        self.warnings: List[str] = []
        self.suggestions: List[Dict[str, Any]] = []
        
        # Track string initializations to check concatenation
        self.string_variables: Set[str] = set()
        
        # Track active function scope to detect recursion and variables
        self.current_function_name = None

    def visit_FunctionDef(self, node: ast.FunctionDef):
        self.defined_functions[node.name] = node
        prev_function = self.current_function_name
        self.current_function_name = node.name
        
        # Track if it's recursive
        self.generic_visit(node)
        
        self.current_function_name = prev_function

    def visit_Call(self, node: ast.Call):
        if isinstance(node.func, ast.Name):
            func_name = node.func.id
            self.called_functions.add(func_name)
            
            # Detect recursion (calling itself from within its own body)
            if self.current_function_name and func_name == self.current_function_name:
                self.recursive_functions.add(func_name)
                
            # Track space allocation from standard constructors
            if func_name in ('list', 'dict', 'set', 'deque'):
                self.has_linear_storage = True
                
        elif isinstance(node.func, ast.Attribute):
            # Detect list append, extend, add, etc.
            method_name = node.func.attr
            if method_name in ('append', 'extend', 'insert', 'add', 'update', 'push', 'enqueue'):
                self.has_linear_storage = True
                
        self.generic_visit(node)

    def visit_For(self, node: ast.For):
        self.current_loop_depth += 1
        self.max_loop_depth = max(self.max_loop_depth, self.current_loop_depth)
        
        # Look for nested loops/quadratic patterns in loops
        if self.current_loop_depth >= 2:
            self.has_quadratic_storage = self.has_quadratic_storage or self.current_loop_depth > 2
            
        self.generic_visit(node)
        self.current_loop_depth -= 1

    def visit_While(self, node: ast.While):
        self.current_loop_depth += 1
        self.max_loop_depth = max(self.max_loop_depth, self.current_loop_depth)
        
        if self.current_loop_depth >= 2:
            self.has_quadratic_storage = self.has_quadratic_storage or self.current_loop_depth > 2

        self.generic_visit(node)
        self.current_loop_depth -= 1

    def visit_BinOp(self, node: ast.BinOp):
        # Look for Division by 2, Floor Division by 2, or right-shifts by 1
        if isinstance(node.op, (ast.Div, ast.FloorDiv)):
            if isinstance(node.right, ast.Constant) and node.right.value == 2:
                self.has_halving_operations = True
        elif isinstance(node.op, ast.RShift):
            if isinstance(node.right, ast.Constant) and node.right.value == 1:
                self.has_halving_operations = True
        self.generic_visit(node)

    def visit_Assign(self, node: ast.Assign):
        # Track string variable definitions (e.g. s = "" or s = str())
        if len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            var_name = node.targets[0].id
            if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
                self.string_variables.add(var_name)
            elif isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Name) and node.value.func.id == "str":
                self.string_variables.add(var_name)
        self.generic_visit(node)

    def visit_AugAssign(self, node: ast.AugAssign):
        # Look for statements like: x //= 2 or x >>= 1
        if isinstance(node.op, (ast.FloorDiv, ast.Div)):
            if isinstance(node.value, ast.Constant) and node.value.value == 2:
                self.has_halving_operations = True
        elif isinstance(node.op, ast.RShift):
            if isinstance(node.value, ast.Constant) and node.value.value == 1:
                self.has_halving_operations = True
                
        # String concatenation warning inside loops
        if self.current_loop_depth > 0:
            if isinstance(node.target, ast.Name) and node.target.id in self.string_variables:
                if isinstance(node.op, ast.Add):
                    line_no = getattr(node, "lineno", None)
                    self.suggestions.append({
                        "type": "performance",
                        "text": f"String concatenation '+=' found inside loop for variable '{node.target.id}' (line {line_no}). In Python, strings are immutable, so concatenating strings inside a loop is inefficient (O(N^2) time). Consider storing values in a list and using ''.join() at the end.",
                        "line": line_no
                    })
        self.generic_visit(node)

    def visit_Compare(self, node: ast.Compare):
        # Look for 'x in list' lookups inside loops which are O(N)
        if self.current_loop_depth > 0:
            for op in node.ops:
                if isinstance(op, (ast.In, ast.NotIn)):
                    if isinstance(node.comparators[0], ast.Name):
                        var_name = node.comparators[0].id
                        line_no = getattr(node, "lineno", None)
                        self.suggestions.append({
                            "type": "performance",
                            "text": f"Potential O(N) lookup inside loop using variable '{var_name}' (line {line_no}). If this variable is a list, lookups will be slow. Consider converting it to a 'set' to achieve O(1) time complexity.",
                            "line": line_no
                        })
        self.generic_visit(node)

    def visit_ListComp(self, node: ast.ListComp):
        # List comprehensions imply linear space allocation
        self.has_linear_storage = True
        # Check if list comprehension contains nested list comprehensions (often 2D matrices)
        for gen in node.generators:
            self.generic_visit(gen)
        if isinstance(node.elt, (ast.ListComp, ast.List, ast.Call)):
            self.has_quadratic_storage = True
        self.generic_visit(node.elt)

    def visit_DictComp(self, node: ast.DictComp):
        self.has_linear_storage = True
        self.generic_visit(node)

    def visit_SetComp(self, node: ast.SetComp):
        self.has_linear_storage = True
        self.generic_visit(node)

    # Check for dead code (statements occurring after a terminal statement in the same block)
    def check_dead_code(self, body_list: List[ast.AST]):
        terminal_found = False
        for node in body_list:
            if terminal_found:
                # Flag warning
                line_info = f" (line {node.lineno})" if hasattr(node, 'lineno') else ""
                self.warnings.append(f"Dead code detected: unreachable code at top level of block{line_info}.")
                break
            
            if isinstance(node, (ast.Return, ast.Raise, ast.Break, ast.Continue)):
                terminal_found = True

        # Recursively check nested blocks
        for node in body_list:
            for field, val in ast.iter_fields(node):
                if isinstance(val, list):
                    self.check_blocks_for_dead_code(val)

    def check_blocks_for_dead_code(self, nodes: List[Any]):
        # Filter for ast.AST items
        ast_nodes = [n for n in nodes if isinstance(n, ast.AST)]
        if not ast_nodes:
            return
            
        terminal_found = False
        for node in ast_nodes:
            if terminal_found:
                line_info = f" (line {node.lineno})" if hasattr(node, 'lineno') else ""
                self.warnings.append(f"Dead code detected: unreachable statement{line_info}.")
                break
            
            if isinstance(node, (ast.Return, ast.Raise, ast.Break, ast.Continue)):
                terminal_found = True
            
            # Recurse inside fields
            for _, val in ast.iter_fields(node):
                if isinstance(val, list):
                    self.check_blocks_for_dead_code(val)

def analyze_code(code: str, trace_steps: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Parses code using AST and analyzes it alongside dynamic execution telemetry
    to output structured code-lint warnings, metrics, and complex estimations.
    """
    warnings: List[str] = []
    
    # 1. Compile & AST Parsing
    try:
        root = ast.parse(code)
    except SyntaxError as se:
        # Syntax errors are captured by compiler/sandbox
        return {
            "time_complexity": "N/A",
            "space_complexity": "N/A",
            "warnings": [f"Syntax Error: {se.msg} (line {se.lineno})"],
            "metrics": {
                "step_count": 0,
                "max_stack_depth": 0,
                "max_heap_objects": 0
            }
        }

    analyzer = ASTComplexityAnalyzer()
    analyzer.visit(root)
    
    # Check dead code across root block and defined functions
    analyzer.check_dead_code(root.body)
    for func in analyzer.defined_functions.values():
        analyzer.check_dead_code(func.body)
        
    warnings.extend(analyzer.warnings)

    # 2. Check for missing driver / uncalled functions
    has_definitions = len(analyzer.defined_functions) > 0
    
    # Walk top-level statements to see if there are execution driver calls
    has_driver_execution = False
    for node in root.body:
        if not isinstance(node, (ast.FunctionDef, ast.ClassDef, ast.Import, ast.ImportFrom, ast.Pass)):
            has_driver_execution = True
            break
            
    if has_definitions and not has_driver_execution:
        warnings.append("No active execution driver found at root level. Your defined functions/classes are not being run.")
        
    # Uncalled helper functions warning
    for func_name in analyzer.defined_functions:
        # If it's a LeetCode class helper or standard method (e.g. solve, twoSum) we don't necessarily flag it,
        # but if there are other defined functions, we check if they are called
        if func_name not in analyzer.called_functions:
            # Check if this is the only main function, in which case the warning above about "missing driver" is more appropriate
            if len(analyzer.defined_functions) > 1 or has_driver_execution:
                warnings.append(f"Function '{func_name}' is defined but never called.")

    # 3. Dynamic Telemetry Metrics
    step_count = 0
    max_stack_depth = 0
    max_heap_objects = 0
    
    if trace_steps:
        step_count = len(trace_steps)
        max_stack_depth = max((len(step.get("scopes", [])) for step in trace_steps), default=0)
        max_heap_objects = max((len(step.get("heap", {})) for step in trace_steps), default=0)
        
    # 4. Complexity Estimation Logic (Hybrid model combining static AST and dynamic metrics)
    is_recursive = len(analyzer.recursive_functions) > 0
    max_loops = analyzer.max_loop_depth
    
    # Time Complexity Heuristics
    time_complexity = "O(1)"
    if is_recursive:
        if analyzer.has_halving_operations:
            time_complexity = "O(N log N)"
        else:
            time_complexity = "O(N)"
            # Recursion depth estimation helper
            if max_stack_depth > 50:
                warnings.append(f"Deep recursion detected: call stack depth reached {max_stack_depth}. Watch out for StackOverflow errors.")
    elif max_loops == 1:
        if analyzer.has_halving_operations:
            time_complexity = "O(log N)"
        else:
            time_complexity = "O(N)"
    elif max_loops == 2:
        time_complexity = "O(N²)"
    elif max_loops >= 3:
        time_complexity = "O(N³)"
        
    # Space Complexity Heuristics
    space_complexity = "O(1)"
    if analyzer.has_quadratic_storage or max_heap_objects > 100 and max_loops >= 2:
        space_complexity = "O(N²)"
    elif analyzer.has_linear_storage or is_recursive or max_heap_objects > 10:
        # Stack frames in recursion count as O(N) auxiliary space
        space_complexity = "O(N)"
        
    # Enrich warnings based on dynamic execution size
    if step_count > 800:
        warnings.append(f"High execution steps count ({step_count}/1000). Inspect for redundant operations or slow complexity loops.")
        
    # Nested loops warning suggestions
    if analyzer.max_loop_depth >= 2:
        analyzer.suggestions.append({
            "type": "performance",
            "text": f"Nested loops detected (depth {analyzer.max_loop_depth}). This often leads to quadratic O(N^2) or cubic O(N^3) time complexity. Check if you can optimize this using a hash map, two-pointers, or sliding window technique.",
            "line": None
        })

    return {
        "time_complexity": time_complexity,
        "space_complexity": space_complexity,
        "warnings": warnings,
        "suggestions": analyzer.suggestions,
        "metrics": {
            "step_count": step_count,
            "max_stack_depth": max_stack_depth,
            "max_heap_objects": max_heap_objects
        }
    }
