import React, { useState, useRef, useCallback } from 'react';
import {
  Scissors,
  Download,
  Upload,
  ArrowRight,
  ArrowLeft,
  FileText,
  RotateCcw,
  RotateCw,
  Sparkles,
  Package,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Palette,
  Maximize2,
  Play,
  FolderOpen,
  Plus
} from 'lucide-react';
import KeylineStudioCanvas, { KEYLINE_TYPES } from './KeylineStudioCanvas';
import KeylineControlPanel from './KeylineControlPanel';
import BoxKeylineModal from './BoxKeylineModal';
import NewDesignModal from './NewDesignModal';
import SavedDesignsModal from './SavedDesignsModal';
import { generateRTEBox } from '../utils/boxDielineGenerator';

const CANVAS_PRESETS = [
  { name: '18×25"', label: '18 × 25 in (457 × 635 mm) • Packaging Press', width: 635, height: 457.2 },
  { name: 'SRA3', label: 'SRA3 (320 × 450 mm) • Digital Std', width: 320, height: 450 },
  { name: 'A3', label: 'A3 (297 × 420 mm)', width: 297, height: 420 },
  { name: 'A4', label: 'A4 (210 × 297 mm)', width: 210, height: 297 },
  { name: 'B2', label: 'B2 (500 × 707 mm) • Half-Size Offset', width: 500, height: 707 },
  { name: '20×26"', label: '20 × 26 in (508 × 660 mm)', width: 508, height: 660 },
  { name: '23×36"', label: '23 × 36 in (584 × 914 mm) • Offset Press', width: 584, height: 914 },
  { name: 'CUSTOM', label: 'Custom Sheet Dimensions...', width: 500, height: 400, isCustom: true }
];

