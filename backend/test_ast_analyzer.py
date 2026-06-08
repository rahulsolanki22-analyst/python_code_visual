# Unit tests for AST Complexity Analyzer
from ast_analyzer import analyze_code

def test_o1_complexity():
    code = "x = 10\ny = 20\nprint(x + y)"
    result = analyze_code(code)
    assert result["time_complexity"] == "O(1)"
    assert result["space_complexity"] == "O(1)"
    assert len(result["warnings"]) == 0

def test_linear_time_loop():
    code = """
def process(arr):
    for x in arr:
        print(x)
process([1, 2, 3])
"""
    result = analyze_code(code)
    assert result["time_complexity"] == "O(N)"
    assert result["space_complexity"] == "O(1)"

def test_quadratic_time_nested_loops():
    code = """
def process(matrix):
    for row in matrix:
        for val in row:
            print(val)
process([[1, 2], [3, 4]])
"""
    result = analyze_code(code)
    assert result["time_complexity"] == "O(N²)"
    assert result["space_complexity"] == "O(1)"

def test_logarithmic_time_division():
    code = """
def binary_search(n):
    while n > 0:
        n //= 2
binary_search(100)
"""
    result = analyze_code(code)
    assert result["time_complexity"] == "O(log N)"
    assert result["space_complexity"] == "O(1)"

def test_recursive_complexity():
    code = """
def recurse(n):
    if n <= 1:
        return n
    return recurse(n - 1)
recurse(5)
"""
    result = analyze_code(code)
    assert result["time_complexity"] == "O(N)"
    assert result["space_complexity"] == "O(N)" # stack space

def test_recursive_halving():
    code = """
def merge_sort(n):
    if n <= 1:
        return n
    merge_sort(n // 2)
    merge_sort(n // 2)
merge_sort(10)
"""
    result = analyze_code(code)
    assert result["time_complexity"] == "O(N log N)"
    assert result["space_complexity"] == "O(N)"

def test_linear_space_allocation():
    code = """
def build_list(n):
    res = []
    for i in range(n):
        res.append(i)
    return res
build_list(5)
"""
    result = analyze_code(code)
    assert result["space_complexity"] == "O(N)"

def test_quadratic_space_matrix():
    code = """
def build_matrix(n):
    return [[0 for _ in range(n)] for _ in range(n)]
build_matrix(3)
"""
    result = analyze_code(code)
    assert result["space_complexity"] == "O(N²)"

def test_uncalled_helper_warning():
    code = """
def helper():
    return 42

def solve():
    return 100

solve()
"""
    result = analyze_code(code)
    assert any("helper" in w and "never called" in w for w in result["warnings"])

def test_dead_code_warning():
    code = """
def solve():
    return 100
    print("unreachable")
solve()
"""
    result = analyze_code(code)
    assert any("Dead code detected" in w for w in result["warnings"])

def test_missing_driver_warning():
    code = """
def solve(n):
    return n * 2
"""
    result = analyze_code(code)
    assert any("No active execution driver found" in w for w in result["warnings"])

def test_performance_suggestions():
    # 1. Loop lookup O(N)
    code = """
def check(arr, items):
    for x in arr:
        if x in items:
            print(x)
check([1, 2], [1, 2])
"""
    result = analyze_code(code)
    assert any("Potential O(N) lookup" in s["text"] for s in result["suggestions"])

    # 2. String concat in loop
    code = """
def concat():
    s = ""
    for i in range(10):
        s += str(i)
concat()
"""
    result = analyze_code(code)
    assert any("String concatenation" in s["text"] for s in result["suggestions"])
