import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  MousePointer,
  Square,
  Circle,
  Minus,
  PenTool,
  Type,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  RotateCw,
  Trash2,
  Copy,
  Grid,
  Eye,
  EyeOff,
  Move,
  Layers,
  Sparkles,
  Scissors,
  Check,
  Spline,
  Triangle,
  Ruler,
  Pipette,
  Package,
  Rotate3d,
  Box,
  X,
  Play,
  Pause,
  FastForward,
  RefreshCw
} from 'lucide-react';
import { generateRTEBox } from '../utils/boxDielineGenerator';

/**
 * Prepress Standard Keyline Types
 */
export const KEYLINE_TYPES = [
  { id: 'cut', label: 'Thru-Cut (Die Cut)', color: '#E6007A', dash: '', desc: 'Final perimeter cut line (Solid Magenta)' },
  { id: 'crease', label: 'Crease / Fold / Score', color: '#009EE3', dash: '4,4', desc: 'Score/fold rule (Dashed Cyan)' },
  { id: 'perf', label: 'Perforation (Tear)', color: '#00A651', dash: '2,3', desc: 'Perforation line (Dotted Green)' },
  { id: 'kisscut', label: 'Kiss-Cut (Decal)', color: '#FF6600', dash: '', desc: 'Sticker/label face cut only (Orange)' },
  { id: 'bleed', label: 'Bleed Boundary', color: '#2E3192', dash: '6,3', desc: 'Artwork bleed margin (Navy Blue)' },
  { id: 'safety', label: 'Safety / Margin Area', color: '#F59E0B', dash: '6,2,2,2', desc: 'Critical copy safe boundary (Amber)' },
  { id: 'glue', label: 'Glue / Adhesive Area', color: '#8B5CF6', dash: '', desc: 'Glue flap adhesive zone (Violet)' },
  { id: 'window', label: 'Window Cutout', color: '#06B6D4', dash: '', desc: 'PET/PVC clear window cut (Teal)' },
  { id: 'custom', label: 'Custom Spot Line', color: '#EC4899', dash: '', desc: 'User-specified keyline' },
];