export default function KeylineStudioSection({
  onClose,
  onSendToImposition,
  initialKeylines = [],
  activeJob = null,
  uploadedFile = null
}) {
  // Canvas / Sheet Dimensions
  const [sheetPreset, setSheetPreset] = useState('18×25"');
  const [sheetWidth, setSheetWidth] = useState(635);
  const [sheetHeight, setSheetHeight] = useState(457.2);

  // Keyline Drawing Elements & History - Clean Blank Canvas by default
  const [keylineElements, setKeylineElements] = useState(() => {
    if (initialKeylines && initialKeylines.length > 0) return initialKeylines;
    return []; // Clean blank canvas where users draw everything on their own!
  });
  const [keylineHistory, setKeylineHistory] = useState(() => {
    if (initialKeylines && initialKeylines.length > 0) return [initialKeylines];
    return [[]]; // Blank canvas history
  });
  const [keylineHistoryIndex, setKeylineHistoryIndex] = useState(0);

  // Box Dieline CAD Generator Modal State
  const [isBoxModalOpen, setIsBoxModalOpen] = useState(false);

  // Live Redraw Trigger State
  const [livePlotTrigger, setLivePlotTrigger] = useState(null);

  // Saved Projects Library & New Design State
  const [savedDesigns, setSavedDesigns] = useState(() => {
    try {
      const stored = localStorage.getItem('prepress_saved_keylines');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });
  const [isNewDesignModalOpen, setIsNewDesignModalOpen] = useState(false);
  const [isSavedLibraryOpen, setIsSavedLibraryOpen] = useState(false);

  // Active Tool & Selection State
  const [activeKeylineTool, setActiveKeylineTool] = useState('select');
  const [selectedKeylineId, setSelectedKeylineId] = useState(null);
  const [selectedKeylineIds, setSelectedKeylineIds] = useState([]);

  // Stroke Styling State
  const [keylineLineType, setKeylineLineType] = useState('cut');
  const [keylineStrokeColor, setKeylineStrokeColor] = useState('#E6007A');
  const [keylineStrokeWidth, setKeylineStrokeWidth] = useState(1);
  const [keylineStrokeDash, setKeylineStrokeDash] = useState('');

  // Color Filling State
  const [keylineFillMode, setKeylineFillMode] = useState('none');
  const [keylineFillColor, setKeylineFillColor] = useState('#FCE7F3');
  const [keylineFillOpacity, setKeylineFillOpacity] = useState(0.25);

  // Text Notation State
  const [keylineText, setKeylineText] = useState('DIE CUT LINE');
  const [keylineFontSize, setKeylineFontSize] = useState(14);
  const [keylineFontWeight, setKeylineFontWeight] = useState('bold');
  const [keylineTextColor, setKeylineTextColor] = useState('#E6007A');

  // Canvas Guidelines & Snapping
  const [keylineSnapGrid, setKeylineSnapGrid] = useState(true);
  const [keylineGridSize, setKeylineGridSize] = useState(5);
  const [keylineShowGrid, setKeylineShowGrid] = useState(true);
  const [keylineShowRulers, setKeylineShowRulers] = useState(true);

  // Background Tracing Layer (Uploaded Image / Artwork)
  const [traceImage, setTraceImage] = useState(null);
  const [showTrace, setShowTrace] = useState(true);
  const [traceOpacity, setTraceOpacity] = useState(0.4);
  const fileInputRef = useRef(null);
  const keylineFileInputRef = useRef(null);

  // Notification Toast
  const [notification, setNotification] = useState(null);

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Upload & Import Saved Keyline File (.json or .svg)
  const handleImportKeylineFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        if (file.name.endsWith('.json') || file.type.includes('json')) {
          const parsed = JSON.parse(text);
          const elements = Array.isArray(parsed) ? parsed : (parsed.elements || []);
          if (parsed.sheetWidth && parsed.sheetHeight) {
            setSheetWidth(Number(parsed.sheetWidth));
            setSheetHeight(Number(parsed.sheetHeight));
            setSheetPreset('CUSTOM');
          }
          if (elements.length > 0) {
            updateKeylineElementsWithHistory(elements);
            showToast(`Loaded ${elements.length} keyline elements from ${file.name}`);
          } else {
            showToast('JSON file contained no keyline elements', 'warning');
          }
        } else if (file.name.endsWith('.svg') || file.type.includes('svg') || text.includes('<svg')) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, 'image/svg+xml');
          const svgEl = doc.querySelector('svg');
          if (svgEl) {
            const vb = svgEl.getAttribute('viewBox');
            if (vb) {
              const parts = vb.split(/[\s,]+/).map(Number);
              if (parts.length >= 4 && parts[2] > 0 && parts[3] > 0) {
                setSheetWidth(parts[2]);
                setSheetHeight(parts[3]);
                setSheetPreset('CUSTOM');
              }
            }
          }

          const imported = [];
          // Parse Rectangles
          doc.querySelectorAll('rect').forEach((r, idx) => {
            imported.push({
              id: `imported_rect_${Date.now()}_${idx}`,
              type: 'rect',
              lineType: 'cut',
              x: parseFloat(r.getAttribute('x')) || 0,
              y: parseFloat(r.getAttribute('y')) || 0,
              width: parseFloat(r.getAttribute('width')) || 100,
              height: parseFloat(r.getAttribute('height')) || 100,
              strokeColor: r.getAttribute('stroke') || '#E6007A',
              strokeWidth: parseFloat(r.getAttribute('stroke-width')) || 1,
              strokeDash: r.getAttribute('stroke-dasharray') || '',
              fillColor: r.getAttribute('fill') || 'none',
              fillOpacity: parseFloat(r.getAttribute('fill-opacity')) || 0,
              label: `Imported Box ${idx + 1}`
            });
          });

          // Parse Circles
          doc.querySelectorAll('circle').forEach((c, idx) => {
            imported.push({
              id: `imported_circle_${Date.now()}_${idx}`,
              type: 'circle',
              lineType: 'perf',
              cx: parseFloat(c.getAttribute('cx')) || 0,
              cy: parseFloat(c.getAttribute('cy')) || 0,
              r: parseFloat(c.getAttribute('r')) || 10,
              strokeColor: c.getAttribute('stroke') || '#00A651',
              strokeWidth: parseFloat(c.getAttribute('stroke-width')) || 1,
              strokeDash: c.getAttribute('stroke-dasharray') || '',
              fillColor: c.getAttribute('fill') || 'none',
              fillOpacity: parseFloat(c.getAttribute('fill-opacity')) || 0,
              label: `Imported Circle ${idx + 1}`
            });
          });

          // Parse Lines
          doc.querySelectorAll('line').forEach((l, idx) => {
            imported.push({
              id: `imported_line_${Date.now()}_${idx}`,
              type: 'line',
              lineType: 'crease',
              x1: parseFloat(l.getAttribute('x1')) || 0,
              y1: parseFloat(l.getAttribute('y1')) || 0,
              x2: parseFloat(l.getAttribute('x2')) || 100,
              y2: parseFloat(l.getAttribute('y2')) || 100,
              strokeColor: l.getAttribute('stroke') || '#009EE3',
              strokeWidth: parseFloat(l.getAttribute('stroke-width')) || 1,
              strokeDash: l.getAttribute('stroke-dasharray') || '',
              label: `Imported Line ${idx + 1}`
            });
          });

          // Parse Text
          doc.querySelectorAll('text').forEach((t, idx) => {
            imported.push({
              id: `imported_text_${Date.now()}_${idx}`,
              type: 'text',
              x: parseFloat(t.getAttribute('x')) || 0,
              y: parseFloat(t.getAttribute('y')) || 0,
              text: t.textContent || 'CAD TEXT',
              fontSize: parseFloat(t.getAttribute('font-size')) || 14,
              fontWeight: t.getAttribute('font-weight') || 'bold',
              color: t.getAttribute('fill') || '#E6007A',
              label: `Imported Text ${idx + 1}`
            });
          });

          if (imported.length > 0) {
            updateKeylineElementsWithHistory(imported);
            showToast(`Imported ${imported.length} vector dieline elements from SVG`);
          } else {
            showToast('No recognizable vector paths in SVG file', 'warning');
          }
        }
      } catch (err) {
        showToast(`Failed to parse file: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Undo / Redo Engine
  const updateKeylineElementsWithHistory = useCallback((newElementsOrFn) => {
    setKeylineElements((prev) => {
      const next = typeof newElementsOrFn === 'function' ? newElementsOrFn(prev) : newElementsOrFn;
      setKeylineHistory((hist) => {
        const sliced = hist.slice(0, keylineHistoryIndex + 1);
        return [...sliced, next];
      });
      setKeylineHistoryIndex((idx) => idx + 1);
      return next;
    });
  }, [keylineHistoryIndex]);

  const handleKeylineUndo = useCallback(() => {
    if (keylineHistoryIndex > 0) {
      const newIdx = keylineHistoryIndex - 1;
      setKeylineHistoryIndex(newIdx);
      setKeylineElements(keylineHistory[newIdx]);
      setSelectedKeylineId(null);
    }
  }, [keylineHistoryIndex, keylineHistory]);

  const handleKeylineRedo = useCallback(() => {
    if (keylineHistoryIndex < keylineHistory.length - 1) {
      const newIdx = keylineHistoryIndex + 1;
      setKeylineHistoryIndex(newIdx);
      setKeylineElements(keylineHistory[newIdx]);
      setSelectedKeylineId(null);
    }
  }, [keylineHistoryIndex, keylineHistory]);

  const handleKeylineDuplicateSelected = useCallback(() => {
    if (!selectedKeylineId) return;
    const target = keylineElements.find((el) => el.id === selectedKeylineId);
    if (!target) return;
    const newId = `keyline_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const clone = JSON.parse(JSON.stringify(target));
    clone.id = newId;
    if (clone.type === 'line') {
      clone.x1 += 10; clone.y1 += 10; clone.x2 += 10; clone.y2 += 10;
    } else if (clone.type === 'circle') {
      clone.cx += 10; clone.cy += 10;
    } else if (clone.type === 'freehand') {
      clone.points = clone.points.map((p) => ({ x: p.x + 10, y: p.y + 10 }));
      clone.minX += 10; clone.minY += 10; clone.maxX += 10; clone.maxY += 10;
    } else {
      clone.x += 10; clone.y += 10;
    }
    clone.label = `${target.label || target.type} (Copy)`;
    updateKeylineElementsWithHistory((prev) => [...prev, clone]);
    setSelectedKeylineId(newId);
    showToast('Duplicated element', 'info');
  }, [selectedKeylineId, keylineElements, updateKeylineElementsWithHistory]);

  const handleKeylineDeleteSelected = useCallback(() => {
    if (!selectedKeylineId) return;
    updateKeylineElementsWithHistory((prev) => prev.filter((el) => el.id !== selectedKeylineId));
    setSelectedKeylineId(null);
    showToast('Deleted element', 'info');
  }, [selectedKeylineId, updateKeylineElementsWithHistory]);

  const handleKeylineClearAll = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all drawn keylines?')) {
      updateKeylineElementsWithHistory([]);
      setSelectedKeylineId(null);
      showToast('Cleared all keylines', 'info');
    }
  }, [updateKeylineElementsWithHistory]);

  // Helper to detect category of a drawing
  const detectCategory = (elements) => {
    if (!elements || elements.length === 0) return 'CUSTOM';
    const textStr = elements
      .map((e) => `${e.label || ''} ${e.text || ''}`)
      .join(' ')
      .toLowerCase();
    if (textStr.includes('book') || textStr.includes('spine') || textStr.includes('jacket') || textStr.includes('hinge'))
      return 'BOOKS';
    if (textStr.includes('folder') || textStr.includes('pocket') || textStr.includes('brochure'))
      return 'FOLDERS';
    if (
      textStr.includes('box') ||
      textStr.includes('tuck') ||
      textStr.includes('flap') ||
      textStr.includes('mailer') ||
      textStr.includes('pillow')
    )
      return 'PACKAGING';
    if (textStr.includes('tag') || textStr.includes('euro') || textStr.includes('eyelet'))
      return 'TAGS';
    return 'CUSTOM';
  };

  // Save current design to library
  const handleSaveCurrentDesign = useCallback(
    (title, elementsToSave) => {
      const list = elementsToSave || keylineElements;
      if (!list || list.length === 0) return;
      const cat = detectCategory(list);
      const newProject = {
        id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        title: title || `Keyline Design ${new Date().toLocaleDateString()}`,
        category: cat,
        createdAt: new Date().toISOString(),
        sheetWidth,
        sheetHeight,
        elementCount: list.length,
        elements: JSON.parse(JSON.stringify(list))
      };
      setSavedDesigns((prev) => {
        const updated = [newProject, ...prev];
        try {
          localStorage.setItem('prepress_saved_keylines', JSON.stringify(updated));
        } catch (err) {
          console.error('Failed to save to localStorage:', err);
        }
        return updated;
      });
      showToast(`Saved "${newProject.title}" to library!`);
    },
    [keylineElements, sheetWidth, sheetHeight]
  );

  // Apply new design or clear canvas
  const handleApplyNewDesign = useCallback(
    (newElements, designName) => {
      updateKeylineElementsWithHistory(newElements);
      setSelectedKeylineId(null);
      setSelectedKeylineIds([]);
      showToast(`Started new canvas: ${designName}`);
    },
    [updateKeylineElementsWithHistory]
  );

  // Restore saved design from library
  const handleLoadSavedDesign = useCallback(
    (savedProject) => {
      if (!savedProject) return;
      if (savedProject.sheetWidth && savedProject.sheetHeight) {
        setSheetWidth(savedProject.sheetWidth);
        setSheetHeight(savedProject.sheetHeight);
        setSheetPreset('CUSTOM');
      }
      updateKeylineElementsWithHistory(savedProject.elements || []);
      setSelectedKeylineId(null);
      setSelectedKeylineIds([]);
      setIsSavedLibraryOpen(false);
      showToast(`Restored "${savedProject.title}" to canvas!`);
    },
    [updateKeylineElementsWithHistory]
  );

  // Delete saved design from library
  const handleDeleteSavedDesign = useCallback((designId) => {
    setSavedDesigns((prev) => {
      const updated = prev.filter((p) => p.id !== designId);
      try {
        localStorage.setItem('prepress_saved_keylines', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to update localStorage:', err);
      }
      return updated;
    });
    showToast('Deleted project from library', 'info');
  }, []);

  // Handle Preset Sheet Size Selection
  const handleSelectPreset = (p) => {
    setSheetPreset(p.name);
    setSheetWidth(p.width);
    setSheetHeight(p.height);
  };

  // Upload Background Tracing File (Image or PDF)
  const handleTraceFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setTraceImage(ev.target.result);
        setShowTrace(true);
        showToast(`Loaded reference image: ${file.name}`);
      };
      reader.readAsDataURL(file);
    } else {
      showToast('Please upload an image file (PNG, JPG, SVG) for tracing background.', 'warning');
    }
  };

  // ─── SAVE & DOWNLOAD ONLY (SVG CAD VECTOR) ──────────────────────────────
  const handleSaveAndDownloadSVG = () => {
    if (keylineElements.length === 0) {
      showToast('Draw keylines before exporting', 'warning');
      return;
    }

    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by Prepress Studio - Standalone CAD Keyline & Dieline Vector Export -->
<svg xmlns="http://www.w3.org/2000/svg" width="${sheetWidth}mm" height="${sheetHeight}mm" viewBox="0 0 ${sheetWidth} ${sheetHeight}">
  <title>Prepress Keyline Dieline - ${sheetWidth}x${sheetHeight}mm</title>
  <defs>
    <!-- Packaging CAD Hatch Patterns for Glue and Varnish Areas -->
    <pattern id="cadHatchDiagonal" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#8B5CF6" stroke-width="1.2" opacity="0.75" />
    </pattern>
    <pattern id="cadHatchCross" width="8" height="8" patternUnits="userSpaceOnUse">
      <path d="M 0 0 L 8 8 M 8 0 L 0 8" stroke="#009EE3" stroke-width="0.8" opacity="0.6" />
    </pattern>
    <pattern id="cadHatchDots" width="6" height="6" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="3" r="1.2" fill="#E6007A" opacity="0.65" />
    </pattern>
  </defs>
  <g id="KEYLINE_CAD_LAYER">
`;

    keylineElements.forEach((el) => {
      const mode = el.fillMode || 'none';
      let fillAttr = 'fill="none"';
      if (mode === 'solid') fillAttr = `fill="${el.fillColor || '#FCE7F3'}" fill-opacity="1"`;
      else if (mode === 'tint') fillAttr = `fill="${el.fillColor || '#FCE7F3'}" fill-opacity="${el.fillOpacity ?? 0.25}"`;
      else if (mode === 'hatch_diagonal') fillAttr = 'fill="url(#cadHatchDiagonal)" fill-opacity="1"';
      else if (mode === 'hatch_cross') fillAttr = 'fill="url(#cadHatchCross)" fill-opacity="1"';
      else if (mode === 'hatch_dots') fillAttr = 'fill="url(#cadHatchDots)" fill-opacity="1"';
      else if (el.fillColor && el.fillColor !== 'none') fillAttr = `fill="${el.fillColor}" fill-opacity="${el.fillOpacity ?? 0}"`;

      const strokeDashAttr = el.strokeDash ? `stroke-dasharray="${el.strokeDash}"` : '';

      if (el.type === 'rect') {
        svgContent += `    <rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth || 1}" ${strokeDashAttr} ${fillAttr} />\n`;
      } else if (el.type === 'roundrect') {
        svgContent += `    <rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${el.rx || 8}" ry="${el.rx || 8}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth || 1}" ${strokeDashAttr} ${fillAttr} />\n`;
      } else if (el.type === 'circle') {
        svgContent += `    <circle cx="${el.cx}" cy="${el.cy}" r="${el.r}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth || 1}" ${strokeDashAttr} ${fillAttr} />\n`;
      } else if (el.type === 'ellipse') {
        svgContent += `    <ellipse cx="${el.cx}" cy="${el.cy}" rx="${el.rx}" ry="${el.ry}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth || 1}" ${strokeDashAttr} ${fillAttr} />\n`;
      } else if (el.type === 'line') {
        svgContent += `    <line x1="${el.x1}" y1="${el.y1}" x2="${el.x2}" y2="${el.y2}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth || 1}" ${strokeDashAttr} />\n`;
      } else if (el.type === 'curve') {
        svgContent += `    <path d="M ${el.x1} ${el.y1} Q ${el.cx} ${el.cy} ${el.x2} ${el.y2}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth || 1}" ${strokeDashAttr} ${fillAttr} stroke-linecap="round" />\n`;
      } else if (el.type === 'polygon') {
        const sides = el.sides || 3;
        const pts = [];
        for (let i = 0; i < sides; i++) {
          const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
          pts.push(`${Math.round((el.cx + el.r * Math.cos(angle)) * 10) / 10},${Math.round((el.cy + el.r * Math.sin(angle)) * 10) / 10}`);
        }
        svgContent += `    <polygon points="${pts.join(' ')}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth || 1}" ${strokeDashAttr} ${fillAttr} />\n`;
      } else if (el.type === 'measure') {
        const len = Math.round(Math.hypot(el.x2 - el.x1, el.y2 - el.y1));
        const midX = (el.x1 + el.x2) / 2;
        const midY = (el.y1 + el.y2) / 2;
        svgContent += `    <g id="dim_${el.id}">\n`;
        svgContent += `      <line x1="${el.x1}" y1="${el.y1}" x2="${el.x2}" y2="${el.y2}" stroke="#3B82F6" stroke-width="1.2" stroke-dasharray="4,2" />\n`;
        svgContent += `      <text x="${midX}" y="${midY}" fill="#3B82F6" font-size="8" font-family="monospace" font-weight="bold" text-anchor="middle">${len}mm</text>\n`;
        svgContent += `    </g>\n`;
      } else if (el.type === 'freehand') {
        let d = `M ${el.points[0].x} ${el.points[0].y}`;
        for (let i = 1; i < el.points.length; i++) d += ` L ${el.points[i].x} ${el.points[i].y}`;
        svgContent += `    <path d="${d}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth || 1}" ${strokeDashAttr} ${fillAttr} stroke-linecap="round" stroke-linejoin="round" />\n`;
      } else if (el.type === 'text') {
        svgContent += `    <text x="${el.x}" y="${el.y}" fill="${el.color || el.strokeColor}" font-size="${el.fontSize}" font-family="monospace" font-weight="${el.fontWeight || 'bold'}">${el.text}</text>\n`;
      }
    });

    svgContent += `  </g>\n</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Keyline_Dieline_${sheetWidth}x${sheetHeight}mm.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Downloaded Keyline CAD SVG file!');
  };

  // ─── SAVE AS JSON SPEC ──────────────────────────────────────────────────
  const handleSaveJSON = () => {
    const data = {
      version: '2.4',
      date: new Date().toISOString(),
      sheetWidth,
      sheetHeight,
      unit: 'mm',
      elementCount: keylineElements.length,
      elements: keylineElements
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Keyline_Specs_${sheetWidth}x${sheetHeight}mm.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded Keyline JSON Spec file!');
  };

  // ─── OPTION TO SEND / UPLOAD TO IMPOSITION ──────────────────────────────
  const handleSendToImpositionClick = () => {
    if (keylineElements.length === 0) {
      if (!window.confirm('No keylines drawn yet. Proceed to Imposition anyway?')) return;
    }

    if (onSendToImposition) {
      onSendToImposition({
        keylineElements,
        sheetWidth,
        sheetHeight,
        sheetPreset
      });
    }
  };

  // ─── APPLY PACKAGING BOX DIELINE FROM CAD GENERATOR ─────────────────────
  const handleApplyBoxDieline = (newElements, append = false) => {
    if (append) {
      updateKeylineElementsWithHistory([...keylineElements, ...newElements]);
      showToast(`Appended ${newElements.length} box keyline elements to canvas`);
    } else {
      updateKeylineElementsWithHistory(newElements);
      showToast(`Generated full ${newElements.length}-element packaging box dieline!`);
    }
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto py-1 px-1 sm:px-3 space-y-3 font-sans">
      {/* ─── Top Studio Header Bar ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-fuchsia-950/40 border border-fuchsia-500/30 shadow-2xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono"
            title="Return to Main Prepress Workflow"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Workflow</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-fuchsia-500/30">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider m-0">
                  Keyline & Dieline Drawing Studio
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-700/60 font-semibold">
                  Independent Designer Tool
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono m-0">
                Draw, drag, and annotate precision cutting dies, crease rules, and perforation keylines.
              </p>
            </div>
          </div>
        </div>

        {/* Center: Canvas Sheet Preset Picker */}
        <div className="flex items-center gap-2 bg-[#10141D] p-1.5 rounded-xl border border-white/10">
          <span className="text-[11px] font-mono text-slate-400 pl-1">Canvas:</span>
          <select
            value={sheetPreset}
            onChange={(e) => {
              const p = CANVAS_PRESETS.find((x) => x.name === e.target.value);
              if (p) handleSelectPreset(p);
            }}
            className="bg-[#141C2A] border border-[#233045] rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-fuchsia-500 cursor-pointer"
          >
            {CANVAS_PRESETS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1.5 pl-1 text-xs font-mono">
            <span className="text-slate-500 text-[10px]">W:</span>
            <input
              type="number"
              value={sheetWidth}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) setSheetWidth(val);
                setSheetPreset('CUSTOM');
              }}
              className="w-16 bg-[#162032] border border-cyan-500/30 rounded px-1.5 py-0.5 text-xs font-mono text-cyan-300 font-bold text-center focus:outline-none focus:border-cyan-400"
              title="Sheet Paper Width (mm)"
            />
            <span className="text-slate-500 text-[10px]">H:</span>
            <input
              type="number"
              value={sheetHeight}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) setSheetHeight(val);
                setSheetPreset('CUSTOM');
              }}
              className="w-16 bg-[#162032] border border-cyan-500/30 rounded px-1.5 py-0.5 text-xs font-mono text-cyan-300 font-bold text-center focus:outline-none focus:border-cyan-400"
              title="Sheet Paper Height (mm)"
            />
            <span className="text-[10px] text-slate-400 font-bold">mm</span>
          </div>
        </div>

        {/* Right Actions: Upload/Import, Save/Download ONLY or Send to Imposition */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Action: Quick Blank Sheet */}
          <button
            type="button"
            onClick={() => {
              if (keylineElements.length === 0 || window.confirm('Clear canvas to start a fresh blank drawing?')) {
                updateKeylineElementsWithHistory([]);
                setSelectedKeylineId(null);
                setSelectedKeylineIds([]);
                showToast('Blank canvas ready for custom drawing', 'info');
              }
            }}
            className="px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-xs font-mono font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            title="Start with a fresh, clean blank canvas to draw your own custom keyline"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Blank Canvas</span>
          </button>
          {/* Action 0A: New Design / Save & Clear */}
          <button
            type="button"
            onClick={() => setIsNewDesignModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-mono font-bold transition-all shadow-lg shadow-cyan-500/30 flex items-center gap-1.5 cursor-pointer border border-cyan-400/40"
            title="Save current drawing and start fresh to draw books, folders, boxes, tags, or any vector design"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-200 animate-pulse" />
            <span>New / Save & Clear</span>
          </button>

          {/* Action 0B: Saved Designs Library */}
          <button
            type="button"
            onClick={() => setIsSavedLibraryOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-cyan-300 hover:text-white border border-cyan-500/40 text-xs font-mono font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            title="View, restore, and export previously saved designs"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>My Designs ({savedDesigns.length})</span>
          </button>

          {/* Main 1-Click Action: Draw Box Keyline (CAD Wizard) */}
          <button
            type="button"
            onClick={() => setIsBoxModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white text-xs font-mono font-bold transition-all shadow-lg shadow-fuchsia-500/30 flex items-center gap-1.5 cursor-pointer border border-fuchsia-400/40"
            title="Generate packaging box keylines (Reverse Tuck, Straight Tuck, Pillow, Mailer)"
          >
            <Package className="w-4 h-4 text-white" />
            <span>Draw Box Keyline</span>
          </button>

          {/* Live Redraw / Laser Plotter Action */}
          <button
            type="button"
            onClick={() => setLivePlotTrigger(Date.now())}
            className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-cyan-300 hover:text-white border border-cyan-500/50 text-xs font-mono font-bold transition-all shadow-md shadow-cyan-950/40 flex items-center gap-1.5 cursor-pointer"
            title="Watch the laser cutter / dieline plotter draw the box live stroke by stroke"
          >
            <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
            <span>Re-draw Live</span>
          </button>

          {/* Keyline Dieline Uploader (.json or .svg) */}
          <input
            type="file"
            ref={keylineFileInputRef}
            onChange={handleImportKeylineFile}
            accept=".json,.svg,application/json,image/svg+xml"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => keylineFileInputRef.current?.click()}
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Upload previously saved Keyline file (.json or .svg) to edit or impose"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Upload Dieline</span>
          </button>

          {/* Reference Image / Artwork Uploader */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleTraceFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Upload an artwork image to trace over on the canvas"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xl:inline">Trace Artwork</span>
          </button>

          {/* Action 1A: Save & Download ONLY (SVG CAD) */}
          <button
            type="button"
            onClick={handleSaveAndDownloadSVG}
            disabled={keylineElements.length === 0}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-fuchsia-300 hover:text-white border border-fuchsia-500/40 text-xs font-mono font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            title="Download vector SVG dieline directly without imposition (for cutting plotters)"
          >
            <Download className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>Save & Download CAD (SVG)</span>
          </button>

          {/* Action 1B: Save as JSON */}
          <button
            type="button"
            onClick={handleSaveJSON}
            disabled={keylineElements.length === 0}
            className="px-2.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            title="Download dieline specifications as JSON CAD project"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden 2xl:inline">JSON</span>
          </button>

          {/* Action 2: Option to Send to Imposition */}
          <button
            type="button"
            onClick={handleSendToImpositionClick}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white text-xs font-mono font-bold transition-all shadow-lg shadow-fuchsia-500/30 flex items-center gap-1.5 cursor-pointer"
            title="Perform N-Up Imposition on Press Sheet using this Keyline Dieline"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Perform Imposition</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-18 right-6 z-50 p-3 rounded-xl bg-slate-900 border border-fuchsia-500 text-fuchsia-200 text-xs font-mono shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-fuchsia-400" />
          <span>{notification.msg}</span>
        </div>
      )}

      {/* ─── Main 2-Column Studio Workspace ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        {/* LEFT COLUMN: Controls, Drawing Tools, Color Choosing, Color Filling, Text Options (3.5 cols) */}
        <div className="lg:col-span-4 xl:col-span-3.5 space-y-3 max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
          <KeylineControlPanel
            activeTool={activeKeylineTool}
            setActiveTool={setActiveKeylineTool}
            currentLineType={keylineLineType}
            setCurrentLineType={setKeylineLineType}
            strokeColor={keylineStrokeColor}
            setStrokeColor={setKeylineStrokeColor}
            strokeWidth={keylineStrokeWidth}
            setStrokeWidth={setKeylineStrokeWidth}
            strokeDash={keylineStrokeDash}
            setStrokeDash={setKeylineStrokeDash}
            fillMode={keylineFillMode}
            setFillMode={setKeylineFillMode}
            fillColor={keylineFillColor}
            setFillColor={setKeylineFillColor}
            fillOpacity={keylineFillOpacity}
            setFillOpacity={setKeylineFillOpacity}
            textString={keylineText}
            setTextString={setKeylineText}
            fontSize={keylineFontSize}
            setFontSize={setKeylineFontSize}
            fontWeight={keylineFontWeight}
            setFontWeight={setKeylineFontWeight}
            textColor={keylineTextColor}
            setTextColor={setKeylineTextColor}
            snapToGrid={keylineSnapGrid}
            setSnapToGrid={setKeylineSnapGrid}
            gridSize={keylineGridSize}
            setGridSize={setKeylineGridSize}
            showGrid={keylineShowGrid}
            setShowGrid={setKeylineShowGrid}
            showRulers={keylineShowRulers}
            setShowRulers={setKeylineShowRulers}
            showTrace={showTrace}
            setShowTrace={setShowTrace}
            traceOpacity={traceOpacity}
            setTraceOpacity={setTraceOpacity}
            keylineElements={keylineElements}
            setKeylineElements={updateKeylineElementsWithHistory}
            selectedId={selectedKeylineId}
            setSelectedId={setSelectedKeylineId}
            selectedIds={selectedKeylineIds}
            setSelectedIds={setSelectedKeylineIds}
            selectedElement={keylineElements.find((el) => el.id === selectedKeylineId)}
            onUndo={handleKeylineUndo}
            onRedo={handleKeylineRedo}
            canUndo={keylineHistoryIndex > 0}
            canRedo={keylineHistoryIndex < keylineHistory.length - 1}
            onDuplicateSelected={handleKeylineDuplicateSelected}
            onDeleteSelected={handleKeylineDeleteSelected}
            onClearAll={handleKeylineClearAll}
            sheetWidth={sheetWidth}
            sheetHeight={sheetHeight}
            onSendToImposition={handleSendToImpositionClick}
            onExportSVG={handleSaveAndDownloadSVG}
            onOpenBoxModal={() => setIsBoxModalOpen(true)}
            onOpenNewDesignModal={() => setIsNewDesignModalOpen(true)}
            onOpenSavedLibrary={() => setIsSavedLibraryOpen(true)}
            savedDesignsCount={savedDesigns.length}
          />
        </div>

        {/* RIGHT COLUMN: Interactive Keyline Drawing Canvas (8.5 cols) */}
        <div className="lg:col-span-8 xl:col-span-8.5 min-w-0">
          <div className="glass-panel rounded-2xl p-3 shadow-2xl flex flex-col min-h-[calc(100vh-140px)]">
            <KeylineStudioCanvas
              sheetWidth={sheetWidth}
              sheetHeight={sheetHeight}
              keylineElements={keylineElements}
              setKeylineElements={updateKeylineElementsWithHistory}
              selectedId={selectedKeylineId}
              setSelectedId={setSelectedKeylineId}
              selectedIds={selectedKeylineIds}
              setSelectedIds={setSelectedKeylineIds}
              activeTool={activeKeylineTool}
              setActiveTool={setActiveKeylineTool}
              currentLineType={keylineLineType}
              strokeColor={keylineStrokeColor}
              strokeWidth={keylineStrokeWidth}
              strokeDash={keylineStrokeDash}
              fillMode={keylineFillMode}
              fillColor={keylineFillColor}
              fillOpacity={keylineFillOpacity}
              textString={keylineText}
              fontSize={keylineFontSize}
              fontWeight={keylineFontWeight}
              textColor={keylineTextColor}
              snapToGrid={keylineSnapGrid}
              gridSize={keylineGridSize}
              showGrid={keylineShowGrid}
              showRulers={keylineShowRulers}
              traceThumbnail={traceImage}
              showTrace={showTrace}
              traceOpacity={traceOpacity}
              onUndo={handleKeylineUndo}
              onRedo={handleKeylineRedo}
              canUndo={keylineHistoryIndex > 0}
              canRedo={keylineHistoryIndex < keylineHistory.length - 1}
              onDuplicateSelected={handleKeylineDuplicateSelected}
              onDeleteSelected={handleKeylineDeleteSelected}
              onClearAll={handleKeylineClearAll}
              onOpenBoxModal={() => setIsBoxModalOpen(true)}
              livePlotTrigger={livePlotTrigger}
            />
          </div>
        </div>
      </div>

      {/* Box Keyline CAD Generator Modal */}
      <BoxKeylineModal
        isOpen={isBoxModalOpen}
        onClose={() => setIsBoxModalOpen(false)}
        onApplyDieline={handleApplyBoxDieline}
        sheetWidth={sheetWidth}
        sheetHeight={sheetHeight}
      />

      {/* New Design / Save & Clear Modal */}
      <NewDesignModal
        isOpen={isNewDesignModalOpen}
        onClose={() => setIsNewDesignModalOpen(false)}
        currentElements={keylineElements}
        sheetWidth={sheetWidth}
        sheetHeight={sheetHeight}
        onSaveCurrentDesign={handleSaveCurrentDesign}
        onApplyNewDesign={handleApplyNewDesign}
        onOpenSavedLibrary={() => setIsSavedLibraryOpen(true)}
      />

      {/* Saved Designs Archive Modal */}
      <SavedDesignsModal
        isOpen={isSavedLibraryOpen}
        onClose={() => setIsSavedLibraryOpen(false)}
        savedDesigns={savedDesigns}
        onLoadDesign={handleLoadSavedDesign}
        onDeleteDesign={handleDeleteSavedDesign}
        onOpenNewDesignModal={() => setIsNewDesignModalOpen(true)}
      />
    </div>
  );
}
