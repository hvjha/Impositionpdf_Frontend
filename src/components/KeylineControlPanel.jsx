import React, { useState } from 'react';
import {
  MousePointer,
  Square,
  Minus,
  Circle,
  PenTool,
  Type,
  Palette,
  Scissors,
  Layers,
  Sparkles,
  Move,
  Trash2,
  Copy,
  RotateCcw,
  RotateCw,
  Download,
  Grid,
  Eye,
  EyeOff,
  Sliders,
  Maximize2,
  FileText,
  Package,
  Plus,
  Check,
  Compass,
  Spline,
  Triangle,
  Ruler,
  Pipette,
  FlipHorizontal,
  FlipVertical,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Lock,
  Unlock,
  Droplet,
  Sun,
  BookOpen,
  Folder,
  Tag,
  FolderOpen
} from 'lucide-react';
import { KEYLINE_TYPES } from './KeylineStudioCanvas';
import {
  generateBoxDieline,
  generateRTEBox,
  generateSTEBox,
  generatePillowBox,
  generateMailerBox,
  BOX_PRESETS
} from '../utils/boxDielineGenerator';
import {
  generateBookCover,
  generatePocketFolder,
  generateTriFoldBrochure,
  generateHangtag,
  DIELINE_CATEGORIES,
  ALL_DIELINE_PRESETS
} from '../utils/dielineTemplates';