export default function KeylineStudioCanvas({
  sheetWidth = 635,
  sheetHeight = 457.2,
  keylineElements = [],
  setKeylineElements,
  selectedId,
  setSelectedId,
  selectedIds = [],
  setSelectedIds,
  activeTool = 'select',
  setActiveTool,
  currentLineType = 'cut',
  strokeColor = '#E6007A',
  strokeWidth = 1,
  strokeDash = '',
  fillMode = 'none', // 'none' | 'solid' | 'tint' | 'linear' | 'radial' | 'hatch_diagonal' | 'hatch_cross' | 'hatch_dots'
  fillColor = '#FCE7F3',
  fillOpacity = 0.25,
  textString = 'DIE CUT LINE',
  fontSize = 14,
  fontWeight = 'bold',
  textColor = '#E6007A',
  snapToGrid = true,
  gridSize = 5, // mm
  showGrid = true,
  showRulers = true,
  traceThumbnail = null,
  showTrace = true,
  traceOpacity = 0.4,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onDuplicateSelected,
  onDeleteSelected,
  onClearAll,
  onPickColor,
  onOpenBoxModal,
  livePlotTrigger = null
}) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // 3D Folded Carton Simulation HUD Toggle
  const [show3DPreview, setShow3DPreview] = useState(false);

  // Live Re-draw / Laser Plotter Simulation State
  const [isPlotting, setIsPlotting] = useState(false);
  const [plotterState, setPlotterState] = useState(null); // { x, y, active, label }
  const [plotIndex, setPlotIndex] = useState(0);
  const [plotSpeed, setPlotSpeed] = useState(1); // 1 = standard, 2 = fast, 5 = ultra
  const plotTimerRef = useRef(null);
  const targetElementsRef = useRef([]);

  const handleStartLivePlot = useCallback((elementsToDraw = null) => {
    if (plotTimerRef.current) clearInterval(plotTimerRef.current);

    const source = (elementsToDraw && elementsToDraw.length > 0)
      ? elementsToDraw
      : keylineElements;

    if (!source || source.length === 0) return;

    targetElementsRef.current = source;
    setKeylineElements([]);
    setIsPlotting(true);
    setPlotIndex(0);

    let idx = 0;
    const intervalMs = plotSpeed === 5 ? 18 : plotSpeed === 2 ? 40 : 70;

    plotTimerRef.current = setInterval(() => {
      if (idx >= source.length) {
        clearInterval(plotTimerRef.current);
        plotTimerRef.current = null;
        setIsPlotting(false);
        setPlotterState(null);
        return;
      }

      const nextEl = source[idx];
      let targetX = sheetWidth / 2;
      let targetY = sheetHeight / 2;
      if (nextEl.type === 'line' || nextEl.type === 'measure') {
        targetX = nextEl.x2;
        targetY = nextEl.y2;
      } else if (nextEl.type === 'curve') {
        targetX = nextEl.x2;
        targetY = nextEl.y2;
      } else if (nextEl.type === 'rect' || nextEl.type === 'roundrect') {
        targetX = nextEl.x + nextEl.width;
        targetY = nextEl.y + nextEl.height;
      } else if (nextEl.type === 'text') {
        targetX = nextEl.x;
        targetY = nextEl.y;
      }

      setPlotterState({
        x: targetX,
        y: targetY,
        active: true,
        label: nextEl.label || `Drawing ${nextEl.type.toUpperCase()}`
      });

      idx++;
      setPlotIndex(idx);
      setKeylineElements(source.slice(0, idx));
    }, intervalMs);
  }, [keylineElements, sheetWidth, sheetHeight, plotSpeed, setKeylineElements]);

  const handleStopLivePlot = useCallback(() => {
    if (plotTimerRef.current) {
      clearInterval(plotTimerRef.current);
      plotTimerRef.current = null;
    }
    setIsPlotting(false);
    setPlotterState(null);
    if (targetElementsRef.current.length > 0) {
      setKeylineElements(targetElementsRef.current);
    }
  }, [setKeylineElements]);

  // Reactive listener for external trigger from section header
  useEffect(() => {
    if (livePlotTrigger) {
      handleStartLivePlot();
    }
  }, [livePlotTrigger]);

  useEffect(() => {
    return () => {
      if (plotTimerRef.current) clearInterval(plotTimerRef.current);
    };
  }, []);

  // Zoom and Pan State
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Interactive Drag & Draw State
  const [dragMode, setDragMode] = useState(null); // null | 'drawing' | 'moving' | 'resizing' | 'curve_handle' | 'marquee'
  const [dragHandle, setDragHandle] = useState(null); // 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'curve_control' | 'curve_p1' | 'curve_p2'
  const [dragStartPoint, setDragStartPoint] = useState({ x: 0, y: 0 });
  const [currentDrawingShape, setCurrentDrawingShape] = useState(null);
  const [initialElementState, setInitialElementState] = useState(null);
  const [initialMultiState, setInitialMultiState] = useState([]);

  // Marquee Selection Box
  const [selectionBox, setSelectionBox] = useState(null); // { x1, y1, x2, y2 }

  // Inline text editing state
  const [editingTextId, setEditingTextId] = useState(null);
  const [editingTextVal, setEditingTextVal] = useState('');

  // Live mouse coordinates in mm
  const [cursorCoords, setCursorCoords] = useState({ x: 0, y: 0 });

  // Canvas Viewport Layout (padding around physical sheet in mm)
  const pad = 35; // 35mm margin around sheet for rulers, slug, bleed marks
  const vbW = sheetWidth + pad * 2;
  const vbH = sheetHeight + pad * 2;

  // Sync selectedId and selectedIds
  const activeSelectedIds = useMemo(() => {
    if (selectedIds && selectedIds.length > 0) return selectedIds;
    if (selectedId) return [selectedId];
    return [];
  }, [selectedIds, selectedId]);

  // Selected Element (Primary)
  const selectedElement = useMemo(() => {
    return keylineElements.find((el) => el.id === selectedId) || null;
  }, [keylineElements, selectedId]);

  // Convert Client Window coordinates (pixels) to SVG mm coordinates
  const clientToSvgPoint = useCallback((clientX, clientY) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const svgP = pt.matrixTransform(ctm.inverse());

    // Coordinates relative to sheet top-left (0,0 is sheet corner)
    let sheetX = svgP.x - pad;
    let sheetY = svgP.y - pad;

    return { x: sheetX, y: sheetY, rawX: svgP.x, rawY: svgP.y };
  }, [pad]);

  // Apply Snap to Grid
  const snapCoord = useCallback((val) => {
    if (!snapToGrid || gridSize <= 0) return Math.round(val * 10) / 10;
    return Math.round(val / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  // Handle Wheel Zoom
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoom((z) => Math.min(4, Math.max(0.3, z * zoomFactor)));
    }
  };

  // Keyboard Shortcuts (Delete, Nudge, Undo, Redo, Duplicate, Select All, Deselect)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && activeSelectedIds.length > 0) {
        e.preventDefault();
        onDeleteSelected?.();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) onRedo?.();
        else onUndo?.();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        onRedo?.();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd' && activeSelectedIds.length > 0) {
        e.preventDefault();
        onDuplicateSelected?.();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const allIds = keylineElements.map((el) => el.id);
        setSelectedIds?.(allIds);
        if (allIds.length > 0) setSelectedId(allIds[0]);
      } else if (e.key === 'Escape') {
        setSelectedId(null);
        setSelectedIds?.([]);
        setEditingTextId(null);
        setSelectionBox(null);
        setActiveTool('select');
      } else if (activeSelectedIds.length > 0 && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;

        setKeylineElements((prev) =>
          prev.map((el) => {
            if (!activeSelectedIds.includes(el.id)) return el;
            if (el.type === 'line' || el.type === 'measure') {
              return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy };
            }
            if (el.type === 'curve') {
              return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy, cx: el.cx + dx, cy: el.cy + dy };
            }
            if (el.type === 'circle' || el.type === 'ellipse' || el.type === 'polygon') {
              return { ...el, cx: el.cx + dx, cy: el.cy + dy };
            }
            if (el.type === 'freehand') {
              return {
                ...el,
                points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
                minX: el.minX + dx,
                minY: el.minY + dy,
                maxX: el.maxX + dx,
                maxY: el.maxY + dy
              };
            }
            return { ...el, x: el.x + dx, y: el.y + dy };
          })
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSelectedIds, onDeleteSelected, onUndo, onRedo, onDuplicateSelected, setSelectedId, setSelectedIds, setActiveTool, setKeylineElements, keylineElements]);

  // Helper: determine fill attributes
  const getFillProps = useCallback((el) => {
    const mode = el.fillMode || fillMode;
    if (mode === 'none') {
      return { fill: 'none', fillOpacity: 0 };
    }
    if (mode === 'solid') {
      return { fill: el.fillColor || fillColor, fillOpacity: 1 };
    }
    if (mode === 'tint') {
      return { fill: el.fillColor || fillColor, fillOpacity: el.fillOpacity ?? fillOpacity };
    }
    if (mode === 'hatch_diagonal') {
      return { fill: 'url(#cadHatchDiagonal)', fillOpacity: 1 };
    }
    if (mode === 'hatch_cross') {
      return { fill: 'url(#cadHatchCross)', fillOpacity: 1 };
    }
    if (mode === 'hatch_dots') {
      return { fill: 'url(#cadHatchDots)', fillOpacity: 1 };
    }
    if (mode === 'linear') {
      return { fill: 'url(#cadLinearGrad)', fillOpacity: 1 };
    }
    if (mode === 'radial') {
      return { fill: 'url(#cadRadialGrad)', fillOpacity: 1 };
    }
    return { fill: el.fillColor || 'none', fillOpacity: el.fillOpacity ?? 0 };
  }, [fillMode, fillColor, fillOpacity]);

  // Pointer Down on Background Canvas
  const handleCanvasPointerDown = (e) => {
    // Middle mouse button or space triggers pan
    if (e.button === 1 || e.spaceKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    if (e.button !== 0) return; // Only primary click

    const pt = clientToSvgPoint(e.clientX, e.clientY);
    const sx = snapCoord(pt.x);
    const sy = snapCoord(pt.y);

    if (activeTool === 'select') {
      // Clicked on empty canvas -> Start Marquee selection box
      setSelectedId(null);
      setSelectedIds?.([]);
      setDragMode('marquee');
      setDragStartPoint({ x: sx, y: sy });
      setSelectionBox({ x1: sx, y1: sy, x2: sx, y2: sy });
      return;
    }

    if (activeTool === 'eyedropper') {
      // Pick color from canvas or trigger eyedropper
      onPickColor?.(strokeColor);
      return;
    }

    const effFillColor = fillMode === 'none' ? 'none' : fillColor;
    const effFillOpacity = fillMode === 'tint' ? fillOpacity : fillMode === 'solid' ? 1 : 0;
    const newId = `keyline_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    // 1. RECTANGLE
    if (activeTool === 'rect') {
      setDragMode('drawing');
      setDragStartPoint({ x: sx, y: sy });
      setCurrentDrawingShape({
        id: newId,
        type: 'rect',
        x: sx,
        y: sy,
        width: 1,
        height: 1,
        lineType: currentLineType,
        strokeColor,
        strokeWidth: parseFloat(strokeWidth) || 1,
        strokeDash,
        fillMode,
        fillColor: effFillColor,
        fillOpacity: effFillOpacity,
        label: 'Die Cut Box'
      });
    }

    // 2. ROUNDED RECTANGLE
    else if (activeTool === 'roundrect') {
      setDragMode('drawing');
      setDragStartPoint({ x: sx, y: sy });
      setCurrentDrawingShape({
        id: newId,
        type: 'roundrect',
        x: sx,
        y: sy,
        width: 1,
        height: 1,
        rx: 10,
        lineType: currentLineType,
        strokeColor,
        strokeWidth: parseFloat(strokeWidth) || 1,
        strokeDash,
        fillMode,
        fillColor: effFillColor,
        fillOpacity: effFillOpacity,
        label: 'Rounded Die Cut'
      });
    }

    // 3. STRAIGHT LINE
    else if (activeTool === 'line') {
      setDragMode('drawing');
      setDragStartPoint({ x: sx, y: sy });
      setCurrentDrawingShape({
        id: newId,
        type: 'line',
        x1: sx,
        y1: sy,
        x2: sx + 1,
        y2: sy + 1,
        lineType: currentLineType,
        strokeColor,
        strokeWidth: parseFloat(strokeWidth) || 1,
        strokeDash,
        label: 'Score / Fold Line'
      });
    }

    // 4. BÉZIER CURVE / ARC
    else if (activeTool === 'curve') {
      setDragMode('drawing');
      setDragStartPoint({ x: sx, y: sy });
      setCurrentDrawingShape({
        id: newId,
        type: 'curve',
        x1: sx,
        y1: sy,
        x2: sx + 1,
        y2: sy + 1,
        cx: sx,
        cy: sy - 20, // default arched control point
        lineType: currentLineType,
        strokeColor,
        strokeWidth: parseFloat(strokeWidth) || 1,
        strokeDash,
        fillMode,
        fillColor: effFillColor,
        fillOpacity: effFillOpacity,
        label: 'Curved Die Line'
      });
    }

    // 5. CIRCLE / PUNCH HOLE
    else if (activeTool === 'circle') {
      setDragMode('drawing');
      setDragStartPoint({ x: sx, y: sy });
      setCurrentDrawingShape({
        id: newId,
        type: 'circle',
        cx: sx,
        cy: sy,
        r: 1,
        lineType: currentLineType,
        strokeColor,
        strokeWidth: parseFloat(strokeWidth) || 1,
        strokeDash,
        fillMode,
        fillColor: effFillColor,
        fillOpacity: effFillOpacity,
        label: 'Punch Hole'
      });
    }

    // 6. ELLIPSE / OVAL
    else if (activeTool === 'ellipse') {
      setDragMode('drawing');
      setDragStartPoint({ x: sx, y: sy });
      setCurrentDrawingShape({
        id: newId,
        type: 'ellipse',
        cx: sx,
        cy: sy,
        rx: 1,
        ry: 1,
        lineType: currentLineType,
        strokeColor,
        strokeWidth: parseFloat(strokeWidth) || 1,
        strokeDash,
        fillMode,
        fillColor: effFillColor,
        fillOpacity: effFillOpacity,
        label: 'Oval Dieline'
      });
    }

    // 7. POLYGON / TRIANGLE
    else if (activeTool === 'polygon') {
      setDragMode('drawing');
      setDragStartPoint({ x: sx, y: sy });
      setCurrentDrawingShape({
        id: newId,
        type: 'polygon',
        cx: sx,
        cy: sy,
        r: 1,
        sides: 3, // triangle default
        lineType: currentLineType,
        strokeColor,
        strokeWidth: parseFloat(strokeWidth) || 1,
        strokeDash,
        fillMode,
        fillColor: effFillColor,
        fillOpacity: effFillOpacity,
        label: 'Polygon Flap'
      });
    }

    // 8. MEASURE / DIMENSION LINE
    else if (activeTool === 'measure') {
      setDragMode('drawing');
      setDragStartPoint({ x: sx, y: sy });
      setCurrentDrawingShape({
        id: newId,
        type: 'measure',
        x1: sx,
        y1: sy,
        x2: sx + 1,
        y2: sy + 1,
        strokeColor: '#3B82F6',
        strokeWidth: 1,
        strokeDash: '',
        label: 'Dimension Ruler'
      });
    }

    // 9. FREEHAND PEN
    else if (activeTool === 'freehand') {
      setDragMode('drawing');
      setDragStartPoint({ x: sx, y: sy });
      setCurrentDrawingShape({
        id: newId,
        type: 'freehand',
        points: [{ x: sx, y: sy }],
        minX: sx,
        minY: sy,
        maxX: sx,
        maxY: sy,
        lineType: currentLineType,
        strokeColor,
        strokeWidth: parseFloat(strokeWidth) || 1,
        strokeDash,
        fillMode: 'none',
        fillColor: 'none',
        fillOpacity: 0,
        label: 'Freehand Contour'
      });
    }

    // 10. TEXT NOTATION
    else if (activeTool === 'text') {
      const newText = {
        id: newId,
        type: 'text',
        x: sx,
        y: sy,
        text: textString || 'DIE CUT LINE',
        fontSize: parseInt(fontSize, 10) || 14,
        fontWeight: fontWeight || 'bold',
        color: textColor || strokeColor,
        lineType: currentLineType,
        label: 'Annotation'
      };
      setKeylineElements((prev) => [...prev, newText]);
      setSelectedId(newId);
      setSelectedIds?.([newId]);
      setActiveTool('select');
    }
  };

  // Pointer Down on Existing Element (Select & Start Dragging)
  const handleElementPointerDown = (e, element) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    if (activeTool !== 'select') {
      handleCanvasPointerDown(e);
      return;
    }

    const pt = clientToSvgPoint(e.clientX, e.clientY);

    // Multi-select with Shift key
    let newSelectedIds = [];
    if (e.shiftKey) {
      if (activeSelectedIds.includes(element.id)) {
        newSelectedIds = activeSelectedIds.filter((id) => id !== element.id);
      } else {
        newSelectedIds = [...activeSelectedIds, element.id];
      }
    } else {
      newSelectedIds = [element.id];
    }

    setSelectedId(element.id);
    setSelectedIds?.(newSelectedIds);

    setDragMode('moving');
    setDragStartPoint({ x: pt.x, y: pt.y });
    setInitialElementState(JSON.parse(JSON.stringify(element)));

    // Save states of all selected elements for multi-move
    const multiStates = keylineElements
      .filter((el) => newSelectedIds.includes(el.id))
      .map((el) => JSON.parse(JSON.stringify(el)));
    setInitialMultiState(multiStates);
  };

  // Pointer Down on Resize Handle / Control Point
  const handleResizeHandleDown = (e, handle) => {
    e.stopPropagation();
    if (!selectedElement) return;

    const pt = clientToSvgPoint(e.clientX, e.clientY);
    setDragMode(handle.startsWith('curve_') ? 'curve_handle' : 'resizing');
    setDragHandle(handle);
    setDragStartPoint({ x: pt.x, y: pt.y });
    setInitialElementState(JSON.parse(JSON.stringify(selectedElement)));
  };

  // Pointer Move (Drawing, Moving, Resizing, Panning, Marquee)
  const handlePointerMove = (e) => {
    const pt = clientToSvgPoint(e.clientX, e.clientY);
    setCursorCoords({ x: Math.round(pt.x * 10) / 10, y: Math.round(pt.y * 10) / 10 });

    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (!dragMode) return;

    const sx = snapCoord(pt.x);
    const sy = snapCoord(pt.y);

    // ─── 1. DRAWING NEW ELEMENT ───────────────────────────────────────────
    if (dragMode === 'drawing' && currentDrawingShape) {
      if (currentDrawingShape.type === 'rect' || currentDrawingShape.type === 'roundrect') {
        const x = Math.min(dragStartPoint.x, sx);
        const y = Math.min(dragStartPoint.y, sy);
        const w = Math.max(1, Math.abs(sx - dragStartPoint.x));
        const h = Math.max(1, Math.abs(sy - dragStartPoint.y));
        setCurrentDrawingShape((prev) => ({ ...prev, x, y, width: w, height: h }));
      } else if (currentDrawingShape.type === 'line' || currentDrawingShape.type === 'measure') {
        let endX = sx;
        let endY = sy;
        if (e.shiftKey) {
          const dx = Math.abs(endX - dragStartPoint.x);
          const dy = Math.abs(endY - dragStartPoint.y);
          if (dx > dy) endY = dragStartPoint.y;
          else endX = dragStartPoint.x;
        }
        setCurrentDrawingShape((prev) => ({ ...prev, x2: endX, y2: endY }));
      } else if (currentDrawingShape.type === 'curve') {
        let endX = sx;
        let endY = sy;
        if (e.shiftKey) {
          const dx = Math.abs(endX - dragStartPoint.x);
          const dy = Math.abs(endY - dragStartPoint.y);
          if (dx > dy) endY = dragStartPoint.y;
          else endX = dragStartPoint.x;
        }
        // Naturally arched midpoint perpendicular to the line chord
        const midX = (dragStartPoint.x + endX) / 2;
        const midY = (dragStartPoint.y + endY) / 2;
        const dist = Math.hypot(endX - dragStartPoint.x, endY - dragStartPoint.y);
        const archDepth = Math.max(15, dist * 0.25);
        const perpX = -(endY - dragStartPoint.y) / (dist || 1);
        const perpY = (endX - dragStartPoint.x) / (dist || 1);
        const cx = Math.round(midX + perpX * archDepth);
        const cy = Math.round(midY + perpY * archDepth);

        setCurrentDrawingShape((prev) => ({
          ...prev,
          x2: endX,
          y2: endY,
          cx,
          cy
        }));
      } else if (currentDrawingShape.type === 'circle') {
        const r = Math.max(1, Math.round(Math.hypot(sx - dragStartPoint.x, sy - dragStartPoint.y) * 10) / 10);
        setCurrentDrawingShape((prev) => ({ ...prev, r }));
      } else if (currentDrawingShape.type === 'ellipse') {
        const rx = Math.max(1, Math.abs(sx - dragStartPoint.x));
        const ry = Math.max(1, Math.abs(sy - dragStartPoint.y));
        setCurrentDrawingShape((prev) => ({ ...prev, rx, ry }));
      } else if (currentDrawingShape.type === 'polygon') {
        const r = Math.max(1, Math.round(Math.hypot(sx - dragStartPoint.x, sy - dragStartPoint.y) * 10) / 10);
        setCurrentDrawingShape((prev) => ({ ...prev, r }));
      } else if (currentDrawingShape.type === 'freehand') {
        setCurrentDrawingShape((prev) => {
          const lastPt = prev.points[prev.points.length - 1];
          if (Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y) < 1.5) return prev;
          const newPoints = [...prev.points, { x: pt.x, y: pt.y }];
          return {
            ...prev,
            points: newPoints,
            minX: Math.min(prev.minX, pt.x),
            minY: Math.min(prev.minY, pt.y),
            maxX: Math.max(prev.maxX, pt.x),
            maxY: Math.max(prev.maxY, pt.y)
          };
        });
      }
    }

    // ─── 2. MARQUEE SELECTION BOX ─────────────────────────────────────────
    else if (dragMode === 'marquee') {
      setSelectionBox({
        x1: dragStartPoint.x,
        y1: dragStartPoint.y,
        x2: pt.x,
        y2: pt.y
      });
    }

    // ─── 3. CURVE BÉZIER HANDLE DRAGGING ──────────────────────────────────
    else if (dragMode === 'curve_handle' && selectedElement && initialElementState) {
      if (dragHandle === 'curve_control') {
        // Bend the curve directly by moving the control handle!
        setKeylineElements((prev) =>
          prev.map((el) => {
            if (el.id !== selectedElement.id) return el;
            return { ...el, cx: sx, cy: sy };
          })
        );
      } else if (dragHandle === 'curve_p1') {
        setKeylineElements((prev) =>
          prev.map((el) => {
            if (el.id !== selectedElement.id) return el;
            return { ...el, x1: sx, y1: sy };
          })
        );
      } else if (dragHandle === 'curve_p2') {
        setKeylineElements((prev) =>
          prev.map((el) => {
            if (el.id !== selectedElement.id) return el;
            return { ...el, x2: sx, y2: sy };
          })
        );
      }
    }

    // ─── 4. MOVING EXISTING ELEMENT(S) ────────────────────────────────────
    else if (dragMode === 'moving' && selectedElement && initialElementState) {
      const dx = sx - snapCoord(dragStartPoint.x);
      const dy = sy - snapCoord(dragStartPoint.y);

      setKeylineElements((prev) =>
        prev.map((el) => {
          if (!activeSelectedIds.includes(el.id)) return el;
          const init = initialMultiState.find((m) => m.id === el.id) || initialElementState;
          if (el.type === 'line' || el.type === 'measure') {
            return {
              ...el,
              x1: Math.round((init.x1 + dx) * 10) / 10,
              y1: Math.round((init.y1 + dy) * 10) / 10,
              x2: Math.round((init.x2 + dx) * 10) / 10,
              y2: Math.round((init.y2 + dy) * 10) / 10
            };
          }
          if (el.type === 'curve') {
            return {
              ...el,
              x1: Math.round((init.x1 + dx) * 10) / 10,
              y1: Math.round((init.y1 + dy) * 10) / 10,
              x2: Math.round((init.x2 + dx) * 10) / 10,
              y2: Math.round((init.y2 + dy) * 10) / 10,
              cx: Math.round((init.cx + dx) * 10) / 10,
              cy: Math.round((init.cy + dy) * 10) / 10
            };
          }
          if (el.type === 'circle' || el.type === 'ellipse' || el.type === 'polygon') {
            return {
              ...el,
              cx: Math.round((init.cx + dx) * 10) / 10,
              cy: Math.round((init.cy + dy) * 10) / 10
            };
          }
          if (el.type === 'freehand') {
            return {
              ...el,
              points: init.points.map((p) => ({
                x: Math.round((p.x + dx) * 10) / 10,
                y: Math.round((p.y + dy) * 10) / 10
              })),
              minX: init.minX + dx,
              minY: init.minY + dy,
              maxX: init.maxX + dx,
              maxY: init.maxY + dy
            };
          }
          return {
            ...el,
            x: Math.round((init.x + dx) * 10) / 10,
            y: Math.round((init.y + dy) * 10) / 10
          };
        })
      );
    }

    // ─── 5. RESIZING EXISTING ELEMENT ─────────────────────────────────────
    else if (dragMode === 'resizing' && selectedElement && initialElementState && dragHandle) {
      const dx = sx - snapCoord(dragStartPoint.x);
      const dy = sy - snapCoord(dragStartPoint.y);

      setKeylineElements((prev) =>
        prev.map((el) => {
          if (el.id !== selectedElement.id) return el;

          // Corner radius adjustment
          if (dragHandle === 'corner_radius' && el.type === 'roundrect') {
            const rx = Math.max(0, Math.min(50, Math.round((initialElementState.rx || 10) + dx)));
            return { ...el, rx };
          }

          if (el.type === 'rect' || el.type === 'roundrect') {
            let { x, y, width, height } = initialElementState;
            if (dragHandle.includes('e')) width = Math.max(2, initialElementState.width + dx);
            if (dragHandle.includes('s')) height = Math.max(2, initialElementState.height + dy);
            if (dragHandle.includes('w')) {
              const newW = Math.max(2, initialElementState.width - dx);
              x = initialElementState.x + (initialElementState.width - newW);
              width = newW;
            }
            if (dragHandle.includes('n')) {
              const newH = Math.max(2, initialElementState.height - dy);
              y = initialElementState.y + (initialElementState.height - newH);
              height = newH;
            }
            return { ...el, x, y, width, height };
          }

          if (el.type === 'circle') {
            const r = Math.max(2, Math.round(initialElementState.r + Math.max(Math.abs(dx), Math.abs(dy)) * (dragHandle.includes('e') || dragHandle.includes('s') ? 1 : -1)));
            return { ...el, r };
          }

          if (el.type === 'ellipse') {
            let rx = initialElementState.rx;
            let ry = initialElementState.ry;
            if (dragHandle.includes('e') || dragHandle.includes('w')) rx = Math.max(2, initialElementState.rx + Math.abs(dx));
            if (dragHandle.includes('s') || dragHandle.includes('n')) ry = Math.max(2, initialElementState.ry + Math.abs(dy));
            return { ...el, rx, ry };
          }

          if (el.type === 'line' || el.type === 'measure') {
            if (dragHandle === 'line_p1') return { ...el, x1: sx, y1: sy };
            if (dragHandle === 'line_p2') return { ...el, x2: sx, y2: sy };
          }

          return el;
        })
      );
    }
  };

  // Pointer Up (Finalize Action)
  const handlePointerUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    // Finalize drawing shape
    if (dragMode === 'drawing' && currentDrawingShape) {
      let valid = true;
      if (currentDrawingShape.type === 'rect' || currentDrawingShape.type === 'roundrect') {
        valid = currentDrawingShape.width > 2 && currentDrawingShape.height > 2;
      } else if (currentDrawingShape.type === 'circle') {
        valid = currentDrawingShape.r > 2;
      } else if (currentDrawingShape.type === 'ellipse') {
        valid = currentDrawingShape.rx > 2 && currentDrawingShape.ry > 2;
      } else if (currentDrawingShape.type === 'line' || currentDrawingShape.type === 'measure') {
        valid = Math.hypot(currentDrawingShape.x2 - currentDrawingShape.x1, currentDrawingShape.y2 - currentDrawingShape.y1) > 2;
      } else if (currentDrawingShape.type === 'curve') {
        valid = Math.hypot(currentDrawingShape.x2 - currentDrawingShape.x1, currentDrawingShape.y2 - currentDrawingShape.y1) > 2;
      }

      if (valid) {
        setKeylineElements((prev) => [...prev, currentDrawingShape]);
        setSelectedId(currentDrawingShape.id);
        setSelectedIds?.([currentDrawingShape.id]);
      }
      setCurrentDrawingShape(null);
    }

    // Finalize Marquee Selection Box
    if (dragMode === 'marquee' && selectionBox) {
      const minX = Math.min(selectionBox.x1, selectionBox.x2);
      const maxX = Math.max(selectionBox.x1, selectionBox.x2);
      const minY = Math.min(selectionBox.y1, selectionBox.y2);
      const maxY = Math.max(selectionBox.y1, selectionBox.y2);

      // Only select if box has size > 3mm
      if (maxX - minX > 3 || maxY - minY > 3) {
        const found = keylineElements.filter((el) => {
          let b = { x: 0, y: 0, w: 0, h: 0 };
          if (el.type === 'rect' || el.type === 'roundrect' || el.type === 'text') {
            b = { x: el.x, y: el.y, w: el.width || 30, h: el.height || 15 };
          } else if (el.type === 'circle') {
            b = { x: el.cx - el.r, y: el.cy - el.r, w: el.r * 2, h: el.r * 2 };
          } else if (el.type === 'ellipse') {
            b = { x: el.cx - el.rx, y: el.cy - el.ry, w: el.rx * 2, h: el.ry * 2 };
          } else if (el.type === 'line' || el.type === 'curve' || el.type === 'measure') {
            b = {
              x: Math.min(el.x1, el.x2),
              y: Math.min(el.y1, el.y2),
              w: Math.abs(el.x2 - el.x1),
              h: Math.abs(el.y2 - el.y1)
            };
          } else if (el.type === 'freehand') {
            b = { x: el.minX, y: el.minY, w: el.maxX - el.minX, h: el.maxY - el.minY };
          }
          return b.x >= minX - 10 && b.x + b.w <= maxX + 10 && b.y >= minY - 10 && b.y + b.h <= maxY + 10;
        });

        if (found.length > 0) {
          const ids = found.map((f) => f.id);
          setSelectedIds?.(ids);
          setSelectedId(ids[0]);
        }
      }
      setSelectionBox(null);
    }

    setDragMode(null);
    setDragHandle(null);
    setInitialElementState(null);
    setInitialMultiState([]);
  };

  // Generate SVG path for freehand points
  const makeSvgPath = (points) => {
    if (!points || points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y} Z`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  };

  // Generate Polygon points string
  const makePolygonPoints = (cx, cy, r, sides = 3) => {
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      pts.push(`${Math.round((cx + r * Math.cos(angle)) * 10) / 10},${Math.round((cy + r * Math.sin(angle)) * 10) / 10}`);
    }
    return pts.join(' ');
  };

  // Calculate Bounding Box of any Element
  const getElementBBox = (el) => {
    if (!el) return null;
    if (el.type === 'rect' || el.type === 'roundrect') {
      return { x: el.x, y: el.y, width: el.width, height: el.height };
    }
    if (el.type === 'circle') {
      return { x: el.cx - el.r, y: el.cy - el.r, width: el.r * 2, height: el.r * 2 };
    }
    if (el.type === 'ellipse') {
      return { x: el.cx - el.rx, y: el.cy - el.ry, width: el.rx * 2, height: el.ry * 2 };
    }
    if (el.type === 'polygon') {
      return { x: el.cx - el.r, y: el.cy - el.r, width: el.r * 2, height: el.r * 2 };
    }
    if (el.type === 'line' || el.type === 'measure') {
      return {
        x: Math.min(el.x1, el.x2),
        y: Math.min(el.y1, el.y2),
        width: Math.max(1, Math.abs(el.x2 - el.x1)),
        height: Math.max(1, Math.abs(el.y2 - el.y1))
      };
    }
    if (el.type === 'curve') {
      const minX = Math.min(el.x1, el.x2, el.cx);
      const maxX = Math.max(el.x1, el.x2, el.cx);
      const minY = Math.min(el.y1, el.y2, el.cy);
      const maxY = Math.max(el.y1, el.y2, el.cy);
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    if (el.type === 'freehand') {
      return {
        x: el.minX,
        y: el.minY,
        width: Math.max(1, el.maxX - el.minX),
        height: Math.max(1, el.maxY - el.minY)
      };
    }
    if (el.type === 'text') {
      const approxW = (el.text?.length || 8) * (el.fontSize || 14) * 0.6;
      const approxH = (el.fontSize || 14) * 1.2;
      return { x: el.x, y: el.y - approxH, width: approxW, height: approxH };
    }
    return null;
  };

  const selectedBBox = useMemo(() => {
    return getElementBBox(selectedElement);
  }, [selectedElement]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col select-none relative bg-[#13161C] rounded-2xl overflow-hidden"
      onWheel={handleWheel}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* ─── Top Canvas HUD Bar ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1A1F29] border-b border-[#29303D] text-xs font-mono text-slate-300 z-10">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-bold text-fuchsia-400">
            <Scissors className="w-3.5 h-3.5" />
            <span className="uppercase">{activeTool} TOOL</span>
          </span>
          <div className="h-3 w-[1px] bg-white/10" />
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>X:</span>
            <span className="text-white font-bold">{cursorCoords.x} mm</span>
            <span className="ml-2">Y:</span>
            <span className="text-white font-bold">{cursorCoords.y} mm</span>
          </div>
          {activeSelectedIds.length > 1 && (
            <span className="px-2 py-0.5 rounded-full bg-purple-900/60 border border-purple-500 text-purple-200 text-[10px] font-bold">
              {activeSelectedIds.length} Shapes Selected
            </span>
          )}
        </div>

        {/* Zoom & Canvas Actions */}
        <div className="flex items-center gap-1.5">
          {/* Live Redraw / Plotter Simulation Button */}
          {!isPlotting ? (
            <button
              type="button"
              onClick={() => handleStartLivePlot()}
              className="px-2.5 py-1 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-300 hover:text-white text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-emerald-950/50"
              title="Watch the laser cutter / dieline plotter draw the box live stroke by stroke"
            >
              <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
              <span>Re-draw Live</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-slate-900/90 border border-emerald-500/60 rounded-lg p-0.5 shadow-md">
              <span className="text-[10px] font-mono text-emerald-400 font-bold px-1.5 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>Plotting {plotIndex}/{targetElementsRef.current?.length || 50}</span>
              </span>
              <button
                type="button"
                onClick={() => setPlotSpeed((s) => (s === 1 ? 2 : s === 2 ? 5 : 1))}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] font-bold"
                title="Change plotting speed"
              >
                {plotSpeed}x
              </button>
              <button
                type="button"
                onClick={handleStopLivePlot}
                className="px-1.5 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700 text-[9px] font-bold"
                title="Finish plotting immediately"
              >
                Instant
              </button>
            </div>
          )}

          {/* Toggle 3D Folded Box Preview HUD */}
          <button
            type="button"
            onClick={() => setShow3DPreview((v) => !v)}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              show3DPreview
                ? 'bg-purple-600 border-purple-400 text-white shadow-md'
                : 'bg-slate-800/80 border-white/10 text-slate-300 hover:text-white'
            }`}
            title="Toggle 3D Folded Carton Wireframe Preview"
          >
            <Rotate3d className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">3D Box</span>
          </button>

          {/* Quick Box Dieline Wizard button */}
          {onOpenBoxModal && (
            <button
              type="button"
              onClick={onOpenBoxModal}
              className="px-2 py-1 rounded-lg bg-fuchsia-950/80 border border-fuchsia-600/60 text-fuchsia-300 hover:text-white text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
              title="Open Box Dieline CAD Generator Wizard"
            >
              <Package className="w-3.5 h-3.5 text-fuchsia-400" />
              <span className="hidden sm:inline">Box CAD</span>
            </button>
          )}

          <div className="h-4 w-px bg-white/10 mx-0.5" />

          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
            className="p-1 rounded hover:bg-slate-700 text-slate-300"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-bold px-1 min-w-[3rem] text-center text-slate-200">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(4, z + 0.2))}
            className="p-1 rounded hover:bg-slate-700 text-slate-300"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPanOffset({ x: 0, y: 0 });
            }}
            className="p-1 rounded hover:bg-slate-700 text-slate-300"
            title="Fit to Screen (Reset View)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Main Interactive SVG Canvas Viewport ─────────────────────────── */}
      <div className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center">
        {/* Live Plotting Progress Bar Indicator */}
        {isPlotting && (
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#141C2A] z-30 overflow-hidden shadow-md">
            <div
              className="h-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-emerald-400 transition-all duration-75"
              style={{
                width: `${Math.round((plotIndex / Math.max(1, targetElementsRef.current?.length || 50)) * 100)}%`
              }}
            />
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${vbW} ${vbH}`}
          className="w-full h-full max-h-[calc(100vh-210px)] transition-transform duration-75"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: 'center center'
          }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Canvas Press Floor */}
          <rect x="0" y="0" width={vbW} height={vbH} fill="#1E232D" />

          {/* Grid & CAD Patterns Definition */}
          <defs>
            <pattern id="keylineGrid5mm" width="5" height="5" patternUnits="userSpaceOnUse">
              <circle cx="2.5" cy="2.5" r="0.3" fill="rgba(255,255,255,0.08)" />
            </pattern>
            <pattern id="keylineGrid10mm" width="10" height="10" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="10" height="10" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.2" />
            </pattern>

            {/* Packaging CAD Hatch Patterns */}
            <pattern id="cadHatchDiagonal" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#8B5CF6" strokeWidth="1.2" opacity="0.75" />
            </pattern>
            <pattern id="cadHatchCross" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 0 0 L 8 8 M 8 0 L 0 8" stroke="#009EE3" strokeWidth="0.8" opacity="0.6" />
            </pattern>
            <pattern id="cadHatchDots" width="6" height="6" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="1.2" fill="#E6007A" opacity="0.65" />
            </pattern>

            {/* Prepress Linear Gradient */}
            <linearGradient id="cadLinearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E6007A" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#009EE3" stopOpacity="0.8" />
            </linearGradient>

            {/* Prepress Radial Gradient */}
            <radialGradient id="cadRadialGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FCE7F3" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#E6007A" stopOpacity="0.25" />
            </radialGradient>

            {/* Drop Shadow for Sheet Paper */}
            <filter id="sheetShadow" x="-5%" y="-5%" width="110%" height="110%">
              <feDropShadow dx="3" dy="5" stdDeviation="4" floodColor="#000" floodOpacity="0.45" />
            </filter>
          </defs>

          {/* Background Grid Pattern */}
          {showGrid && <rect x="0" y="0" width={vbW} height={vbH} fill="url(#keylineGrid10mm)" />}

          {/* Physical Sheet Paper Bed */}
          <g transform={`translate(${pad}, ${pad})`}>
            {/* Sheet Shadow & White Stock Bed */}
            <rect
              x="0"
              y="0"
              width={sheetWidth}
              height={sheetHeight}
              fill="#FFFFFF"
              filter="url(#sheetShadow)"
              stroke="#CBD5E1"
              strokeWidth="0.5"
            />

            {/* Optional Grid on Paper */}
            {showGrid && (
              <rect
                x="0"
                y="0"
                width={sheetWidth}
                height={sheetHeight}
                fill="url(#keylineGrid5mm)"
                pointerEvents="none"
              />
            )}

            {/* Artwork Tracing Image Layer (from uploaded PDF thumbnail) */}
            {showTrace && traceThumbnail && (
              <image
                href={traceThumbnail}
                x="0"
                y="0"
                width={sheetWidth}
                height={sheetHeight}
                preserveAspectRatio="xMidYMid meet"
                opacity={traceOpacity}
                pointerEvents="none"
              />
            )}

            {/* Sheet Outer Margin Bounds (10mm Prepress Gripper Line) */}
            <rect
              x="10"
              y="10"
              width={Math.max(0, sheetWidth - 20)}
              height={Math.max(0, sheetHeight - 20)}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="0.35"
              strokeDasharray="2,2"
              pointerEvents="none"
            />

            {/* Sheet Centerlines (Fold & Work-and-Turn alignment) */}
            <line
              x1={sheetWidth / 2}
              y1="0"
              x2={sheetWidth / 2}
              y2={sheetHeight}
              stroke="rgba(0,180,255,0.25)"
              strokeWidth="0.4"
              strokeDasharray="3,3"
              pointerEvents="none"
            />
            <line
              x1="0"
              y1={sheetHeight / 2}
              x2={sheetWidth}
              y2={sheetHeight / 2}
              stroke="rgba(0,180,255,0.25)"
              strokeWidth="0.4"
              strokeDasharray="3,3"
              pointerEvents="none"
            />

            {/* ═════════════════════════════════════════════════════════════
                RENDER DRAWN KEYLINE ELEMENTS
               ═════════════════════════════════════════════════════════════ */}
            {keylineElements.map((el) => {
              const isSelected = activeSelectedIds.includes(el.id);
              const fillProps = getFillProps(el);
              const transformAttr = el.rotation ? `rotate(${el.rotation} ${el.x + (el.width || 0) / 2} ${el.y + (el.height || 0) / 2})` : undefined;

              // 1. RECTANGLE
              if (el.type === 'rect') {
                return (
                  <g key={el.id} className="cursor-pointer" transform={transformAttr}>
                    <rect
                      x={el.x}
                      y={el.y}
                      width={el.width}
                      height={el.height}
                      {...fillProps}
                      stroke={el.strokeColor}
                      strokeWidth={el.strokeWidth || 1}
                      strokeDasharray={el.strokeDash || undefined}
                      onPointerDown={(e) => handleElementPointerDown(e, el)}
                    />
                    <text
                      x={el.x + 2}
                      y={el.y - 2}
                      fontSize="7"
                      fontFamily="monospace"
                      fontWeight="bold"
                      fill={el.strokeColor}
                      pointerEvents="none"
                    >
                      {Math.round(el.width)}×{Math.round(el.height)}mm
                    </text>
                  </g>
                );
              }

              // 2. ROUNDED RECTANGLE (CARTON FLAP / BLISTER CARD)
              if (el.type === 'roundrect') {
                return (
                  <g key={el.id} className="cursor-pointer" transform={transformAttr}>
                    <rect
                      x={el.x}
                      y={el.y}
                      width={el.width}
                      height={el.height}
                      rx={el.rx || 8}
                      ry={el.rx || 8}
                      {...fillProps}
                      stroke={el.strokeColor}
                      strokeWidth={el.strokeWidth || 1}
                      strokeDasharray={el.strokeDash || undefined}
                      onPointerDown={(e) => handleElementPointerDown(e, el)}
                    />
                    <text
                      x={el.x + 2}
                      y={el.y - 2}
                      fontSize="7"
                      fontFamily="monospace"
                      fontWeight="bold"
                      fill={el.strokeColor}
                      pointerEvents="none"
                    >
                      {Math.round(el.width)}×{Math.round(el.height)}mm (R{el.rx || 8})
                    </text>
                  </g>
                );
              }

              // 3. CIRCLE / PUNCH HOLE
              if (el.type === 'circle') {
                return (
                  <g key={el.id} className="cursor-pointer">
                    <circle
                      cx={el.cx}
                      cy={el.cy}
                      r={el.r}
                      {...fillProps}
                      stroke={el.strokeColor}
                      strokeWidth={el.strokeWidth || 1}
                      strokeDasharray={el.strokeDash || undefined}
                      onPointerDown={(e) => handleElementPointerDown(e, el)}
                    />
                    {/* Center Crosshair for Punch Holes */}
                    <line
                      x1={el.cx - el.r * 0.4}
                      y1={el.cy}
                      x2={el.cx + el.r * 0.4}
                      y2={el.cy}
                      stroke={el.strokeColor}
                      strokeWidth="0.4"
                      pointerEvents="none"
                    />
                    <line
                      x1={el.cx}
                      y1={el.cy - el.r * 0.4}
                      x2={el.cx}
                      y2={el.cy + el.r * 0.4}
                      stroke={el.strokeColor}
                      strokeWidth="0.4"
                      pointerEvents="none"
                    />
                    <text
                      x={el.cx + el.r + 2}
                      y={el.cy + 2}
                      fontSize="6"
                      fontFamily="monospace"
                      fontWeight="bold"
                      fill={el.strokeColor}
                      pointerEvents="none"
                    >
                      Ø{Math.round(el.r * 2)}mm
                    </text>
                  </g>
                );
              }

              // 4. ELLIPSE / OVAL
              if (el.type === 'ellipse') {
                return (
                  <g key={el.id} className="cursor-pointer">
                    <ellipse
                      cx={el.cx}
                      cy={el.cy}
                      rx={el.rx}
                      ry={el.ry}
                      {...fillProps}
                      stroke={el.strokeColor}
                      strokeWidth={el.strokeWidth || 1}
                      strokeDasharray={el.strokeDash || undefined}
                      onPointerDown={(e) => handleElementPointerDown(e, el)}
                    />
                    <text
                      x={el.cx + el.rx + 2}
                      y={el.cy + 2}
                      fontSize="6"
                      fontFamily="monospace"
                      fontWeight="bold"
                      fill={el.strokeColor}
                      pointerEvents="none"
                    >
                      {Math.round(el.rx * 2)}×{Math.round(el.ry * 2)}mm
                    </text>
                  </g>
                );
              }

              // 5. STRAIGHT LINE
              if (el.type === 'line') {
                const len = Math.round(Math.hypot(el.x2 - el.x1, el.y2 - el.y1));
                const midX = (el.x1 + el.x2) / 2;
                const midY = (el.y1 + el.y2) / 2;
                return (
                  <g key={el.id} className="cursor-pointer">
                    <line
                      x1={el.x1}
                      y1={el.y1}
                      x2={el.x2}
                      y2={el.y2}
                      stroke="transparent"
                      strokeWidth={Math.max(8, (el.strokeWidth || 1) * 3)}
                      onPointerDown={(e) => handleElementPointerDown(e, el)}
                    />
                    <line
                      x1={el.x1}
                      y1={el.y1}
                      x2={el.x2}
                      y2={el.y2}
                      stroke={el.strokeColor}
                      strokeWidth={el.strokeWidth || 1}
                      strokeDasharray={el.strokeDash || undefined}
                      strokeLinecap="round"
                      pointerEvents="none"
                    />
                    <text
                      x={midX}
                      y={midY - 2}
                      fontSize="6"
                      fontFamily="monospace"
                      fontWeight="bold"
                      fill={el.strokeColor}
                      textAnchor="middle"
                      pointerEvents="none"
                    >
                      {len}mm
                    </text>
                  </g>
                );
              }

              // 6. BÉZIER CURVE / ARC
              if (el.type === 'curve') {
                const pathD = `M ${el.x1} ${el.y1} Q ${el.cx} ${el.cy} ${el.x2} ${el.y2}`;
                return (
                  <g key={el.id} className="cursor-pointer">
                    {/* Transparent thick hit area for easy click */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={Math.max(10, (el.strokeWidth || 1) * 3)}
                      onPointerDown={(e) => handleElementPointerDown(e, el)}
                    />
                    <path
                      d={pathD}
                      {...fillProps}
                      stroke={el.strokeColor}
                      strokeWidth={el.strokeWidth || 1}
                      strokeDasharray={el.strokeDash || undefined}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pointerEvents="none"
                    />
                    <text
                      x={el.cx}
                      y={el.cy - 4}
                      fontSize="6"
                      fontFamily="monospace"
                      fontWeight="bold"
                      fill={el.strokeColor}
                      textAnchor="middle"
                      pointerEvents="none"
                    >
                      Arc
                    </text>
                  </g>
                );
              }

              // 7. POLYGON / TRIANGLE / HEXAGON
              if (el.type === 'polygon') {
                const pointsStr = makePolygonPoints(el.cx, el.cy, el.r, el.sides || 3);
                return (
                  <g key={el.id} className="cursor-pointer">
                    <polygon
                      points={pointsStr}
                      {...fillProps}
                      stroke={el.strokeColor}
                      strokeWidth={el.strokeWidth || 1}
                      strokeDasharray={el.strokeDash || undefined}
                      onPointerDown={(e) => handleElementPointerDown(e, el)}
                    />
                  </g>
                );
              }

              // 8. MEASURE / DIMENSION LINE
              if (el.type === 'measure') {
                const len = Math.round(Math.hypot(el.x2 - el.x1, el.y2 - el.y1));
                const midX = (el.x1 + el.x2) / 2;
                const midY = (el.y1 + el.y2) / 2;
                return (
                  <g key={el.id} className="cursor-pointer">
                    <line
                      x1={el.x1}
                      y1={el.y1}
                      x2={el.x2}
                      y2={el.y2}
                      stroke="#3B82F6"
                      strokeWidth="1.2"
                      strokeDasharray="4,2"
                      onPointerDown={(e) => handleElementPointerDown(e, el)}
                    />
                    {/* End Ticks */}
                    <circle cx={el.x1} cy={el.y1} r="2.5" fill="#3B82F6" />
                    <circle cx={el.x2} cy={el.y2} r="2.5" fill="#3B82F6" />
                    {/* Dimension Badge */}
                    <rect
                      x={midX - 22}
                      y={midY - 8}
                      width="44"
                      height="14"
                      rx="3"
                      fill="#1E293B"
                      stroke="#3B82F6"
                      strokeWidth="0.8"
                    />
                    <text
                      x={midX}
                      y={midY + 2}
                      fontSize="7"
                      fontFamily="monospace"
                      fontWeight="bold"
                      fill="#93C5FD"
                      textAnchor="middle"
                    >
                      {len} mm
                    </text>
                  </g>
                );
              }

              // 9. FREEHAND PEN
              if (el.type === 'freehand') {
                return (
                  <path
                    key={el.id}
                    d={makeSvgPath(el.points)}
                    fill={el.fillColor || 'none'}
                    fillOpacity={el.fillOpacity || 0}
                    stroke={el.strokeColor}
                    strokeWidth={el.strokeWidth || 1}
                    strokeDasharray={el.strokeDash || undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="cursor-pointer"
                    onPointerDown={(e) => handleElementPointerDown(e, el)}
                  />
                );
              }

              // 10. TEXT NOTATION
              if (el.type === 'text') {
                return (
                  <g key={el.id} className="cursor-pointer">
                    <text
                      x={el.x}
                      y={el.y}
                      fill={el.color || el.strokeColor || '#E6007A'}
                      fontSize={el.fontSize || 14}
                      fontWeight={el.fontWeight || 'bold'}
                      fontFamily="monospace"
                      onPointerDown={(e) => handleElementPointerDown(e, el)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingTextId(el.id);
                        setEditingTextVal(el.text);
                      }}
                    >
                      {el.text}
                    </text>
                  </g>
                );
              }

              return null;
            })}

            {/* ─── Live CAD Plotter / Laser Cutting Head Indicator ────────────── */}
            {plotterState?.active && (
              <g transform={`translate(${plotterState.x}, ${plotterState.y})`} className="pointer-events-none z-50">
                {/* Glowing Laser Halo */}
                <circle r="14" fill="none" stroke="#E6007A" strokeWidth="1" strokeDasharray="3,2" className="animate-spin" />
                <circle r="6" fill="rgba(230, 0, 122, 0.35)" stroke="#E6007A" strokeWidth="1.5" />
                <circle r="2" fill="#FFFFFF" />
                {/* Laser Crosshairs */}
                <line x1="-16" y1="0" x2="-8" y2="0" stroke="#E6007A" strokeWidth="1.5" />
                <line x1="8" y1="0" x2="16" y2="0" stroke="#E6007A" strokeWidth="1.5" />
                <line x1="0" y1="-16" x2="0" y2="-8" stroke="#E6007A" strokeWidth="1.5" />
                <line x1="0" y1="8" x2="0" y2="16" stroke="#E6007A" strokeWidth="1.5" />
                {/* Plotter Tooltip Badge */}
                <g transform="translate(14, -12)">
                  <rect x="0" y="0" width="135" height="18" rx="4" fill="#0F172A" stroke="#E6007A" strokeWidth="0.8" opacity="0.95" />
                  <text x="6" y="12" fill="#F472B6" fontSize="8" fontFamily="monospace" fontWeight="bold">
                    {plotterState.label || 'LASER PLOTTER'}
                  </text>
                </g>
              </g>
            )}

            {/* ═════════════════════════════════════════════════════════════
                RENDER CURRENTLY DRAWING SHAPE (LIVE PREVIEW)
               ═════════════════════════════════════════════════════════════ */}
            {dragMode === 'drawing' && currentDrawingShape && (
              <g className="pointer-events-none opacity-85">
                {(currentDrawingShape.type === 'rect' || currentDrawingShape.type === 'roundrect') && (
                  <rect
                    x={currentDrawingShape.x}
                    y={currentDrawingShape.y}
                    width={currentDrawingShape.width}
                    height={currentDrawingShape.height}
                    rx={currentDrawingShape.rx || 0}
                    ry={currentDrawingShape.rx || 0}
                    fill={currentDrawingShape.fillColor || 'none'}
                    fillOpacity={currentDrawingShape.fillOpacity || 0.25}
                    stroke={currentDrawingShape.strokeColor}
                    strokeWidth={currentDrawingShape.strokeWidth || 1}
                    strokeDasharray={currentDrawingShape.strokeDash || undefined}
                  />
                )}
                {currentDrawingShape.type === 'circle' && (
                  <circle
                    cx={currentDrawingShape.cx}
                    cy={currentDrawingShape.cy}
                    r={currentDrawingShape.r}
                    fill={currentDrawingShape.fillColor || 'none'}
                    fillOpacity={currentDrawingShape.fillOpacity || 0.25}
                    stroke={currentDrawingShape.strokeColor}
                    strokeWidth={currentDrawingShape.strokeWidth || 1}
                    strokeDasharray={currentDrawingShape.strokeDash || undefined}
                  />
                )}
                {currentDrawingShape.type === 'ellipse' && (
                  <ellipse
                    cx={currentDrawingShape.cx}
                    cy={currentDrawingShape.cy}
                    rx={currentDrawingShape.rx}
                    ry={currentDrawingShape.ry}
                    fill={currentDrawingShape.fillColor || 'none'}
                    fillOpacity={currentDrawingShape.fillOpacity || 0.25}
                    stroke={currentDrawingShape.strokeColor}
                    strokeWidth={currentDrawingShape.strokeWidth || 1}
                  />
                )}
                {(currentDrawingShape.type === 'line' || currentDrawingShape.type === 'measure') && (
                  <line
                    x1={currentDrawingShape.x1}
                    y1={currentDrawingShape.y1}
                    x2={currentDrawingShape.x2}
                    y2={currentDrawingShape.y2}
                    stroke={currentDrawingShape.strokeColor}
                    strokeWidth={currentDrawingShape.strokeWidth || 1}
                    strokeDasharray={currentDrawingShape.strokeDash || undefined}
                  />
                )}
                {currentDrawingShape.type === 'curve' && (
                  <path
                    d={`M ${currentDrawingShape.x1} ${currentDrawingShape.y1} Q ${currentDrawingShape.cx} ${currentDrawingShape.cy} ${currentDrawingShape.x2} ${currentDrawingShape.y2}`}
                    fill="none"
                    stroke={currentDrawingShape.strokeColor}
                    strokeWidth={currentDrawingShape.strokeWidth || 1}
                    strokeDasharray="4,2"
                  />
                )}
                {currentDrawingShape.type === 'polygon' && (
                  <polygon
                    points={makePolygonPoints(currentDrawingShape.cx, currentDrawingShape.cy, currentDrawingShape.r, currentDrawingShape.sides || 3)}
                    fill={currentDrawingShape.fillColor || 'none'}
                    fillOpacity={currentDrawingShape.fillOpacity || 0.25}
                    stroke={currentDrawingShape.strokeColor}
                    strokeWidth={currentDrawingShape.strokeWidth || 1}
                  />
                )}
                {currentDrawingShape.type === 'freehand' && (
                  <path
                    d={makeSvgPath(currentDrawingShape.points)}
                    fill="none"
                    stroke={currentDrawingShape.strokeColor}
                    strokeWidth={currentDrawingShape.strokeWidth || 1}
                  />
                )}
              </g>
            )}

            {/* ═════════════════════════════════════════════════════════════
                MARQUEE SELECTION RECTANGLE
               ═════════════════════════════════════════════════════════════ */}
            {dragMode === 'marquee' && selectionBox && (
              <rect
                x={Math.min(selectionBox.x1, selectionBox.x2)}
                y={Math.min(selectionBox.y1, selectionBox.y2)}
                width={Math.abs(selectionBox.x2 - selectionBox.x1)}
                height={Math.abs(selectionBox.y2 - selectionBox.y1)}
                fill="rgba(217, 70, 239, 0.12)"
                stroke="#D946EF"
                strokeWidth="1"
                strokeDasharray="4,3"
                pointerEvents="none"
              />
            )}

            {/* ═════════════════════════════════════════════════════════════
                INTERACTIVE BÉZIER CURVE HANDLES (ARC FLEXING ENGINE)
               ═════════════════════════════════════════════════════════════ */}
            {selectedElement && selectedElement.type === 'curve' && (
              <g className="keyline-curve-controls">
                {/* Guidelines connecting arc handle to endpoints */}
                <line
                  x1={selectedElement.x1}
                  y1={selectedElement.y1}
                  x2={selectedElement.cx}
                  y2={selectedElement.cy}
                  stroke="rgba(236, 72, 153, 0.5)"
                  strokeWidth="0.8"
                  strokeDasharray="3,3"
                  pointerEvents="none"
                />
                <line
                  x1={selectedElement.cx}
                  y1={selectedElement.cy}
                  x2={selectedElement.x2}
                  y2={selectedElement.y2}
                  stroke="rgba(236, 72, 153, 0.5)"
                  strokeWidth="0.8"
                  strokeDasharray="3,3"
                  pointerEvents="none"
                />

                {/* Endpoint 1 handle */}
                <circle
                  cx={selectedElement.x1}
                  cy={selectedElement.y1}
                  r="4"
                  fill="#FFFFFF"
                  stroke="#EC4899"
                  strokeWidth="1.5"
                  className="cursor-move"
                  onPointerDown={(e) => handleResizeHandleDown(e, 'curve_p1')}
                />
                {/* Endpoint 2 handle */}
                <circle
                  cx={selectedElement.x2}
                  cy={selectedElement.y2}
                  r="4"
                  fill="#FFFFFF"
                  stroke="#EC4899"
                  strokeWidth="1.5"
                  className="cursor-move"
                  onPointerDown={(e) => handleResizeHandleDown(e, 'curve_p2')}
                />

                {/* DYNAMIC ARC CONTROL POINT (Drag to bend curve in real-time!) */}
                <g
                  transform={`translate(${selectedElement.cx}, ${selectedElement.cy})`}
                  className="cursor-pointer"
                  onPointerDown={(e) => handleResizeHandleDown(e, 'curve_control')}
                >
                  <circle r="6" fill="#EC4899" stroke="#FFFFFF" strokeWidth="2" className="animate-pulse shadow-xl" />
                  <rect
                    x="-28"
                    y="-20"
                    width="56"
                    height="12"
                    rx="3"
                    fill="#18181B"
                    stroke="#EC4899"
                    strokeWidth="0.8"
                  />
                  <text
                    x="0"
                    y="-11"
                    fontSize="6"
                    fontFamily="monospace"
                    fontWeight="bold"
                    fill="#F472B6"
                    textAnchor="middle"
                  >
                    BEND CURVE
                  </text>
                </g>
              </g>
            )}

            {/* ═════════════════════════════════════════════════════════════
                INTERACTIVE LINE ENDPOINT HANDLES
               ═════════════════════════════════════════════════════════════ */}
            {selectedElement && (selectedElement.type === 'line' || selectedElement.type === 'measure') && (
              <g className="keyline-line-handles">
                <circle
                  cx={selectedElement.x1}
                  cy={selectedElement.y1}
                  r="4"
                  fill="#FFFFFF"
                  stroke="#3B82F6"
                  strokeWidth="1.5"
                  className="cursor-move"
                  onPointerDown={(e) => handleResizeHandleDown(e, 'line_p1')}
                />
                <circle
                  cx={selectedElement.x2}
                  cy={selectedElement.y2}
                  r="4"
                  fill="#FFFFFF"
                  stroke="#3B82F6"
                  strokeWidth="1.5"
                  className="cursor-move"
                  onPointerDown={(e) => handleResizeHandleDown(e, 'line_p2')}
                />
              </g>
            )}

            {/* ═════════════════════════════════════════════════════════════
                BOUNDING BOX & 8-POINT RESIZE HANDLES
               ═════════════════════════════════════════════════════════════ */}
            {selectedElement && selectedBBox && selectedElement.type !== 'line' && selectedElement.type !== 'curve' && selectedElement.type !== 'measure' && (
              <g className="keyline-selection-box">
                {/* Dashed Selection Bounding Box */}
                <rect
                  x={selectedBBox.x - 2}
                  y={selectedBBox.y - 2}
                  width={selectedBBox.width + 4}
                  height={selectedBBox.height + 4}
                  fill="none"
                  stroke="#A855F7"
                  strokeWidth="0.8"
                  strokeDasharray="4,3"
                  pointerEvents="none"
                />

                {/* 8 Bounding Box Resize Handles */}
                {[
                  { id: 'nw', x: selectedBBox.x - 2, y: selectedBBox.y - 2, cursor: 'nwse-resize' },
                  { id: 'n', x: selectedBBox.x + selectedBBox.width / 2, y: selectedBBox.y - 2, cursor: 'ns-resize' },
                  { id: 'ne', x: selectedBBox.x + selectedBBox.width + 2, y: selectedBBox.y - 2, cursor: 'nesw-resize' },
                  { id: 'e', x: selectedBBox.x + selectedBBox.width + 2, y: selectedBBox.y + selectedBBox.height / 2, cursor: 'ew-resize' },
                  { id: 'se', x: selectedBBox.x + selectedBBox.width + 2, y: selectedBBox.y + selectedBBox.height + 2, cursor: 'nwse-resize' },
                  { id: 's', x: selectedBBox.x + selectedBBox.width / 2, y: selectedBBox.y + selectedBBox.height + 2, cursor: 'ns-resize' },
                  { id: 'sw', x: selectedBBox.x - 2, y: selectedBBox.y + selectedBBox.height + 2, cursor: 'nesw-resize' },
                  { id: 'w', x: selectedBBox.x - 2, y: selectedBBox.y + selectedBBox.height / 2, cursor: 'ew-resize' }
                ].map((h) => (
                  <rect
                    key={h.id}
                    x={h.x - 3}
                    y={h.y - 3}
                    width="6"
                    height="6"
                    fill="#FFFFFF"
                    stroke="#A855F7"
                    strokeWidth="1.2"
                    style={{ cursor: h.cursor }}
                    onPointerDown={(e) => handleResizeHandleDown(e, h.id)}
                  />
                ))}

                {/* Corner Radius Handle for Rounded Rectangles */}
                {selectedElement.type === 'roundrect' && (
                  <circle
                    cx={selectedBBox.x + (selectedElement.rx || 10)}
                    cy={selectedBBox.y + (selectedElement.rx || 10)}
                    r="4"
                    fill="#F59E0B"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    className="cursor-pointer"
                    title="Drag to change corner radius"
                    onPointerDown={(e) => handleResizeHandleDown(e, 'corner_radius')}
                  />
                )}
              </g>
            )}
          </g>
        </svg>

        {/* ─── Floating 3D Folded Carton Simulation HUD ───────────────────── */}
        {show3DPreview && (
          <div className="absolute bottom-4 right-4 z-40 bg-[#0B0F19]/95 backdrop-blur-md border border-purple-500/50 rounded-2xl p-3.5 shadow-2xl w-80 space-y-2.5 font-mono text-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                <Rotate3d className="w-4 h-4 text-purple-400" />
                <span>3D FOLDED CARTON SIMULATION</span>
              </div>
              <button
                type="button"
                onClick={() => setShow3DPreview(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3D Isometric SVG Rendering */}
            <div className="w-full h-44 bg-[#060911] rounded-xl flex items-center justify-center overflow-hidden border border-white/5 relative">
              <svg viewBox="-110 -90 220 180" className="w-full h-full">
                <defs>
                  <linearGradient id="hudTopGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#4C1D95" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#312E81" stopOpacity="0.95" />
                  </linearGradient>
                  <linearGradient id="hudFrontGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#2E1065" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0.9" />
                  </linearGradient>
                  <linearGradient id="hudSideGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#1E1B4B" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#0F172A" stopOpacity="0.95" />
                  </linearGradient>
                </defs>

                {/* Top Lid */}
                <polygon points="0,-40 60,-5 0,30 -60,-5" fill="url(#hudTopGrad)" stroke="#E6007A" strokeWidth="1.2" />
                {/* Front Panel */}
                <polygon points="0,30 60,-5 60,55 0,90" fill="url(#hudFrontGrad)" stroke="#E6007A" strokeWidth="1.5" />
                {/* Side Panel */}
                <polygon points="0,30 -60,-5 -60,55 0,90" fill="url(#hudSideGrad)" stroke="#009EE3" strokeWidth="1.2" />
                {/* Crease score */}
                <line x1="0" y1="30" x2="0" y2="90" stroke="#009EE3" strokeWidth="1.5" strokeDasharray="3,2" />
                
                {/* Labels */}
                <text x="30" y="45" fill="#F43F5E" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">FRONT</text>
                <text x="-30" y="45" fill="#38BDF8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">SIDE</text>
                <text x="0" y="-8" fill="#F472B6" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">TOP LID</text>
              </svg>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
              <span>Folded Packaging Simulation</span>
              {onOpenBoxModal && (
                <button
                  type="button"
                  onClick={onOpenBoxModal}
                  className="text-fuchsia-400 hover:text-fuchsia-300 underline cursor-pointer font-bold"
                >
                  Adjust Size
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── Non-intrusive Blank Canvas Ready Hint ────────────────────────── */}
        {keylineElements.length === 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-20">
            <div className="bg-[#0E1422]/90 backdrop-blur-md border border-cyan-500/30 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>
                <strong className="text-white">Blank Prepress Canvas</strong> • Select a tool to draw freeform or use <strong className="text-cyan-300">Insert by Dimensions</strong> on the left.
              </span>
            </div>
          </div>
        )}

        {/* ─── Real-Time CAD Coordinates & Dimension Status Bar ─────────────── */}
        <div className="absolute bottom-2 left-3 right-3 pointer-events-none z-20 flex items-center justify-between text-[11px] font-mono text-slate-400 bg-[#0B0F19]/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/5">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="text-slate-500">Cursor:</span>
              <span className="text-cyan-300 font-bold">X: {cursorCoords.x} mm</span>
              <span className="text-slate-600">|</span>
              <span className="text-cyan-300 font-bold">Y: {cursorCoords.y} mm</span>
            </span>
            {selectedElement && (
              <span className="flex items-center gap-1.5 text-fuchsia-300">
                <span className="text-slate-500">Selected:</span>
                <span className="font-bold uppercase">[{selectedElement.type}]</span>
                <span>
                  Pos: ({Math.round((selectedElement.x ?? selectedElement.cx ?? selectedElement.x1 ?? 0) * 10) / 10},{' '}
                  {Math.round((selectedElement.y ?? selectedElement.cy ?? selectedElement.y1 ?? 0) * 10) / 10} mm)
                </span>
                {(selectedElement.width !== undefined && selectedElement.height !== undefined) && (
                  <span>
                    Size: {Math.round(selectedElement.width * 10) / 10} × {Math.round(selectedElement.height * 10) / 10} mm
                  </span>
                )}
                {selectedElement.r !== undefined && (
                  <span>Radius: {Math.round(selectedElement.r * 10) / 10} mm</span>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-slate-500">
            <span>Sheet: {sheetWidth} × {sheetHeight} mm</span>
            <span>•</span>
            <span>Zoom: {Math.round(zoom * 100)}%</span>
            <span>•</span>
            <span>Snap: {snapToGrid ? `${gridSize}mm` : 'OFF'}</span>
          </div>
        </div>
      </div>

      {/* Inline Text Editor Modal / Popover */}
      {editingTextId && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181F2C] border border-[#2B3B52] p-4 rounded-xl shadow-2xl max-w-sm w-full space-y-3 font-mono">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider m-0">Edit Text Notation</h4>
            <input
              type="text"
              value={editingTextVal}
              onChange={(e) => setEditingTextVal(e.target.value)}
              className="w-full bg-[#10141D] border border-[#2B3B52] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-fuchsia-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setKeylineElements((prev) =>
                    prev.map((el) => (el.id === editingTextId ? { ...el, text: editingTextVal } : el))
                  );
                  setEditingTextId(null);
                } else if (e.key === 'Escape') {
                  setEditingTextId(null);
                }
              }}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingTextId(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setKeylineElements((prev) =>
                    prev.map((el) => (el.id === editingTextId ? { ...el, text: editingTextVal } : el))
                  );
                  setEditingTextId(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
