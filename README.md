# Python DSA Visualizer

A premium, production-quality full-stack code execution debugger and algorithm visualizer modeled after Python Tutor, specialized for Data Structures and Algorithms (DSA) education.

This system executes user-submitted Python code inside a restricted sandbox, traces execution line-by-line using `sys.settrace()`, and yields a high-fidelity trace array representing local variables, recursion stacks, and reference graphs (Linked Lists, Binary Trees, general objects). The frontend features a VS Code-inspired dark mode layout complete with Monco Editor execution line highlights, automatic memory heap layout rendering, step-by-step navigation, autoplay controls, and animated array blocks.

---

## Key Features

1. **Restricted Exec Sandboxing**: Custom whitelist of builtin operations combined with an import override hook, restricting scripts to standard DSA helper libraries (`math`, `collections`, `heapq`, `bisect`, `random`, `itertools`, `functools`) and preventing system access (`os`, `subprocess`, file reading).
2. **Loop & Time Limits**: In-line step counter (max 1000 steps) and execution timer (max 2 seconds) embedded inside the trace callback, immediately aborting infinite loops with customized exception handling.
3. **Automatic Heap Graph Layouts**:
   - **Linked Lists**: Automatically detects object chains (nodes containing `next` attributes) and positions nodes horizontally, linking them with pointing SVG connection lines.
   - **Binary Trees**: Identifies hierarchical trees (nodes containing `left` and `right` attributes), computes coordinates recursively in a balanced tree graph, and draws SVG parent-child lines.
   - **General References**: Grid layouts mapping custom user classes and lists to distinct reference values inside a virtual heap.
4. **Pointer Sync Labels**: Scans active local scope variables and attaches name badges (e.g. `[head, curr]`) to corresponding heap nodes, showing pointers traversing structures dynamically.
5. **Interactive Controls**: Play, pause, timeline scrub, variable value change highlights, recursion depth bars, and adjustable speeds (0.5x, 1x, 2x).

---

## Project Architecture

```
python-dsa-visualizer/
│
├── backend/
│   ├── main.py            # FastAPI entry point & CORS configuration
│   ├── tracer.py          # Line-by-line tracing core using sys.settrace()
│   ├── sandbox.py         # Sandbox environment configuration & whitelists
│   ├── serializers.py     # High-fidelity memory scope & heap serializer
│   ├── models.py          # Pydantic request & response schemas
│   └── requirements.txt   # Python dependencies
│
└── frontend/
    ├── package.json       # React, Monaco, Framer Motion, Tailwind CSS
    ├── index.html         # HTML layout with SEO meta configuration
    ├── tailwind.config.js # Tailwind CSS design tokens
    └── src/
        ├── main.jsx       # App bootstrap
        ├── index.css      # Core styles & custom glassmorphism rules
        ├── App.jsx        # Dashboard grid controller & state synchronizer
        ├── components/
        │   ├── EditorPanel.jsx      # Monaco Editor wrapper with line highlighting
        │   ├── StepControls.jsx     # Playback controls and timeline scrubbing
        │   ├── VariableList.jsx     # Primitive variables lists with change highlights
        │   ├── StackFrames.jsx      # Call stack and recursion depth inspector
        │   ├── ArrayVisualizer.jsx  # Framer Motion sequence array boxes
        │   ├── HeapVisualizer.jsx   # Binary Tree & Linked List graph canvas
        │   └── TerminalConsole.jsx  # Cumulative stdout logger terminal
        ├── services/
        │   └── api.js               # API fetch integrations
        └── constants/
            └── examples.js          # Preloaded algorithms library
```

---

## API Specification

### Execute Trace
- **Endpoint**: `POST /api/visualize`
- **Headers**: `Content-Type: application/json`
- **Request Payload**:
  ```json
  {
    "code": "x = 10\ny = 20\nprint(x + y)",
    "max_steps": 1000,
    "timeout": 2.0
  }
  ```
- **Response Payload**:
  ```json
  {
    "success": true,
    "trace": [
      {
        "step": 1,
        "line": 1,
        "event": "line",
        "scopes": [
          {
            "name": "<module>",
            "line": 1,
            "variables": {}
          }
        ],
        "heap": {},
        "stdout": "",
        "timestamp": 1717700000.123
      },
      {
        "step": 2,
        "line": 2,
        "event": "line",
        "scopes": [
          {
            "name": "<module>",
            "line": 2,
            "variables": {
              "x": 10
            }
          }
        ],
        "heap": {},
        "stdout": "",
        "timestamp": 1717700000.125
      }
    ],
    "error": null
  }
  ```

---

## Installation & Setup

### Prerequisites
- Python 3.8 or higher installed on your machine
- Node.js 18 or higher (with `npm`)

### 1. Backend Server Setup
From the project root, navigate to the `backend/` folder and install requirements:
```bash
cd backend
python -m pip install -r requirements.txt
```

Start the FastAPI development server:
```bash
python main.py
# or
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```
The API is active at `http://localhost:8001`.

### 2. Frontend Development Setup
Navigate to the `frontend/` folder:
```bash
cd ../frontend
npm install
```

Start the Vite development dev server:
```bash
npm run dev
```
Open your browser and navigate to the displayed host (usually `http://localhost:5173`).

---

## Verification & Testing
To verify the installation:
1. Select one of the preloaded algorithm examples (e.g. **Bubble Sort** or **Linked List**) from the select dropdown.
2. Click the blue **Visualize** button.
3. Use the playback panel below the variables list to step forward, backwards, play auto-simulations, adjust speeds, or scrub the execution timeline.
4. Verify variables that change are highlighted in light blue, array indices swap positions, and custom list nodes align horizontally with linking SVG arrows.