export default function KeylineControlPanel({
  activeTool,
  setActiveTool,
  currentLineType,
  setCurrentLineType,
  strokeColor,
  setStrokeColor,
  strokeWidth,
  setStrokeWidth,
  strokeDash,
  setStrokeDash,
  fillMode,
  setFillMode,
  fillColor,
  setFillColor,
  fillOpacity,
  setFillOpacity,
  textString,
  setTextString,
  fontSize,
  setFontSize,
  fontWeight,
  setFontWeight,
  textColor,
  setTextColor,
  snapToGrid,
  setSnapToGrid,
  gridSize,
  setGridSize,
  showGrid,
  setShowGrid,
  showRulers,
  setShowRulers,
  showTrace,
  setShowTrace,
  traceOpacity,
  setTraceOpacity,
  keylineElements,
  setKeylineElements,
  selectedId,
  setSelectedId,
  selectedIds = [],
  setSelectedIds,
  selectedElement,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onDuplicateSelected,
  onDeleteSelected,
  onClearAll,
  sheetWidth,
  sheetHeight,
  onSendToImposition,
  onExportSVG,
  onOpenBoxModal,
  onOpenNewDesignModal,
  onOpenSavedLibrary,
  savedDesignsCount = 0
}) {
  const [activeTab, setActiveTab] = useState('TOOLS'); // 'TOOLS' | 'TRANSFORM' | 'TEMPLATES' | 'LAYERS'
  const [templateCategory, setTemplateCategory] = useState('ALL');

  // CAD Precision Shape Builder State (Insert by exact dimensions & position)
  const [builderShape, setBuilderShape] = useState('rect'); // 'rect' | 'crease' | 'cut_line' | 'roundrect' | 'circle'
  const [builderX, setBuilderX] = useState(50);
  const [builderY, setBuilderY] = useState(50);
  const [builderW, setBuilderW] = useState(148);
  const [builderH, setBuilderH] = useState(210);
  const [builderRadius, setBuilderRadius] = useState(8);
  const [builderLineType, setBuilderLineType] = useState('cut');
  const [builderLabel, setBuilderLabel] = useState('Book Cover / Panel');
  const [isBuilderExpanded, setIsBuilderExpanded] = useState(true);

  // Custom User Saved Swatches
  const [customSwatches, setCustomSwatches] = useState([
    '#E6007A', '#009EE3', '#00A651', '#FF6600', '#2E3192', '#8B5CF6'
  ]);

  // Standard Swatches for Stroke (10 Prepress Spot Inks)
  const PREPRESS_SPOT_INKS = [
    { name: 'Thru-Cut (Die)', color: '#E6007A', type: 'cut', dash: '' },
    { name: 'Crease (Score)', color: '#009EE3', type: 'crease', dash: '4,4' },
    { name: 'Perf (Tear)', color: '#00A651', type: 'perf', dash: '2,3' },
    { name: 'Kiss-Cut', color: '#FF6600', type: 'kisscut', dash: '' },
    { name: 'Bleed Boundary', color: '#2E3192', type: 'bleed', dash: '6,3' },
    { name: 'Safety Margin', color: '#F59E0B', type: 'safety', dash: '6,2,2,2' },
    { name: 'Glue Flap Zone', color: '#8B5CF6', type: 'glue', dash: '' },
    { name: 'Gold Hot Foil', color: '#D97706', type: 'custom', dash: '' },
    { name: 'Spot UV Varnish', color: '#059669', type: 'custom', dash: '' },
    { name: 'Window Cutout', color: '#06B6D4', type: 'window', dash: '' },
    { name: 'Pure White', color: '#FFFFFF', type: 'custom', dash: '' },
    { name: 'Key Black', color: '#000000', type: 'custom', dash: '' }
  ];

  // Standard Swatches for Fill
  const FILL_SWATCHES = [
    { name: 'Soft Magenta', color: '#FCE7F3' },
    { name: 'Soft Cyan', color: '#E0F2FE' },
    { name: 'Soft Emerald', color: '#DCFCE7' },
    { name: 'Soft Amber', color: '#FEF3C7' },
    { name: 'Soft Violet', color: '#EDE9FE' },
    { name: 'Soft Gold', color: '#FEF08A' },
    { name: 'Light Slate', color: '#F1F5F9' },
    { name: 'Pure White', color: '#FFFFFF' }
  ];

  // Quick Prepress Text Stamps
  const TEXT_STAMPS = [
    'DIE CUT LINE',
    'CREASE / SCORE',
    'PERFORATION 50%',
    'GLUE TAB 15mm',
    'SAFETY MARGIN',
    'BLEED 3mm',
    'WINDOW CUT',
    'FOLD HERE',
    'THUMB NOTCH',
    'VARNISH FREE'
  ];

  // Handle Eyedropper API
  const handleEyedropper = async (target = 'stroke') => {
    if (window.EyeDropper) {
      try {
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        if (result.sRGBHex) {
          if (target === 'stroke') {
            setStrokeColor(result.sRGBHex);
            if (selectedId) updateSelectedProperty('strokeColor', result.sRGBHex);
          } else {
            setFillColor(result.sRGBHex);
            if (selectedId) updateSelectedProperty('fillColor', result.sRGBHex);
          }
        }
      } catch (err) {
        // user dismissed eyedropper
      }
    } else {
      setActiveTool('eyedropper');
    }
  };

  // Add current color to custom swatches
  const handleAddCustomSwatch = (color) => {
    if (!customSwatches.includes(color)) {
      setCustomSwatches((prev) => [...prev, color]);
    }
  };

  // Swap Stroke and Fill colors
  const handleSwapStrokeFill = () => {
    const tempStroke = strokeColor;
    setStrokeColor(fillColor);
    setFillColor(tempStroke);
    if (selectedId) {
      setKeylineElements((prev) =>
        prev.map((el) => {
          if (el.id !== selectedId) return el;
          return { ...el, strokeColor: el.fillColor || strokeColor, fillColor: el.strokeColor };
        })
      );
    }
  };

  // Update selected element property directly
  const updateSelectedProperty = (key, value) => {
    if (!selectedId) return;
    setKeylineElements((prev) =>
      prev.map((el) => {
        if (el.id !== selectedId) return el;
        return { ...el, [key]: value };
      })
    );
  };

  // ─── DIRECT POSITION & DIMENSION EDITING ─────────────────────────────────
  // Set Position of Selected Element directly on X or Y axis
  const handleSetSelectedPosition = (axis, val) => {
    const num = parseFloat(val);
    if (isNaN(num) || !selectedElement) return;

    setKeylineElements((prev) =>
      prev.map((el) => {
        if (el.id !== selectedId) return el;
        if (axis === 'x') {
          const currentX = el.x ?? el.cx ?? el.x1 ?? 0;
          const dx = num - currentX;
          if (el.type === 'line' || el.type === 'measure') {
            return { ...el, x1: num, x2: el.x2 + dx };
          }
          if (el.type === 'curve') {
            return { ...el, x1: num, x2: el.x2 + dx, cx: el.cx + dx };
          }
          if (el.type === 'circle' || el.type === 'ellipse' || el.type === 'polygon') {
            return { ...el, cx: num };
          }
          return { ...el, x: num };
        } else {
          const currentY = el.y ?? el.cy ?? el.y1 ?? 0;
          const dy = num - currentY;
          if (el.type === 'line' || el.type === 'measure') {
            return { ...el, y1: num, y2: el.y2 + dy };
          }
          if (el.type === 'curve') {
            return { ...el, y1: num, y2: el.y2 + dy, cy: el.cy + dy };
          }
          if (el.type === 'circle' || el.type === 'ellipse' || el.type === 'polygon') {
            return { ...el, cy: num };
          }
          return { ...el, y: num };
        }
      })
    );
  };

  // Set Dimensions of Selected Element directly (width, height, radius)
  const handleSetSelectedDimension = (dim, val) => {
    const num = Math.max(1, parseFloat(val) || 1);
    if (!selectedElement) return;

    setKeylineElements((prev) =>
      prev.map((el) => {
        if (el.id !== selectedId) return el;
        if (dim === 'width') {
          if (el.type === 'rect' || el.type === 'roundrect') return { ...el, width: num };
          if (el.type === 'line' || el.type === 'measure') return { ...el, x2: el.x1 + num };
          if (el.type === 'circle') return { ...el, r: num / 2 };
          if (el.type === 'ellipse') return { ...el, rx: num / 2 };
        } else if (dim === 'height') {
          if (el.type === 'rect' || el.type === 'roundrect') return { ...el, height: num };
          if (el.type === 'line' || el.type === 'measure') return { ...el, y2: el.y1 + num };
          if (el.type === 'circle') return { ...el, r: num / 2 };
          if (el.type === 'ellipse') return { ...el, ry: num / 2 };
        } else if (dim === 'r') {
          return { ...el, r: num, rx: num };
        }
        return el;
      })
    );
  };

  // Nudge Position by exact mm
  const handleNudgePosition = (dx, dy) => {
    if (!selectedElement) return;
    setKeylineElements((prev) =>
      prev.map((el) => {
        if (el.id !== selectedId) return el;
        if (el.type === 'line' || el.type === 'measure') {
          return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy };
        }
        if (el.type === 'curve') {
          return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy, cx: el.cx + dx, cy: el.cy + dy };
        }
        if (el.type === 'circle' || el.type === 'ellipse' || el.type === 'polygon') {
          return { ...el, cx: el.cx + dx, cy: el.cy + dy };
        }
        return { ...el, x: (el.x || 0) + dx, y: (el.y || 0) + dy };
      })
    );
  };

  // Insert Custom Dimensioned Shape (Direct CAD Creation)
  const handleInsertCustomDimensionedShape = (centerOnSheet = false) => {
    const id = `cad_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const w = Math.max(1, parseFloat(builderW) || 148);
    const h = Math.max(1, parseFloat(builderH) || 210);
    let posX = parseFloat(builderX) || 0;
    let posY = parseFloat(builderY) || 0;

    if (centerOnSheet) {
      posX = Math.round(Math.max(10, (sheetWidth - w) / 2));
      posY = Math.round(Math.max(10, (sheetHeight - h) / 2));
    }

    const strokeInfo = PREPRESS_SPOT_INKS.find((i) => i.type === builderLineType) || {
      color: '#E6007A',
      dash: ''
    };

    let newShape;
    if (builderShape === 'rect') {
      newShape = {
        id,
        type: 'rect',
        x: posX,
        y: posY,
        width: w,
        height: h,
        strokeColor: strokeInfo.color,
        strokeWidth: 1,
        strokeDash: strokeInfo.dash,
        lineType: builderLineType,
        fillMode: 'none',
        label: builderLabel || `Panel (${w}×${h}mm)`
      };
    } else if (builderShape === 'roundrect') {
      newShape = {
        id,
        type: 'roundrect',
        x: posX,
        y: posY,
        width: w,
        height: h,
        rx: parseFloat(builderRadius) || 8,
        strokeColor: strokeInfo.color,
        strokeWidth: 1,
        strokeDash: strokeInfo.dash,
        lineType: builderLineType,
        fillMode: 'none',
        label: builderLabel || `Rounded Box (${w}×${h}mm)`
      };
    } else if (builderShape === 'crease') {
      newShape = {
        id,
        type: 'line',
        x1: posX,
        y1: posY,
        x2: posX,
        y2: posY + h,
        strokeColor: '#009EE3',
        strokeWidth: 1,
        strokeDash: '4,4',
        lineType: 'crease',
        label: builderLabel || `Fold Crease (${h}mm)`
      };
    } else if (builderShape === 'cut_line') {
      newShape = {
        id,
        type: 'line',
        x1: posX,
        y1: posY,
        x2: posX + w,
        y2: posY,
        strokeColor: '#E6007A',
        strokeWidth: 1,
        strokeDash: '',
        lineType: 'cut',
        label: builderLabel || `Cut Line (${w}mm)`
      };
    } else if (builderShape === 'circle') {
      const radius = w / 2;
      newShape = {
        id,
        type: 'circle',
        cx: posX + radius,
        cy: posY + radius,
        r: radius,
        strokeColor: strokeInfo.color,
        strokeWidth: 1,
        strokeDash: strokeInfo.dash,
        lineType: builderLineType,
        fillMode: 'none',
        label: builderLabel || `Hole (Ø${w}mm)`
      };
    }

    setKeylineElements((prev) => [...prev, newShape]);
    setSelectedId(id);
    setSelectedIds([id]);
    setActiveTab('TRANSFORM');
  };

  // ─── CURVE BENDING CONTROLS ─────────────────────────────────────────────
  // Bends the curve by shifting its control point perpendicular to chord
  const handleSetCurveArcDepth = (depthMM) => {
    if (!selectedElement || selectedElement.type !== 'curve') return;
    const { x1, y1, x2, y2 } = selectedElement;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const dist = Math.hypot(x2 - x1, y2 - y1) || 1;
    const perpX = -(y2 - y1) / dist;
    const perpY = (x2 - x1) / dist;
    const cx = Math.round((midX + perpX * depthMM) * 10) / 10;
    const cy = Math.round((midY + perpY * depthMM) * 10) / 10;

    setKeylineElements((prev) =>
      prev.map((el) => (el.id === selectedId ? { ...el, cx, cy } : el))
    );
  };

  // Convert a straight line into a curved Bézier arc
  const handleConvertLineToCurve = () => {
    if (!selectedElement || selectedElement.type !== 'line') return;
    const { x1, y1, x2, y2 } = selectedElement;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const dist = Math.hypot(x2 - x1, y2 - y1) || 1;
    const perpX = -(y2 - y1) / dist;
    const perpY = (x2 - x1) / dist;
    const cx = Math.round(midX + perpX * 25);
    const cy = Math.round(midY + perpY * 25);

    setKeylineElements((prev) =>
      prev.map((el) => {
        if (el.id !== selectedId) return el;
        return {
          ...el,
          type: 'curve',
          cx,
          cy,
          label: 'Curved Arc'
        };
      })
    );
  };

  // ─── ALIGNMENT & DISTRIBUTION ───────────────────────────────────────────
  const activeIds = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);

  const handleAlign = (type) => {
    if (activeIds.length === 0) return;

    if (type === 'center_sheet') {
      // Center selected elements directly on physical sheet
      setKeylineElements((prev) => {
        const targets = prev.filter((el) => activeIds.includes(el.id));
        if (targets.length === 0) return prev;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        targets.forEach((el) => {
          const x = el.x ?? el.cx ?? el.x1 ?? 0;
          const y = el.y ?? el.cy ?? el.y1 ?? 0;
          const w = el.width ?? (el.r ? el.r * 2 : (el.rx ? el.rx * 2 : Math.abs((el.x2 || 0) - (el.x1 || 0))));
          const h = el.height ?? (el.r ? el.r * 2 : (el.ry ? el.ry * 2 : Math.abs((el.y2 || 0) - (el.y1 || 0))));
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x + w);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y + h);
        });
        const groupCenterX = (minX + maxX) / 2;
        const groupCenterY = (minY + maxY) / 2;
        const targetCenterX = sheetWidth / 2;
        const targetCenterY = sheetHeight / 2;
        const dx = Math.round(targetCenterX - groupCenterX);
        const dy = Math.round(targetCenterY - groupCenterY);

        return prev.map((el) => {
          if (!activeIds.includes(el.id)) return el;
          if (el.type === 'line' || el.type === 'measure') {
            return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy };
          }
          if (el.type === 'curve') {
            return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy, cx: el.cx + dx, cy: el.cy + dy };
          }
          if (el.type === 'circle' || el.type === 'ellipse' || el.type === 'polygon') {
            return { ...el, cx: el.cx + dx, cy: el.cy + dy };
          }
          return { ...el, x: (el.x || 0) + dx, y: (el.y || 0) + dy };
        });
      });
      return;
    }

    if (activeIds.length < 2) return;

    setKeylineElements((prev) => {
      const targets = prev.filter((el) => activeIds.includes(el.id));
      const minX = Math.min(...targets.map((el) => el.x ?? el.cx ?? el.x1 ?? 0));
      const maxX = Math.max(...targets.map((el) => (el.x ?? el.cx ?? el.x2 ?? 0) + (el.width || 0)));
      const minY = Math.min(...targets.map((el) => el.y ?? el.cy ?? el.y1 ?? 0));
      const maxY = Math.max(...targets.map((el) => (el.y ?? el.cy ?? el.y2 ?? 0) + (el.height || 0)));
      const avgCenterX = (minX + maxX) / 2;
      const avgCenterY = (minY + maxY) / 2;

      return prev.map((el) => {
        if (!activeIds.includes(el.id)) return el;
        if (type === 'left') {
          if (el.type === 'circle' || el.type === 'ellipse') return { ...el, cx: minX + (el.r || el.rx) };
          return { ...el, x: minX, x1: minX, x2: minX + Math.abs((el.x2 || 0) - (el.x1 || 0)) };
        }
        if (type === 'right') {
          if (el.type === 'circle' || el.type === 'ellipse') return { ...el, cx: maxX - (el.r || el.rx) };
          return { ...el, x: maxX - (el.width || 0) };
        }
        if (type === 'center_h') {
          if (el.type === 'circle' || el.type === 'ellipse') return { ...el, cx: avgCenterX };
          return { ...el, x: avgCenterX - (el.width || 0) / 2 };
        }
        if (type === 'top') {
          if (el.type === 'circle' || el.type === 'ellipse') return { ...el, cy: minY + (el.r || el.ry) };
          return { ...el, y: minY, y1: minY };
        }
        if (type === 'bottom') {
          if (el.type === 'circle' || el.type === 'ellipse') return { ...el, cy: maxY - (el.r || el.ry) };
          return { ...el, y: maxY - (el.height || 0) };
        }
        if (type === 'center_v') {
          if (el.type === 'circle' || el.type === 'ellipse') return { ...el, cy: avgCenterY };
          return { ...el, y: avgCenterY - (el.height || 0) / 2 };
        }
        return el;
      });
    });
  };

  // ─── ROTATION & FLIP ────────────────────────────────────────────────────
  const handleRotate = (angleDelta) => {
    if (!selectedId) return;
    setKeylineElements((prev) =>
      prev.map((el) => {
        if (el.id !== selectedId) return el;
        const currentRot = el.rotation || 0;
        return { ...el, rotation: (currentRot + angleDelta) % 360 };
      })
    );
  };

  const handleFlip = (axis = 'h') => {
    if (!selectedElement) return;
    setKeylineElements((prev) =>
      prev.map((el) => {
        if (el.id !== selectedId) return el;
        if (el.type === 'line' || el.type === 'measure') {
          if (axis === 'h') return { ...el, x1: el.x2, x2: el.x1 };
          return { ...el, y1: el.y2, y2: el.y1 };
        }
        if (el.type === 'curve') {
          if (axis === 'h') return { ...el, x1: el.x2, x2: el.x1, cx: el.x1 + el.x2 - el.cx };
          return { ...el, y1: el.y2, y2: el.y1, cy: el.y1 + el.y2 - el.cy };
        }
        return el;
      })
    );
  };

  // ─── LAYER REORDERING ───────────────────────────────────────────────────
  const handleLayerOrder = (direction) => {
    if (!selectedId) return;
    setKeylineElements((prev) => {
      const idx = prev.findIndex((el) => el.id === selectedId);
      if (idx === -1) return prev;
      const clone = [...prev];
      const target = clone.splice(idx, 1)[0];

      if (direction === 'top') clone.push(target);
      else if (direction === 'bottom') clone.unshift(target);
      else if (direction === 'up') clone.splice(Math.min(clone.length, idx + 1), 0, target);
      else if (direction === 'down') clone.splice(Math.max(0, idx - 1), 0, target);

      return clone;
    });
  };

  // ─── PREPRESS DIELINE TEMPLATES ─────────────────────────────────────────
  const handleInsertRTEBoxTemplate = () => {
    const res = generateRTEBox(sheetWidth, sheetHeight, { length: 70, width: 40, height: 120 });
    setKeylineElements(res.elements);
  };

  const handleInsertSTEBoxTemplate = () => {
    const res = generateSTEBox(sheetWidth, sheetHeight, { length: 70, width: 40, height: 120 });
    setKeylineElements(res.elements);
  };

  const handleInsertPillowBoxTemplate = () => {
    const res = generatePillowBox(sheetWidth, sheetHeight, { length: 120, width: 75 });
    setKeylineElements(res.elements);
  };

  const handleInsertMailerBoxTemplate = () => {
    const res = generateMailerBox(sheetWidth, sheetHeight, { length: 160, width: 110, height: 50 });
    setKeylineElements(res.elements);
  };

  const handleInsertHeaderCard = () => {
    const startX = Math.round((sheetWidth - 160) / 2);
    const startY = Math.round((sheetHeight - 100) / 2);
    const idBase = `hdr_${Date.now()}`;

    const elements = [
      { id: `${idBase}_body`, type: 'roundrect', x: startX, y: startY, width: 160, height: 100, rx: 6, strokeColor: '#E6007A', strokeWidth: 1, strokeDash: '', fillMode: 'none', label: 'Header Card' },
      { id: `${idBase}_score`, type: 'line', x1: startX, y1: startY + 50, x2: startX + 160, y2: startY + 50, strokeColor: '#009EE3', strokeWidth: 1, strokeDash: '4,4', label: 'Center Fold' },
      { id: `${idBase}_euro`, type: 'roundrect', x: startX + 65, y: startY + 20, width: 30, height: 10, rx: 5, strokeColor: '#E6007A', strokeWidth: 1, strokeDash: '', fillMode: 'none', label: 'Euro Slot' }
    ];
    setKeylineElements((prev) => [...prev, ...elements]);
  };

  const handleInsertThumbNotch = () => {
    const cx = Math.round(sheetWidth / 2);
    const cy = Math.round(sheetHeight / 2);
    const idBase = `notch_${Date.now()}`;

    const notch = {
      id: `${idBase}_arc`,
      type: 'curve',
      x1: cx - 20,
      y1: cy,
      x2: cx + 20,
      y2: cy,
      cx: cx,
      cy: cy - 25,
      strokeColor: '#E6007A',
      strokeWidth: 1,
      strokeDash: '',
      fillMode: 'none',
      label: 'Thumb Notch Arc'
    };
    setKeylineElements((prev) => [...prev, notch]);
  };

  // ─── BOOK COVER TEMPLATES ─────────────────────────────────────────────────
  const handleInsertBookPaperback = () => {
    const res = generateBookCover(sheetWidth, sheetHeight, { pageWidth: 148, pageHeight: 210, spineWidth: 14 });
    setKeylineElements(res.elements);
  };

  const handleInsertBookHardcover = () => {
    const res = generateBookCover(sheetWidth, sheetHeight, { pageWidth: 210, pageHeight: 297, spineWidth: 22, isHardcover: true });
    setKeylineElements(res.elements);
  };

  const handleInsertBookDustJacket = () => {
    const res = generateBookCover(sheetWidth, sheetHeight, { pageWidth: 140, pageHeight: 216, spineWidth: 18, flapWidth: 75 });
    setKeylineElements(res.elements);
  };

  // ─── FOLDER & BROCHURE TEMPLATES ──────────────────────────────────────────
  const handleInsertPocketFolder = () => {
    const res = generatePocketFolder(sheetWidth, sheetHeight, { panelWidth: 225, panelHeight: 305, pocketHeight: 100 });
    setKeylineElements(res.elements);
  };

  const handleInsertTriFoldBrochure = () => {
    const res = generateTriFoldBrochure(sheetWidth, sheetHeight, { width: 297, height: 210 });
    setKeylineElements(res.elements);
  };

  // ─── HANGTAG & LABEL TEMPLATES ───────────────────────────────────────────
  const handleInsertHangtagEuro = () => {
    const res = generateHangtag(sheetWidth, sheetHeight, { width: 60, height: 110, radius: 8, euroSlot: true });
    setKeylineElements(res.elements);
  };

  const handleInsertHangtagLanyard = () => {
    const res = generateHangtag(sheetWidth, sheetHeight, { width: 50, height: 90, radius: 4, euroSlot: false });
    setKeylineElements(res.elements);
  };

  // ─── BLANK SHEET ─────────────────────────────────────────────────────────
  const handleStartBlankSheet = () => {
    if (window.confirm('Clear canvas to start a blank drawing?')) {
      setKeylineElements([]);
    }
  };

  // Direct numeric input update
  const handleNumericChange = (field, val) => {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      updateSelectedProperty(field, num);
    }
  };

  return (
    <div className="w-full h-full flex flex-col font-mono text-xs select-none space-y-3">
      {/* ─── Top Studio Tabs ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-[#10141D] rounded-xl border border-[#233045]">
        {[
          { id: 'TOOLS', label: 'Tools', icon: PenTool },
          { id: 'TRANSFORM', label: 'Transform', icon: Move },
          { id: 'TEMPLATES', label: 'Templates', icon: Package },
          { id: 'LAYERS', label: `Layers (${keylineElements.length})`, icon: Layers }
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-md shadow-fuchsia-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          TAB 1: TOOLS (DRAWING TOOLS, CURVES, COLOR PICKING, FILLS)
         ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'TOOLS' && (
        <div className="space-y-3">
          {/* 1. DRAWING TOOLS GRID (12 TOOLS) */}
          <div className="p-3 rounded-2xl bg-[#141C2A] border border-[#233045] space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-bold text-[11px]">
              <span className="flex items-center gap-1.5 text-fuchsia-400">
                <PenTool className="w-3.5 h-3.5" />
                <span>DRAWING TOOLS</span>
              </span>
              <span className="text-[10px] text-slate-500">Active: {activeTool.toUpperCase()}</span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'select', label: 'Select / Drag', icon: MousePointer },
                { id: 'curve', label: 'Bézier Curve / Arc', icon: Spline, highlight: true },
                { id: 'rect', label: 'Rectangle / Box', icon: Square },
                { id: 'roundrect', label: 'Rounded Box', icon: Square },
                { id: 'line', label: 'Straight Line', icon: Minus },
                { id: 'circle', label: 'Circle / Hole', icon: Circle },
                { id: 'ellipse', label: 'Oval / Ellipse', icon: Circle },
                { id: 'polygon', label: 'Polygon / Flap', icon: Triangle },
                { id: 'freehand', label: 'Pen / Freehand', icon: PenTool },
                { id: 'text', label: 'Text / Label', icon: Type },
                { id: 'measure', label: 'CAD Dimension', icon: Ruler },
                { id: 'eyedropper', label: 'Color Picker', icon: Pipette }
              ].map((tool) => {
                const Icon = tool.icon;
                const isSelected = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => {
                      setActiveTool(tool.id);
                      if (tool.id === 'eyedropper') handleEyedropper('stroke');
                    }}
                    className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border text-center ${
                      isSelected
                        ? 'bg-fuchsia-600/30 border-fuchsia-500 text-fuchsia-200 shadow-lg shadow-fuchsia-950/40'
                        : tool.highlight
                        ? 'bg-purple-950/40 border-purple-500/40 text-purple-300 hover:bg-purple-900/40'
                        : 'bg-[#10141D] border-[#222B3D] text-slate-400 hover:text-slate-200 hover:border-slate-600'
                    }`}
                    title={tool.label}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[9px] font-bold truncate max-w-full">{tool.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1B. PLACE SHAPE BY EXACT DIMENSIONS & POSITION (CAD BUILDER) */}
          <div className="p-3 rounded-2xl bg-[#141C2A] border border-[#233045] space-y-2.5">
            <div className="flex items-center justify-between text-slate-300 font-bold text-[11px]">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Ruler className="w-3.5 h-3.5" />
                <span>INSERT BY EXACT DIMENSIONS (CAD)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsBuilderExpanded(!isBuilderExpanded)}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer font-bold"
              >
                {isBuilderExpanded ? 'Hide' : 'Expand'}
              </button>
            </div>

            {isBuilderExpanded && (
              <div className="space-y-2 pt-1 border-t border-white/5">
                {/* Shape Selector */}
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { id: 'rect', label: 'Panel' },
                    { id: 'crease', label: 'Crease' },
                    { id: 'cut_line', label: 'Cut Line' },
                    { id: 'roundrect', label: 'Round' },
                    { id: 'circle', label: 'Hole' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setBuilderShape(s.id)}
                      className={`py-1 px-1 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer ${
                        builderShape === s.id
                          ? 'bg-cyan-600 text-white shadow-sm'
                          : 'bg-[#10141D] text-slate-400 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Dimensions (W & H) */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <label className="text-slate-400 block mb-0.5 font-bold">
                      {builderShape === 'crease'
                        ? 'Crease Length (mm)'
                        : builderShape === 'cut_line'
                        ? 'Cut Length (mm)'
                        : builderShape === 'circle'
                        ? 'Diameter (mm)'
                        : 'Width (mm)'}
                    </label>
                    <input
                      type="number"
                      value={builderW}
                      onChange={(e) => setBuilderW(e.target.value)}
                      className="w-full bg-[#10141D] border border-[#233045] rounded-lg p-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  {builderShape !== 'circle' && builderShape !== 'cut_line' && (
                    <div>
                      <label className="text-slate-400 block mb-0.5 font-bold">Height (mm)</label>
                      <input
                        type="number"
                        value={builderH}
                        onChange={(e) => setBuilderH(e.target.value)}
                        className="w-full bg-[#10141D] border border-[#233045] rounded-lg p-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  )}
                </div>

                {/* Position (X & Y) */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <label className="text-slate-400 block mb-0.5 font-bold">Position X (mm)</label>
                    <input
                      type="number"
                      value={builderX}
                      onChange={(e) => setBuilderX(e.target.value)}
                      className="w-full bg-[#10141D] border border-[#233045] rounded-lg p-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-0.5 font-bold">Position Y (mm)</label>
                    <input
                      type="number"
                      value={builderY}
                      onChange={(e) => setBuilderY(e.target.value)}
                      className="w-full bg-[#10141D] border border-[#233045] rounded-lg p-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Rule Type & Label */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <label className="text-slate-400 block mb-0.5 font-bold">Line Rule</label>
                    <select
                      value={builderLineType}
                      onChange={(e) => setBuilderLineType(e.target.value)}
                      className="w-full bg-[#10141D] border border-[#233045] rounded-lg p-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                    >
                      <option value="cut">Thru-Cut (Magenta)</option>
                      <option value="crease">Crease Score (Cyan)</option>
                      <option value="perf">Perforation (Green)</option>
                      <option value="bleed">Bleed Boundary (Blue)</option>
                      <option value="safety">Safety Margin (Amber)</option>
                      <option value="glue">Glue Flap (Violet)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-0.5 font-bold">Label / Tag</label>
                    <input
                      type="text"
                      value={builderLabel}
                      onChange={(e) => setBuilderLabel(e.target.value)}
                      placeholder="e.g. Front Cover"
                      className="w-full bg-[#10141D] border border-[#233045] rounded-lg p-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleInsertCustomDimensionedShape(false)}
                    className="py-1.5 px-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-all shadow-md cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Place at ({builderX}, {builderY})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertCustomDimensionedShape(true)}
                    className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-cyan-500/30 font-bold text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Center on Sheet</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. CURVE & ARC CONTROLS (ACTIVE WHEN CURVE OR LINE SELECTED) */}
          {(selectedElement?.type === 'curve' || selectedElement?.type === 'line' || activeTool === 'curve') && (
            <div className="p-3 rounded-2xl bg-gradient-to-br from-fuchsia-950/40 to-slate-900 border border-fuchsia-500/40 space-y-2.5">
              <div className="flex items-center justify-between text-fuchsia-300 font-bold text-[11px]">
                <span className="flex items-center gap-1.5">
                  <Spline className="w-3.5 h-3.5 text-fuchsia-400" />
                  <span>CURVE & ARC SHAPING ENGINE</span>
                </span>
                <span className="text-[10px] bg-fuchsia-900/60 text-fuchsia-300 px-2 py-0.5 rounded-full font-bold">
                  Bézier Flex
                </span>
              </div>

              {selectedElement?.type === 'line' && (
                <button
                  type="button"
                  onClick={handleConvertLineToCurve}
                  className="w-full py-2 px-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  <Spline className="w-3.5 h-3.5" />
                  <span>Convert Selected Line to Curved Arc</span>
                </button>
              )}

              {selectedElement?.type === 'curve' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Arc Curvature Depth:</span>
                    <span className="text-fuchsia-300 font-bold">
                      {Math.round(selectedElement.cy - (selectedElement.y1 + selectedElement.y2) / 2)} mm
                    </span>
                  </div>

                  {/* Curvature Arc Slider */}
                  <input
                    type="range"
                    min="-60"
                    max="60"
                    step="2"
                    defaultValue="25"
                    onChange={(e) => handleSetCurveArcDepth(parseFloat(e.target.value))}
                    className="w-full accent-fuchsia-500 cursor-pointer"
                  />

                  {/* Quick Curve Presets */}
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSetCurveArcDepth(15)}
                      className="py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200"
                    >
                      Flap Arc (15mm)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetCurveArcDepth(35)}
                      className="py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200"
                    >
                      Deep Curve (35mm)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetCurveArcDepth(-20)}
                      className="py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200"
                    >
                      Invert Arc (-20mm)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. ROUNDED CORNER CONTROLS (ACTIVE FOR ROUNDRECT) */}
          {selectedElement?.type === 'roundrect' && (
            <div className="p-3 rounded-2xl bg-[#141C2A] border border-[#233045] space-y-2">
              <div className="flex items-center justify-between text-slate-300 font-bold text-[11px]">
                <span>CORNER RADIUS</span>
                <span className="text-amber-400 font-bold">{selectedElement.rx || 8} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={selectedElement.rx || 8}
                onChange={(e) => updateSelectedProperty('rx', parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex items-center gap-1.5 pt-1">
                {[2, 5, 8, 12, 20].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => updateSelectedProperty('rx', r)}
                    className="flex-1 py-1 rounded bg-[#10141D] hover:bg-slate-700 text-slate-300 text-[10px]"
                  >
                    {r}mm
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. PREPRESS SPOT INKS & COLOR PICKER (STROKE) */}
          <div className="p-3 rounded-2xl bg-[#141C2A] border border-[#233045] space-y-2.5">
            <div className="flex items-center justify-between text-slate-300 font-bold text-[11px]">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Palette className="w-3.5 h-3.5" />
                <span>STROKE SPOT INK</span>
              </span>
              <div className="flex items-center gap-1.5">
                {/* Eyedropper Button */}
                <button
                  type="button"
                  onClick={() => handleEyedropper('stroke')}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400"
                  title="Pick color from screen or canvas (Eyedropper)"
                >
                  <Pipette className="w-3 h-3" />
                </button>
                {/* Swap Stroke & Fill */}
                <button
                  type="button"
                  onClick={handleSwapStrokeFill}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                  title="Swap Stroke and Fill colors"
                >
                  ⇄ Swap
                </button>
              </div>
            </div>

            {/* Standard Prepress Spot Inks */}
            <div className="grid grid-cols-2 gap-1.5">
              {PREPRESS_SPOT_INKS.slice(0, 6).map((ink) => {
                const isSelected = strokeColor.toLowerCase() === ink.color.toLowerCase();
                return (
                  <button
                    key={ink.name}
                    type="button"
                    onClick={() => {
                      setStrokeColor(ink.color);
                      setStrokeDash(ink.dash);
                      setCurrentLineType(ink.type);
                      if (selectedId) {
                        setKeylineElements((prev) =>
                          prev.map((el) => (el.id === selectedId ? { ...el, strokeColor: ink.color, strokeDash: ink.dash, lineType: ink.type } : el))
                        );
                      }
                    }}
                    className={`flex items-center gap-2 p-1.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-white bg-[#1C2638] shadow-sm'
                        : 'border-[#222C3E] bg-[#10141D] hover:border-slate-500'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ink.color }} />
                    <span className="text-[10px] text-slate-300 truncate">{ink.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Color Hex & Width Controls */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Color Picker</label>
                <div className="flex items-center gap-1.5 bg-[#10141D] p-1 rounded-lg border border-[#233045]">
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => {
                      setStrokeColor(e.target.value);
                      if (selectedId) updateSelectedProperty('strokeColor', e.target.value);
                    }}
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={strokeColor}
                    onChange={(e) => {
                      setStrokeColor(e.target.value);
                      if (selectedId) updateSelectedProperty('strokeColor', e.target.value);
                    }}
                    className="w-full bg-transparent text-[11px] text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Stroke Width ({strokeWidth}pt)</label>
                <select
                  value={strokeWidth}
                  onChange={(e) => {
                    setStrokeWidth(parseFloat(e.target.value));
                    if (selectedId) updateSelectedProperty('strokeWidth', parseFloat(e.target.value));
                  }}
                  className="w-full bg-[#10141D] border border-[#233045] rounded-lg p-1.5 text-xs text-white"
                >
                  <option value="0.25">0.25 pt (Hairline)</option>
                  <option value="0.5">0.5 pt (Thin)</option>
                  <option value="1">1.0 pt (Standard CAD)</option>
                  <option value="1.5">1.5 pt (Bold Score)</option>
                  <option value="2">2.0 pt (Heavy Die)</option>
                  <option value="3">3.0 pt</option>
                </select>
              </div>
            </div>
          </div>

          {/* 5. COLOR FILLING STUDIO (SOLID, TINT, GRADIENTS, CAD HATCH) */}
          <div className="p-3 rounded-2xl bg-[#141C2A] border border-[#233045] space-y-2.5">
            <div className="flex items-center justify-between text-slate-300 font-bold text-[11px]">
              <span className="flex items-center gap-1.5 text-purple-400">
                <Droplet className="w-3.5 h-3.5" />
                <span>COLOR FILLING STUDIO</span>
              </span>
              <button
                type="button"
                onClick={() => handleEyedropper('fill')}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-purple-400"
                title="Sample fill color"
              >
                <Pipette className="w-3 h-3" />
              </button>
            </div>

            {/* Fill Mode Switcher */}
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'none', label: 'No Fill' },
                { id: 'solid', label: 'Solid' },
                { id: 'tint', label: 'CAD Tint' },
                { id: 'hatch_diagonal', label: 'Glue Hatch' },
                { id: 'hatch_cross', label: 'Varnish Cross' },
                { id: 'linear', label: 'Gradient' }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setFillMode(m.id);
                    if (selectedId) updateSelectedProperty('fillMode', m.id);
                  }}
                  className={`py-1.5 px-1 rounded-lg text-[10px] font-bold border transition-all ${
                    fillMode === m.id
                      ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                      : 'bg-[#10141D] border-[#233045] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Live Fill Color Swatches */}
            {fillMode !== 'none' && !fillMode.startsWith('hatch_') && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {FILL_SWATCHES.map((sw) => (
                    <button
                      key={sw.name}
                      type="button"
                      onClick={() => {
                        setFillColor(sw.color);
                        if (selectedId) updateSelectedProperty('fillColor', sw.color);
                      }}
                      className="w-5 h-5 rounded-md border border-white/20 hover:scale-110 transition-transform cursor-pointer"
                      style={{ backgroundColor: sw.color }}
                      title={sw.name}
                    />
                  ))}
                  <div className="flex items-center gap-1 bg-[#10141D] px-2 py-0.5 rounded border border-[#233045]">
                    <input
                      type="color"
                      value={fillColor}
                      onChange={(e) => {
                        setFillColor(e.target.value);
                        if (selectedId) updateSelectedProperty('fillColor', e.target.value);
                      }}
                      className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </div>
                </div>

                {/* Fill Opacity Slider */}
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span>Fill Opacity:</span>
                    <span className="text-purple-300 font-bold">{Math.round((fillOpacity || 0.25) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.05"
                    value={fillOpacity}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setFillOpacity(val);
                      if (selectedId) updateSelectedProperty('fillOpacity', val);
                    }}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          TAB 2: TRANSFORM, ROTATE, ALIGN & GEOMETRY INSPECTOR
         ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'TRANSFORM' && (
        <div className="space-y-3">
          {/* Multi-Selection Bar */}
          <div className="p-3 rounded-2xl bg-[#141C2A] border border-[#233045] space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-bold text-[11px]">
              <span>SELECTION TOOLS</span>
              <span className="text-purple-400">{activeIds.length} Active</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const all = keylineElements.map((el) => el.id);
                  setSelectedIds(all);
                  if (all.length > 0) setSelectedId(all[0]);
                }}
                className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold"
              >
                Select All (Ctrl+A)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  setSelectedIds([]);
                }}
                className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-bold"
              >
                Deselect (Esc)
              </button>
            </div>
          </div>

          {/* Alignment Tools */}
          <div className="p-3 rounded-2xl bg-[#141C2A] border border-[#233045] space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-bold text-[11px]">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <AlignLeft className="w-3.5 h-3.5" />
                <span>ALIGNMENT & SHEET</span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => handleAlign('left')}
                className="p-1.5 rounded-lg bg-[#10141D] hover:bg-slate-800 text-slate-300 flex items-center justify-center gap-1 text-[10px]"
                title="Align Left"
              >
                <AlignLeft className="w-3 h-3" /> Left
              </button>
              <button
                type="button"
                onClick={() => handleAlign('center_h')}
                className="p-1.5 rounded-lg bg-[#10141D] hover:bg-slate-800 text-slate-300 flex items-center justify-center gap-1 text-[10px]"
                title="Align Center Horizontal"
              >
                <AlignCenter className="w-3 h-3" /> Center H
              </button>
              <button
                type="button"
                onClick={() => handleAlign('right')}
                className="p-1.5 rounded-lg bg-[#10141D] hover:bg-slate-800 text-slate-300 flex items-center justify-center gap-1 text-[10px]"
                title="Align Right"
              >
                <AlignRight className="w-3 h-3" /> Right
              </button>
              <button
                type="button"
                onClick={() => handleAlign('top')}
                className="p-1.5 rounded-lg bg-[#10141D] hover:bg-slate-800 text-slate-300 text-[10px]"
              >
                Top
              </button>
              <button
                type="button"
                onClick={() => handleAlign('center_v')}
                className="p-1.5 rounded-lg bg-[#10141D] hover:bg-slate-800 text-slate-300 text-[10px]"
              >
                Center V
              </button>
              <button
                type="button"
                onClick={() => handleAlign('bottom')}
                className="p-1.5 rounded-lg bg-[#10141D] hover:bg-slate-800 text-slate-300 text-[10px]"
              >
                Bottom
              </button>
            </div>
            {/* Center on Sheet Button */}
            <button
              type="button"
              onClick={() => handleAlign('center_sheet')}
              className="w-full py-1.5 px-2 rounded-lg bg-cyan-950/40 border border-cyan-700/50 hover:bg-cyan-900/50 text-cyan-300 text-[10px] font-bold flex items-center justify-center gap-1.5"
            >
              <Maximize2 className="w-3 h-3" /> Center Selection on Sheet Paper
            </button>
          </div>

          {/* Rotate & Flip Tools */}
          <div className="p-3 rounded-2xl bg-[#141C2A] border border-[#233045] space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-bold text-[11px]">
              <span className="flex items-center gap-1.5 text-amber-400">
                <RotateCw className="w-3.5 h-3.5" />
                <span>ROTATE & FLIP</span>
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleRotate(90)}
                className="p-2 rounded-xl bg-[#10141D] hover:bg-slate-800 text-slate-200 flex flex-col items-center gap-1 text-[9px]"
              >
                <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                <span>+90° CW</span>
              </button>
              <button
                type="button"
                onClick={() => handleRotate(-90)}
                className="p-2 rounded-xl bg-[#10141D] hover:bg-slate-800 text-slate-200 flex flex-col items-center gap-1 text-[9px]"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>-90° CCW</span>
              </button>
              <button
                type="button"
                onClick={() => handleFlip('h')}
                className="p-2 rounded-xl bg-[#10141D] hover:bg-slate-800 text-slate-200 flex flex-col items-center gap-1 text-[9px]"
              >
                <FlipHorizontal className="w-3.5 h-3.5 text-amber-400" />
                <span>Flip H</span>
              </button>
              <button
                type="button"
                onClick={() => handleFlip('v')}
                className="p-2 rounded-xl bg-[#10141D] hover:bg-slate-800 text-slate-200 flex flex-col items-center gap-1 text-[9px]"
              >
                <FlipVertical className="w-3.5 h-3.5 text-amber-400" />
                <span>Flip V</span>
              </button>
            </div>
          </div>

          {/* Direct Geometry & Position CAD Inspector */}
          {selectedElement ? (
            <div className="p-3 rounded-2xl bg-[#141C2A] border border-cyan-500/40 space-y-2.5 shadow-lg shadow-cyan-950/20">
              <div className="flex items-center justify-between text-slate-300 font-bold text-[11px]">
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <Ruler className="w-3.5 h-3.5" />
                  <span>CAD GEOMETRY & POSITION</span>
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 uppercase font-bold">
                  {selectedElement.type}
                </span>
              </div>

              {/* Exact Position (X & Y in mm) */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Exact Position (mm)</span>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <label className="text-slate-500 block mb-0.5 font-bold">X Position</label>
                    <input
                      type="number"
                      step="1"
                      value={Math.round((selectedElement.x ?? selectedElement.cx ?? selectedElement.x1 ?? 0) * 10) / 10}
                      onChange={(e) => handleSetSelectedPosition('x', e.target.value)}
                      className="w-full bg-[#10141D] border border-cyan-500/30 rounded-lg p-1.5 text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-0.5 font-bold">Y Position</label>
                    <input
                      type="number"
                      step="1"
                      value={Math.round((selectedElement.y ?? selectedElement.cy ?? selectedElement.y1 ?? 0) * 10) / 10}
                      onChange={(e) => handleSetSelectedPosition('y', e.target.value)}
                      className="w-full bg-[#10141D] border border-cyan-500/30 rounded-lg p-1.5 text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              {/* Exact Dimensions (W & H in mm) */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Exact Dimensions (mm)</span>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {selectedElement.width !== undefined && (
                    <div>
                      <label className="text-slate-500 block mb-0.5 font-bold">Width (mm)</label>
                      <input
                        type="number"
                        step="1"
                        value={Math.round(selectedElement.width * 10) / 10}
                        onChange={(e) => handleSetSelectedDimension('width', e.target.value)}
                        className="w-full bg-[#10141D] border border-cyan-500/30 rounded-lg p-1.5 text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  )}
                  {selectedElement.height !== undefined && (
                    <div>
                      <label className="text-slate-500 block mb-0.5 font-bold">Height (mm)</label>
                      <input
                        type="number"
                        step="1"
                        value={Math.round(selectedElement.height * 10) / 10}
                        onChange={(e) => handleSetSelectedDimension('height', e.target.value)}
                        className="w-full bg-[#10141D] border border-cyan-500/30 rounded-lg p-1.5 text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  )}
                  {selectedElement.r !== undefined && (
                    <div>
                      <label className="text-slate-500 block mb-0.5 font-bold">Radius (mm)</label>
                      <input
                        type="number"
                        step="1"
                        value={Math.round(selectedElement.r * 10) / 10}
                        onChange={(e) => handleSetSelectedDimension('r', e.target.value)}
                        className="w-full bg-[#10141D] border border-cyan-500/30 rounded-lg p-1.5 text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  )}
                  {selectedElement.type === 'roundrect' && (
                    <div>
                      <label className="text-slate-500 block mb-0.5 font-bold">Corner Radius</label>
                      <input
                        type="number"
                        step="1"
                        value={Math.round((selectedElement.rx || 8) * 10) / 10}
                        onChange={(e) => updateSelectedProperty('rx', parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#10141D] border border-cyan-500/30 rounded-lg p-1.5 text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  )}
                  {(selectedElement.type === 'line' || selectedElement.type === 'measure') && (
                    <div className="col-span-2">
                      <label className="text-slate-500 block mb-0.5 font-bold">
                        Line Length: {Math.round(Math.hypot(selectedElement.x2 - selectedElement.x1, selectedElement.y2 - selectedElement.y1) * 10) / 10} mm
                      </label>
                      <input
                        type="number"
                        placeholder="Length (mm)"
                        onChange={(e) => {
                          const len = parseFloat(e.target.value);
                          if (len > 0) {
                            const dx = selectedElement.x2 - selectedElement.x1;
                            const dy = selectedElement.y2 - selectedElement.y1;
                            const curLen = Math.hypot(dx, dy) || 1;
                            const ux = dx / curLen;
                            const uy = dy / curLen;
                            updateSelectedProperty('x2', selectedElement.x1 + ux * len);
                            updateSelectedProperty('y2', selectedElement.y1 + uy * len);
                          }
                        }}
                        className="w-full bg-[#10141D] border border-cyan-500/30 rounded-lg p-1.5 text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Nudge Controls */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Nudge Position</span>
                <div className="grid grid-cols-4 gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleNudgePosition(-5, 0)}
                    className="p-1 rounded bg-[#10141D] hover:bg-slate-800 text-slate-300 font-bold text-center cursor-pointer"
                  >
                    ← 5mm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNudgePosition(5, 0)}
                    className="p-1 rounded bg-[#10141D] hover:bg-slate-800 text-slate-300 font-bold text-center cursor-pointer"
                  >
                    → 5mm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNudgePosition(0, -5)}
                    className="p-1 rounded bg-[#10141D] hover:bg-slate-800 text-slate-300 font-bold text-center cursor-pointer"
                  >
                    ↑ 5mm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNudgePosition(0, 5)}
                    className="p-1 rounded bg-[#10141D] hover:bg-slate-800 text-slate-300 font-bold text-center cursor-pointer"
                  >
                    ↓ 5mm
                  </button>
                </div>
              </div>

              {/* Line Type & Label */}
              <div className="space-y-1.5 pt-1 border-t border-white/5">
                <div>
                  <label className="text-slate-500 block mb-0.5 text-[10px] font-bold">Line Rule / Spot Ink</label>
                  <select
                    value={selectedElement.lineType || 'cut'}
                    onChange={(e) => {
                      const type = e.target.value;
                      const ink = PREPRESS_SPOT_INKS.find((i) => i.type === type);
                      if (ink) {
                        setKeylineElements((prev) =>
                          prev.map((el) =>
                            el.id === selectedId
                              ? { ...el, lineType: type, strokeColor: ink.color, strokeDash: ink.dash }
                              : el
                          )
                        );
                      }
                    }}
                    className="w-full bg-[#10141D] border border-cyan-500/30 rounded-lg p-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                  >
                    {PREPRESS_SPOT_INKS.map((ink) => (
                      <option key={ink.name} value={ink.type}>
                        {ink.name} ({ink.color})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 block mb-0.5 text-[10px] font-bold">Element Label</label>
                  <input
                    type="text"
                    value={selectedElement.label || ''}
                    onChange={(e) => updateSelectedProperty('label', e.target.value)}
                    placeholder="e.g. Spine Crease"
                    className="w-full bg-[#10141D] border border-[#233045] rounded-lg p-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[#141C2A] border border-white/10 text-center space-y-2 text-slate-400">
              <MousePointer className="w-6 h-6 mx-auto text-slate-500" />
              <div className="text-xs font-bold text-white">No Shape Selected</div>
              <p className="text-[10px] text-slate-400 m-0">
                Click any shape on the canvas to inspect & edit its exact X/Y position and millimeter dimensions.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          TAB 3: PREPRESS DIELINE TEMPLATES (MULTI-CATEGORY STUDIO)
         ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'TEMPLATES' && (
        <div className="space-y-3">
          {/* Quick Studio Actions */}
          <div className="grid grid-cols-2 gap-1.5">
            {onOpenNewDesignModal && (
              <button
                type="button"
                onClick={onOpenNewDesignModal}
                className="p-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-[11px] font-bold shadow-md shadow-cyan-950/40 flex items-center justify-center gap-1.5 cursor-pointer border border-cyan-400/30"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                <span>✨ New / Save & Clear</span>
              </button>
            )}
            {onOpenSavedLibrary && (
              <button
                type="button"
                onClick={onOpenSavedLibrary}
                className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-cyan-300 hover:text-white font-mono text-[11px] font-bold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer border border-cyan-500/30"
              >
                <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>My Designs ({savedDesignsCount})</span>
              </button>
            )}
          </div>

          {/* Main Box Dieline Wizard Launcher */}
          {onOpenBoxModal && (
            <button
              type="button"
              onClick={onOpenBoxModal}
              className="w-full p-2.5 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-mono text-xs font-bold shadow-lg shadow-fuchsia-950/40 flex items-center justify-between cursor-pointer transition-all border border-fuchsia-400/30"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-bold text-white uppercase tracking-wider">Box CAD Dieline Wizard</div>
                  <div className="text-[9px] text-fuchsia-200">Custom Dimensions & 3D Fold Preview</div>
                </div>
              </div>
              <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
            </button>
          )}

          {/* Category Selector Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'BOOKS', label: '📖 Books' },
              { id: 'FOLDERS', label: '📁 Folders' },
              { id: 'PACKAGING', label: '📦 Boxes' },
              { id: 'TAGS', label: '🏷️ Tags' },
              { id: 'BLANK', label: '🎨 Blank' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setTemplateCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
                  templateCategory === cat.id
                    ? 'bg-fuchsia-600 text-white shadow-sm shadow-fuchsia-950'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="p-3 rounded-2xl bg-[#141C2A] border border-[#233045] space-y-2">
            <div className="text-slate-300 font-bold text-[11px] mb-1">
              {templateCategory === 'ALL' && 'PREPRESS VECTOR TEMPLATES'}
              {templateCategory === 'BOOKS' && '📖 BOOKS & PUBLISHING COVERS'}
              {templateCategory === 'FOLDERS' && '📁 PRESENTATION FOLDERS & BROCHURES'}
              {templateCategory === 'PACKAGING' && '📦 PACKAGING CARTONS & BOXES'}
              {templateCategory === 'TAGS' && '🏷️ RETAIL HANGTAGS & EURO SLOTS'}
              {templateCategory === 'BLANK' && '🎨 CLEAN SHEET (DRAW ANYTHING)'}
            </div>
            <p className="text-[10px] text-slate-400 m-0 mb-3">
              One-click instant engineering keylines with trim cuts, crease fold rules, and registration lines.
            </p>

            <div className="space-y-2">
              {/* ─── 1. BOOKS & PUBLICATIONS ─────────────────────────────────── */}
              {(templateCategory === 'ALL' || templateCategory === 'BOOKS') && (
                <>
                  <button
                    type="button"
                    onClick={handleInsertBookPaperback}
                    className="w-full p-2.5 rounded-xl bg-[#10141D] hover:bg-slate-800 border border-[#222C3E] text-left flex items-start gap-3 transition-all cursor-pointer group"
                  >
                    <BookOpen className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs font-bold text-white m-0">A5 Paperback Book Cover</h5>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">Book</span>
                      </div>
                      <p className="text-[10px] text-slate-400 m-0">148×210mm front & back cover with 14mm spine creases & trim cut.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleInsertBookHardcover}
                    className="w-full p-2.5 rounded-xl bg-[#10141D] hover:bg-slate-800 border border-[#222C3E] text-left flex items-start gap-3 transition-all cursor-pointer group"
                  >
                    <BookOpen className="w-5 h-5 text-teal-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs font-bold text-white m-0">A4 Hardcover Book Wrap</h5>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-950 text-teal-300 border border-teal-800 font-mono">Hardcover</span>
                      </div>
                      <p className="text-[10px] text-slate-400 m-0">210×297mm cover with 22mm spine and 7mm hinge opening scores.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleInsertBookDustJacket}
                    className="w-full p-2.5 rounded-xl bg-[#10141D] hover:bg-slate-800 border border-[#222C3E] text-left flex items-start gap-3 transition-all cursor-pointer group"
                  >
                    <BookOpen className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs font-bold text-white m-0">Trade Dust Jacket Wrap</h5>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">Flaps</span>
                      </div>
                      <p className="text-[10px] text-slate-400 m-0">Front/back cover with 18mm spine and 75mm inside flaps.</p>
                    </div>
                  </button>
                </>
              )}

              {/* ─── 2. FOLDERS & BROCHURES ───────────────────────────────────── */}
              {(templateCategory === 'ALL' || templateCategory === 'FOLDERS') && (
                <>
                  <button
                    type="button"
                    onClick={handleInsertPocketFolder}
                    className="w-full p-2.5 rounded-xl bg-[#10141D] hover:bg-slate-800 border border-[#222C3E] text-left flex items-start gap-3 transition-all cursor-pointer group"
                  >
                    <Folder className="w-5 h-5 text-blue-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs font-bold text-white m-0">9×12" Presentation Pocket Folder</h5>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono">Folder</span>
                      </div>
                      <p className="text-[10px] text-slate-400 m-0">Two 225×305mm panels with 100mm bottom pocket, glue tab & card slits.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleInsertTriFoldBrochure}
                    className="w-full p-2.5 rounded-xl bg-[#10141D] hover:bg-slate-800 border border-[#222C3E] text-left flex items-start gap-3 transition-all cursor-pointer group"
                  >
                    <Layers className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs font-bold text-white m-0">A4 Tri-Fold Brochure (6-Panel)</h5>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">Brochure</span>
                      </div>
                      <p className="text-[10px] text-slate-400 m-0">297×210mm landscape sheet with 2 vertical fold scores.</p>
                    </div>
                  </button>
                </>
              )}

              {/* ─── 3. PACKAGING BOXES ───────────────────────────────────────── */}
              {(templateCategory === 'ALL' || templateCategory === 'PACKAGING') && (
                <>
                  <button
                    type="button"
                    onClick={handleInsertRTEBoxTemplate}
                    className="w-full p-2.5 rounded-xl bg-[#10141D] hover:bg-slate-800 border border-[#222C3E] text-left flex items-start gap-3 transition-all cursor-pointer group"
                  >
                    <Package className="w-5 h-5 text-fuchsia-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs font-bold text-white m-0">Reverse Tuck End (RTE) Box</h5>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-800 font-mono">Carton</span>
                      </div>
                      <p className="text-[10px] text-slate-400 m-0">70×40×120mm folding carton with Bézier tuck flaps & glue hatch.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleInsertSTEBoxTemplate}
                    className="w-full p-2.5 rounded-xl bg-[#10141D] hover:bg-slate-800 border border-[#222C3E] text-left flex items-start gap-3 transition-all cursor-pointer group"
                  >
                    <Package className="w-5 h-5 text-pink-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs font-bold text-white m-0">Straight Tuck End (STE) Box</h5>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-pink-950 text-pink-300 border border-pink-800 font-mono">Luxury</span>
                      </div>
                      <p className="text-[10px] text-slate-400 m-0">70×40×120mm luxury carton where both flaps fold towards rear.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleInsertPillowBoxTemplate}
                    className="w-full p-2.5 rounded-xl bg-[#10141D] hover:bg-slate-800 border border-[#222C3E] text-left flex items-start gap-3 transition-all cursor-pointer group"
                  >
                    <Spline className="w-5 h-5 text-purple-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs font-bold text-white m-0">Curved Pillow Gift Box</h5>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono">Curves</span>
                      </div>
                      <p className="text-[10px] text-slate-400 m-0">120×75mm gift carton with convex & concave curved crease arcs.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleInsertMailerBoxTemplate}
                    className="w-full p-2.5 rounded-xl bg-[#10141D] hover:bg-slate-800 border border-[#222C3E] text-left flex items-start gap-3 transition-all cursor-pointer group"
                  >
                    <Package className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs font-bold text-white m-0">Roll-End RETF Mailer Box</h5>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">E-Comm</span>
                      </div>
                      <p className="text-[10px] text-slate-400 m-0">160×110×50mm e-commerce carton with curved locking ears.</p>
                    </div>
                  </button>
                </>
              )}

              {/* ─── 4. TAGS & PUNCH HOLES ────────────────────────────────────── */}
              {(templateCategory === 'ALL' || templateCategory === 'TAGS') && (
                <>
                  <button
                    type="button"
                    onClick={handleInsertHangtagEuro}
                    className="w-full p-2.5 rounded-xl bg-[#10141D] hover:bg-slate-800 border border-[#222C3E] text-left flex items-start gap-3 transition-all cursor-pointer group"
                  >
                    <Tag className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs font-bold text-white m-0">Retail Hangtag with Euro Slot</h5>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">Pegboard</span>
                      </div>
                      <p className="text-[10px] text-slate-400 m-0">60×110mm rounded corner card with standard Euro-punch slot.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleInsertHangtagLanyard}
                    className="w-full p-2.5 rounded-xl bg-[#10141D] hover:bg-slate-800 border border-[#222C3E] text-left flex items-start gap-3 transition-all cursor-pointer group"
                  >
                    <Tag className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs font-bold text-white m-0">Apparel Swing Tag (5mm Hole)</h5>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-yellow-950 text-yellow-300 border border-yellow-800 font-mono">Apparel</span>
                      </div>
                      <p className="text-[10px] text-slate-400 m-0">50×90mm apparel tag with 5mm lanyard / cord eyelet.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleInsertHeaderCard}
                    className="w-full p-2.5 rounded-xl bg-[#10141D] hover:bg-slate-800 border border-[#222C3E] text-left flex items-start gap-3 transition-all cursor-pointer group"
                  >
                    <Square className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <h5 className="text-xs font-bold text-white m-0">Blister Header Card with Euro Slot</h5>
                      <p className="text-[10px] text-slate-400 m-0">Folded pegboard hanging card with standardized Euro-punch hole.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleInsertThumbNotch}
                    className="w-full p-2.5 rounded-xl bg-[#10141D] hover:bg-slate-800 border border-[#222C3E] text-left flex items-start gap-3 transition-all cursor-pointer group"
                  >
                    <Spline className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <h5 className="text-xs font-bold text-white m-0">Semicircular Thumb Notch Arc</h5>
                      <p className="text-[10px] text-slate-400 m-0">Precision curved thumb cutout for slipcases and box lids.</p>
                    </div>
                  </button>
                </>
              )}

              {/* ─── 5. BLANK CANVAS / FREEFORM ──────────────────────────────── */}
              {(templateCategory === 'ALL' || templateCategory === 'BLANK') && (
                <button
                  type="button"
                  onClick={handleStartBlankSheet}
                  className="w-full p-3 rounded-xl bg-gradient-to-r from-slate-900 to-cyan-950/40 hover:from-slate-800 hover:to-cyan-900/50 border border-cyan-500/30 text-left flex items-start gap-3 transition-all cursor-pointer group shadow-md"
                >
                  <Square className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5 group-hover:rotate-45 transition-transform" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h5 className="text-xs font-bold text-white m-0">Clean Paper Stock (Draw Anything)</h5>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">Blank</span>
                    </div>
                    <p className="text-[10px] text-slate-400 m-0">
                      Empty sheet ready for any custom dieline, freehand vectors, Bézier curves, or dimensions.
                    </p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          TAB 4: LAYERS LIST
         ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'LAYERS' && (
        <div className="p-3 rounded-2xl bg-[#141C2A] border border-[#233045] space-y-2">
          <div className="flex items-center justify-between text-slate-300 font-bold text-[11px] mb-1">
            <span>CAD VECTOR LAYERS ({keylineElements.length})</span>
            {keylineElements.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-rose-400 hover:text-rose-300 text-[10px]"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="space-y-1 max-h-[360px] overflow-y-auto pr-1">
            {keylineElements.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-[11px]">
                No shapes drawn yet. Select a tool to start drawing.
              </div>
            ) : (
              keylineElements.map((el, idx) => {
                const isSelected = activeIds.includes(el.id);
                return (
                  <div
                    key={el.id}
                    onClick={() => {
                      setSelectedId(el.id);
                      setSelectedIds([el.id]);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer border transition-all ${
                      isSelected
                        ? 'bg-fuchsia-600/30 border-fuchsia-500 text-white'
                        : 'bg-[#10141D] border-[#222C3E] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: el.strokeColor }} />
                      <span className="text-[11px] font-bold truncate">
                        {el.label || `${el.type.toUpperCase()} #${idx + 1}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(el.id);
                          onDeleteSelected();
                        }}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                        title="Delete element"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ─── Bottom Actions Bar (Save & Download ONLY or Send to Imposition) ─ */}
      <div className="pt-2 border-t border-[#233045] space-y-2 mt-auto">
        <button
          type="button"
          onClick={onExportSVG}
          disabled={keylineElements.length === 0}
          className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-fuchsia-300 hover:text-white border border-fuchsia-500/40 font-mono text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          title="Save and download vector SVG dieline without imposition"
        >
          <Download className="w-3.5 h-3.5 text-fuchsia-400" />
          <span>Save & Download CAD (SVG)</span>
        </button>

        {onSendToImposition && (
          <button
            type="button"
            onClick={onSendToImposition}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-fuchsia-950/50 flex items-center justify-center gap-2 cursor-pointer"
            title="Perform N-Up sheet imposition with this keyline dieline"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Perform Imposition</span>
          </button>
        )}
      </div>
    </div>
  );
}
