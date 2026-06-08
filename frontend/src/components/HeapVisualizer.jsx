import React, { useMemo, useState, useRef, useEffect } from "react";
import { GitCommit, ZoomIn, ZoomOut, Maximize2, Sparkles } from "lucide-react";
import { resolveValueString } from "./VariableList";

export default function HeapVisualizer({ variables, heap }) {
  // Zoom & Pan canvas states
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  // Wheel zoom helper centered at mouse cursor coordinates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const zoomIntensity = 0.04;
      
      setZoom((prevZoom) => {
        let nextZoom = prevZoom;
        if (e.deltaY < 0) {
          nextZoom = Math.min(2.0, prevZoom + zoomIntensity);
        } else {
          nextZoom = Math.max(0.4, prevZoom - zoomIntensity);
        }

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        setPan((prevPan) => {
          const canvasMouseX = (mouseX - prevPan.x) / prevZoom;
          const canvasMouseY = (mouseY - prevPan.y) / prevZoom;
          return {
            x: mouseX - canvasMouseX * nextZoom,
            y: mouseY - canvasMouseY * nextZoom
          };
        });

        return nextZoom;
      });
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // Canvas Drag Pan Handlers
  const handleMouseDown = (e) => {
    if (e.target.closest(".node-card") || e.target.closest("button")) return; // Don't drag when clicking active elements
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom(z => Math.min(2.0, z + 0.1));
  const handleZoomOut = () => setZoom(z => Math.max(0.4, z - 0.1));
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleDoubleClick = (e) => {
    if (e.target.closest(".node-card") || e.target.closest("button")) return;
    handleZoomReset();
  };

  // 1. Gather all custom objects in the heap
  const nodes = useMemo(() => {
    const customNodes = {};
    if (!heap) return customNodes;
    
    Object.entries(heap).forEach(([id, obj]) => {
      if (obj && obj.type === "object") {
        customNodes[id] = {
          id,
          className: obj.class,
          fields: obj.value,
          incomingRefs: [],
          outgoingRefs: {},
        };
      }
    });

    // Link references between nodes
    Object.entries(customNodes).forEach(([id, node]) => {
      Object.entries(node.fields).forEach(([fieldName, val]) => {
        if (val && typeof val === "object" && val.type === "ref") {
          const targetId = val.id;
          if (customNodes[targetId]) {
            node.outgoingRefs[fieldName] = targetId;
            customNodes[targetId].incomingRefs.push({
              sourceId: id,
              field: fieldName,
            });
          }
        }
      });
    });

    return customNodes;
  }, [heap]);

  // 2. Identify variables that reference these nodes directly
  const pointerLabels = useMemo(() => {
    const labels = {};
    if (!variables) return labels;

    Object.entries(variables).forEach(([varName, val]) => {
      if (val && typeof val === "object" && val.type === "ref") {
        const targetId = val.id;
        if (nodes[targetId]) {
          if (!labels[targetId]) {
            labels[targetId] = [];
          }
          labels[targetId].push(varName);
        }
      }
    });

    return labels;
  }, [variables, nodes]);

  // 3. Compute layout coordinates (Linked lists horizontal/Binary Trees vertical tree)
  const layout = useMemo(() => {
    const coords = {};
    const nodeIds = Object.keys(nodes);
    if (nodeIds.length === 0) return coords;

    // A. Detect Binary Trees
    const hasTreeStructure = nodeIds.some(id => {
      const node = nodes[id];
      return "left" in node.fields || "right" in node.fields;
    });

    if (hasTreeStructure) {
      const roots = nodeIds.filter(id => {
        const node = nodes[id];
        return node.incomingRefs.length === 0;
      });

      const mainRoots = roots.length > 0 ? roots : [nodeIds[0]];
      let startX = 250; // middle alignment
      
      const positionTreeNode = (nodeId, x, y, levelOffset) => {
        if (!nodeId || coords[nodeId]) return;
        coords[nodeId] = { x, y };

        const node = nodes[nodeId];
        const leftId = node.outgoingRefs["left"];
        const rightId = node.outgoingRefs["right"];

        if (leftId) {
          positionTreeNode(leftId, x - levelOffset, y + 120, levelOffset * 0.5);
        }
        if (rightId) {
          positionTreeNode(rightId, x + levelOffset, y + 120, levelOffset * 0.5);
        }
      };

      mainRoots.forEach((rootId, idx) => {
        positionTreeNode(rootId, startX + idx * 320, 40, 140);
      });

      let index = 0;
      nodeIds.forEach(id => {
        if (!coords[id]) {
          coords[id] = { x: 50 + index * 160, y: 340 };
          index++;
        }
      });

      return coords;
    }

    // B. Detect Linked Lists
    const hasListStructure = nodeIds.some(id => {
      const node = nodes[id];
      return "next" in node.fields;
    });

    if (hasListStructure) {
      const heads = nodeIds.filter(id => {
        const node = nodes[id];
        return !node.incomingRefs.some(ref => ref.field === "next");
      });

      const mainHeads = heads.length > 0 ? heads : [nodeIds[0]];
      const visited = new Set();
      let row = 0;

      mainHeads.forEach(headId => {
        let currId = headId;
        let col = 0;
        
        while (currId && !visited.has(currId) && nodes[currId]) {
          visited.add(currId);
          coords[currId] = {
            x: col * 190 + 50,
            y: row * 140 + 50
          };
          currId = nodes[currId].outgoingRefs["next"];
          col++;
        }
        row++;
      });

      let index = 0;
      nodeIds.forEach(id => {
        if (!coords[id]) {
          coords[id] = { x: 50 + index * 190, y: row * 140 + 50 };
          index++;
        }
      });

      return coords;
    }

    // C. Fallback: Grid coordinates
    const cols = 4;
    nodeIds.forEach((id, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      coords[id] = {
        x: col * 190 + 50,
        y: row * 140 + 50
      };
    });

    return coords;
  }, [nodes]);

  // Render curved connection SVG lines
  const connections = useMemo(() => {
    const list = [];
    Object.entries(nodes).forEach(([sourceId, node]) => {
      Object.entries(node.outgoingRefs).forEach(([field, targetId]) => {
        const start = layout[sourceId];
        const end = layout[targetId];
        if (start && end) {
          list.push({
            id: `${sourceId}-${field}-${targetId}`,
            sourceId,
            targetId,
            field,
            startX: start.x,
            startY: start.y,
            endX: end.x,
            endY: end.y,
          });
        }
      });
    });
    return list;
  }, [nodes, layout]);

  const nodeIds = Object.keys(nodes);

  // Bounds for canvas container
  const canvasWidth = (nodeIds.length > 0 ? Math.max(...Object.values(layout).map(c => c.x), 500) : 500) + 180;
  const canvasHeight = (nodeIds.length > 0 ? Math.max(...Object.values(layout).map(c => c.y), 240) : 240) + 120;

  return (
    <div className="w-full h-full relative overflow-hidden bg-dark-950 border border-white/5 rounded-2xl flex flex-col">
      {/* Zoom / Pan Actions HUD */}
      {nodeIds.length > 0 && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-45 bg-dark-900/90 backdrop-blur px-2.5 py-1.5 rounded-xl border border-white/5 shadow-premium select-none">
          <button
            onClick={handleZoomIn}
            className="p-1 text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 rounded-lg transition duration-150 cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn size={12} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1 text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 rounded-lg transition duration-150 cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut size={12} />
          </button>
          <button
            onClick={handleZoomReset}
            className="p-1 text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 rounded-lg transition duration-150 cursor-pointer"
            title="Reset Zoom & Pan"
          >
            <Maximize2 size={12} />
          </button>
          <span className="text-[8px] font-bold text-slate-500 font-mono select-none w-8 text-center border-l border-white/5 ml-1 pl-1">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      )}

      {/* Grid Canvas */}
      <div
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        className={`flex-1 overflow-hidden relative dot-grid select-none ${
          nodeIds.length > 0 ? "cursor-grab" : ""
        } ${isDragging ? "cursor-grabbing" : ""}`}
      >
        {nodeIds.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center py-14 border border-dashed border-white/5 rounded-2xl bg-dark-900/10 select-none">
            <GitCommit size={22} className="text-slate-600 mb-2 animate-pulse" />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider opacity-65">
              No active heap nodes detected in memory.
            </span>
          </div>
        ) : (
          /* Transform Scale Pan Layer */
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "top left",
              width: canvasWidth,
              height: canvasHeight,
            }}
            className={`relative ${
              isDragging ? "" : "transition-transform duration-300 ease-out"
            }`}
          >
            {/* SVG Connection Lines Overlay */}
            <svg
              className="absolute inset-0 pointer-events-none w-full h-full"
              style={{ zIndex: 1 }}
            >
              <defs>
                <marker
                  id="arrowhead-premium"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#3b82f6" />
                </marker>
              </defs>

              {connections.map((conn) => {
                const nodeW = 140;
                const nodeH = 76;
                const dx = conn.endX - conn.startX;
                const dy = conn.endY - conn.startY;

                let x1 = conn.startX + nodeW / 2;
                let y1 = conn.startY + nodeH / 2;
                let x2 = conn.endX + nodeW / 2;
                let y2 = conn.endY + nodeH / 2;

                if (Math.abs(dx) > Math.abs(dy)) {
                  if (dx > 0) {
                    x1 = conn.startX + nodeW;
                    y1 = conn.startY + nodeH / 2;
                    x2 = conn.endX;
                    y2 = conn.endY + nodeH / 2;
                  } else {
                    x1 = conn.startX;
                    y1 = conn.startY + nodeH / 2;
                    x2 = conn.endX + nodeW;
                    y2 = conn.endY + nodeH / 2;
                  }
                } else {
                  if (dy > 0) {
                    x1 = conn.startX + nodeW / 2;
                    y1 = conn.startY + nodeH;
                    x2 = conn.endX + nodeW / 2;
                    y2 = conn.endY;
                  } else {
                    x1 = conn.startX + nodeW / 2;
                    y1 = conn.startY;
                    x2 = conn.endX + nodeW / 2;
                    y2 = conn.endY + nodeH;
                  }
                }

                // Curved bezier link calculation
                const controlOffset = Math.min(100, Math.abs(dx || dy) * 0.4);
                const isHorizontal = Math.abs(dx) > Math.abs(dy);
                const qx1 = isHorizontal ? x1 + controlOffset * Math.sign(dx) : x1;
                const qy1 = isHorizontal ? y1 : y1 + controlOffset * Math.sign(dy);
                const qx2 = isHorizontal ? x2 - controlOffset * Math.sign(dx) : x2;
                const qy2 = isHorizontal ? y2 : y2 - controlOffset * Math.sign(dy);

                const pathD = `M ${x1} ${y1} C ${qx1} ${qy1}, ${qx2} ${qy2}, ${x2} ${y2}`;
                const textX = (x1 + x2) / 2;
                const textY = (y1 + y2) / 2 - 4;

                return (
                  <g key={conn.id}>
                    {/* Subtle Glow Underlay Path */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="rgba(59, 130, 246, 0.1)"
                      strokeWidth="3.5"
                    />
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#3b82f6" /* Brand blue connection lines */
                      strokeWidth="1.25"
                      markerEnd="url(#arrowhead-premium)"
                    />
                    <rect
                      x={textX - 14}
                      y={textY - 6}
                      width="28"
                      height="9"
                      fill="var(--bg-base, #0b0f19)"
                      rx="3"
                      className="stroke-white/5 stroke-[0.5px]"
                    />
                    <text
                      x={textX}
                      y={textY}
                      fill="#3b82f6"
                      fontSize="6.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="select-none uppercase"
                    >
                      {conn.field}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Node Cards */}
            {Object.entries(nodes).map(([id, node]) => {
              const coord = layout[id] || { x: 50, y: 50 };
              const labels = pointerLabels[id] || [];
              const isActive = labels.length > 0;

              return (
                <div
                  key={id}
                  style={{
                    position: "absolute",
                    left: coord.x,
                    top: coord.y,
                    width: 140,
                    height: 76,
                    zIndex: 10,
                  }}
                  className={`node-card bg-dark-900 border rounded-xl shadow-premium flex flex-col justify-between overflow-hidden text-[9px] font-mono group transition-all duration-300 ${
                    isActive
                      ? "border-brand-cyan/60 shadow-glow-cyan active-execution-glow"
                      : "border-white/5 hover:border-brand-blue/30"
                  }`}
                >
                  {/* Floating pointer name tags */}
                  {labels.length > 0 && (
                    <div className="absolute -top-[14px] left-0 flex gap-0.5 max-w-[140px] overflow-hidden truncate">
                      {labels.map((lbl) => (
                        <span
                          key={lbl}
                          className="px-1.5 py-0.5 bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan rounded text-[7.5px] font-bold uppercase shadow-sm flex items-center gap-0.5 shrink-0"
                        >
                          <Sparkles size={7} className="animate-pulse" />
                          <span>{lbl}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Node Type and ID Header */}
                  <div className="px-2 py-1 bg-dark-950/80 border-b border-white/5 text-[8px] font-extrabold text-brand-blue flex justify-between items-center select-none">
                    <span className="truncate max-w-[70px]">{node.className}</span>
                    <span className="text-[6.5px] text-slate-500 font-bold">
                      id:{id.slice(-3)}
                    </span>
                  </div>

                  {/* Fields details */}
                  <div className="p-1.5 flex-1 flex flex-col justify-center gap-0.5 bg-dark-900/20">
                    {Object.entries(node.fields).map(([field, val]) => {
                      const isRef = val && typeof val === "object" && val.type === "ref";
                      const resolvedStr = isRef
                        ? `ref(id:${val.id.slice(-3)})`
                        : resolveValueString(val, heap);

                      return (
                        <div
                          key={field}
                          className="flex justify-between items-center text-[8.5px] leading-tight"
                          title={`${field}: ${resolvedStr}`}
                        >
                          <span className="text-slate-500 font-bold select-none">
                            {field}:
                          </span>
                          <span
                            className={`truncate max-w-[76px] font-semibold text-right ${
                              isRef ? "text-brand-purple" : "text-emerald-400"
                            }`}
                          >
                            {resolvedStr}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
