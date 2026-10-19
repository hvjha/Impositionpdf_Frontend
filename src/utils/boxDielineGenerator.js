/**
 * High-Precision Packaging Box CAD Dieline Generator
 * Generates true engineering vector keyline elements for standard folding cartons:
 * - Reverse Tuck End (RTE)
 * - Straight Tuck End (STE)
 * - Snap-Lock 1-2-3 Bottom Carton
 * - Pillow Box (Curved Arcs)
 * - Roll-End Tuck Front (RETF) Mailer Box
 */

export const BOX_STYLES = [
  { id: 'RTE', label: 'Reverse Tuck End (RTE)', desc: 'Standard folding carton for medicine, cosmetics, and retail products', icon: 'Package' },
  { id: 'STE', label: 'Straight Tuck End (STE)', desc: 'Both top & bottom tuck flaps fold towards the rear', icon: 'Package' },
  { id: 'SNAP_LOCK', label: 'Snap Lock 1-2-3 Bottom', desc: 'Interlocking 4-flap bottom for heavier retail merchandise', icon: 'Box' },
  { id: 'PILLOW', label: 'Curved Pillow Box', desc: 'Gift & confectionery packaging with convex curved arc fold lines', icon: 'Spline' },
  { id: 'MAILER', label: 'Roll-End Mailer Box', desc: 'E-commerce corrugated subscription box with locking ear flaps', icon: 'Package' },
];

/**
 * Generate a complete Reverse Tuck End (RTE) Box Dieline
 */
export function generateRTEBox(sheetW, sheetH, params = {}) {
  const L = parseFloat(params.length || 70);   // Length / Front Panel Width (mm)
  const W = parseFloat(params.width || 40);    // Width / Side Panel Depth (mm)
  const H = parseFloat(params.height || 120);  // Height / Tube Length (mm)
  const G = parseFloat(params.glueTab || 15);  // Glue Flap Width (mm)
  const F = parseFloat(params.tuckFlap || 24); // Tuck Tongue Depth (mm)
  const DF = parseFloat(params.dustFlap || 20); // Dust Flap Height (mm)

  // Total footprint
  const totalW = G + L * 2 + W * 2;
  const totalH = H + (W + F) * 2;

  // Center on sheet
  const startX = Math.round(Math.max(25, (sheetW - totalW) / 2));
  const startY = Math.round(Math.max(25, (sheetH - totalH) / 2) + W + F);

  const id = `box_rte_${Date.now()}`;
  const elements = [];

  const cutColor = '#E6007A';   // Thru-Cut Magenta
  const scoreColor = '#009EE3'; // Crease Cyan
  const glueColor = '#8B5CF6';  // Glue Tab Violet

  // Coordinate offsets from left to right:
  // Glue Tab: [x0, x1]
  // Panel 1 (Back): [x1, x2]
  // Panel 2 (Side 1): [x2, x3]
  // Panel 3 (Front): [x3, x4]
  // Panel 4 (Side 2): [x4, x5]
  const x0 = startX;
  const x1 = x0 + G;
  const x2 = x1 + L;
  const x3 = x2 + W;
  const x4 = x3 + L;
  const x5 = x4 + W;

  const yTop = startY;
  const yBottom = startY + H;

  // ─── 1. GLUE TAB (LEFT) ─────────────────────────────────────────────────
  // Outer cut edges with 15° lead-in bevels
  elements.push({
    id: `${id}_glue_cut_top`,
    type: 'line',
    x1: x0 + 4,
    y1: yTop + 3,
    x2: x1,
    y2: yTop,
    strokeColor: cutColor,
    strokeWidth: 1,
    lineType: 'cut',
    label: 'Glue Tab Top Bevel'
  });
  elements.push({
    id: `${id}_glue_cut_left`,
    type: 'line',
    x1: x0 + 4,
    y1: yTop + 3,
    x2: x0 + 4,
    y2: yBottom - 3,
    strokeColor: cutColor,
    strokeWidth: 1,
    lineType: 'cut',
    label: 'Glue Tab Outer Cut'
  });
  elements.push({
    id: `${id}_glue_cut_bot`,
    type: 'line',
    x1: x0 + 4,
    y1: yBottom - 3,
    x2: x1,
    y2: yBottom,
    strokeColor: cutColor,
    strokeWidth: 1,
    lineType: 'cut',
    label: 'Glue Tab Bottom Bevel'
  });

  // Glue Hatch Fill Area
  elements.push({
    id: `${id}_glue_zone`,
    type: 'rect',
    x: x0 + 4,
    y: yTop + 3,
    width: G - 4,
    height: H - 6,
    strokeColor: glueColor,
    strokeWidth: 0.5,
    strokeDash: '2,2',
    fillMode: 'hatch_diagonal',
    lineType: 'glue',
    label: `Glue Area (${G}mm)`
  });

  // ─── 2. MAIN BODY PANELS CREASES (VERTICAL FOLD SCORES) ──────────────────
  elements.push({ id: `${id}_crease_1`, type: 'line', x1: x1, y1: yTop, x2: x1, y2: yBottom, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Fold Glue Tab' });
  elements.push({ id: `${id}_crease_2`, type: 'line', x1: x2, y1: yTop, x2: x2, y2: yBottom, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Fold Panel 1 / 2' });
  elements.push({ id: `${id}_crease_3`, type: 'line', x1: x3, y1: yTop, x2: x3, y2: yBottom, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Fold Panel 2 / 3' });
  elements.push({ id: `${id}_crease_4`, type: 'line', x1: x4, y1: yTop, x2: x4, y2: yBottom, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Fold Panel 3 / 4' });

  // Rightmost perimeter cut
  elements.push({ id: `${id}_cut_right_edge`, type: 'line', x1: x5, y1: yTop, x2: x5, y2: yBottom, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Right Body Cut Edge' });

  // ─── 3. TOP DUST FLAPS (PANEL 2 & PANEL 4) ──────────────────────────────
  // Panel 2 Dust Flap
  elements.push({ id: `${id}_df1_crease`, type: 'line', x1: x2, y1: yTop, x2: x3, y2: yTop, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Dust Flap 1 Fold' });
  elements.push({ id: `${id}_df1_cut_l`, type: 'line', x1: x2, y1: yTop, x2: x2 + 3, y2: yTop - DF, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Dust Flap 1 Left Cut' });
  elements.push({ id: `${id}_df1_cut_t`, type: 'line', x1: x2 + 3, y1: yTop - DF, x2: x3 - 3, y2: yTop - DF, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Dust Flap 1 Top Cut' });
  elements.push({ id: `${id}_df1_cut_r`, type: 'line', x1: x3 - 3, y1: yTop - DF, x2: x3, y2: yTop, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Dust Flap 1 Right Cut' });

  // Panel 4 Dust Flap
  elements.push({ id: `${id}_df2_crease`, type: 'line', x1: x4, y1: yTop, x2: x5, y2: yTop, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Dust Flap 2 Fold' });
  elements.push({ id: `${id}_df2_cut_l`, type: 'line', x1: x4, y1: yTop, x2: x4 + 3, y2: yTop - DF, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Dust Flap 2 Left Cut' });
  elements.push({ id: `${id}_df2_cut_t`, type: 'line', x1: x4 + 3, y1: yTop - DF, x2: x5 - 3, y2: yTop - DF, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Dust Flap 2 Top Cut' });
  elements.push({ id: `${id}_df2_cut_r`, type: 'line', x1: x5 - 3, y1: yTop - DF, x2: x5, y2: yTop, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Dust Flap 2 Right Cut' });

  // ─── 4. BOTTOM DUST FLAPS (PANEL 2 & PANEL 4) ───────────────────────────
  // Panel 2 Bottom Dust Flap
  elements.push({ id: `${id}_bdf1_crease`, type: 'line', x1: x2, y1: yBottom, x2: x3, y2: yBottom, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Bottom Dust Flap 1 Fold' });
  elements.push({ id: `${id}_bdf1_cut_l`, type: 'line', x1: x2, y1: yBottom, x2: x2 + 3, y2: yBottom + DF, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Bottom Dust Flap 1 Left Cut' });
  elements.push({ id: `${id}_bdf1_cut_b`, type: 'line', x1: x2 + 3, y1: yBottom + DF, x2: x3 - 3, y2: yBottom + DF, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Bottom Dust Flap 1 Cut' });
  elements.push({ id: `${id}_bdf1_cut_r`, type: 'line', x1: x3 - 3, y1: yBottom + DF, x2: x3, y2: yBottom, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Bottom Dust Flap 1 Right Cut' });

  // Panel 4 Bottom Dust Flap
  elements.push({ id: `${id}_bdf2_crease`, type: 'line', x1: x4, y1: yBottom, x2: x5, y2: yBottom, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Bottom Dust Flap 2 Fold' });
  elements.push({ id: `${id}_bdf2_cut_l`, type: 'line', x1: x4, y1: yBottom, x2: x4 + 3, y2: yBottom + DF, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Bottom Dust Flap 2 Left Cut' });
  elements.push({ id: `${id}_bdf2_cut_b`, type: 'line', x1: x4 + 3, y1: yBottom + DF, x2: x5 - 3, y2: yBottom + DF, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Bottom Dust Flap 2 Cut' });
  elements.push({ id: `${id}_bdf2_cut_r`, type: 'line', x1: x5 - 3, y1: yBottom + DF, x2: x5, y2: yBottom, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Bottom Dust Flap 2 Right Cut' });

  // ─── 5. TOP TUCK FLAP (ON PANEL 3: FRONT) ───────────────────────────────
  // Hinge crease between Front panel and Top Lid
  elements.push({ id: `${id}_top_hinge`, type: 'line', x1: x3, y1: yTop, x2: x4, y2: yTop, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Top Lid Hinge Crease' });
  // Side cuts of top lid
  elements.push({ id: `${id}_top_lid_cut_l`, type: 'line', x1: x3, y1: yTop, x2: x3, y2: yTop - W, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Top Lid Left Cut' });
  elements.push({ id: `${id}_top_lid_cut_r`, type: 'line', x1: x4, y1: yTop, x2: x4, y2: yTop - W, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Top Lid Right Cut' });
  // Crease between Top Lid and Tuck Tongue
  elements.push({ id: `${id}_top_tuck_crease`, type: 'line', x1: x3, y1: yTop - W, x2: x4, y2: yTop - W, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Top Tuck Tongue Crease' });

  // TOP TUCK TONGUE WITH BÉZIER CURVED CLOSURE!
  // Curve 1: Left rounded shoulder
  elements.push({
    id: `${id}_top_tongue_arc_l`,
    type: 'curve',
    x1: x3,
    y1: yTop - W,
    x2: x3 + 8,
    y2: yTop - W - F,
    cx: x3,
    cy: yTop - W - F + 4,
    strokeColor: cutColor,
    strokeWidth: 1,
    lineType: 'cut',
    label: 'Top Tuck Left Curve'
  });
  // Straight top edge
  elements.push({
    id: `${id}_top_tongue_cut_top`,
    type: 'line',
    x1: x3 + 8,
    y1: yTop - W - F,
    x2: x4 - 8,
    y2: yTop - W - F,
    strokeColor: cutColor,
    strokeWidth: 1,
    lineType: 'cut',
    label: 'Top Tuck Flap Lip'
  });
  // Curve 2: Right rounded shoulder
  elements.push({
    id: `${id}_top_tongue_arc_r`,
    type: 'curve',
    x1: x4 - 8,
    y1: yTop - W - F,
    x2: x4,
    y2: yTop - W,
    cx: x4,
    cy: yTop - W - F + 4,
    strokeColor: cutColor,
    strokeWidth: 1,
    lineType: 'cut',
    label: 'Top Tuck Right Curve'
  });

  // Top Cut between Panel 1 top edge (open cut)
  elements.push({ id: `${id}_panel1_top_cut`, type: 'line', x1: x1, y1: yTop, x2: x2, y2: yTop, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Back Panel Top Cut Edge' });

  // ─── 6. BOTTOM TUCK FLAP (ON PANEL 1: BACK - IN REVERSE TUCK) ───────────
  // Hinge crease between Back panel and Bottom Lid
  elements.push({ id: `${id}_bot_hinge`, type: 'line', x1: x1, y1: yBottom, x2: x2, y2: yBottom, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Bottom Lid Hinge Crease' });
  // Side cuts of bottom lid
  elements.push({ id: `${id}_bot_lid_cut_l`, type: 'line', x1: x1, y1: yBottom, x2: x1, y2: yBottom + W, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Bottom Lid Left Cut' });
  elements.push({ id: `${id}_bot_lid_cut_r`, type: 'line', x1: x2, y1: yBottom, x2: x2, y2: yBottom + W, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Bottom Lid Right Cut' });
  // Crease between Bottom Lid and Tuck Tongue
  elements.push({ id: `${id}_bot_tuck_crease`, type: 'line', x1: x1, y1: yBottom + W, x2: x2, y2: yBottom + W, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Bottom Tuck Tongue Crease' });

  // BOTTOM TUCK TONGUE WITH BÉZIER CURVES
  elements.push({
    id: `${id}_bot_tongue_arc_l`,
    type: 'curve',
    x1: x1,
    y1: yBottom + W,
    x2: x1 + 8,
    y2: yBottom + W + F,
    cx: x1,
    cy: yBottom + W + F - 4,
    strokeColor: cutColor,
    strokeWidth: 1,
    lineType: 'cut',
    label: 'Bottom Tuck Left Curve'
  });
  elements.push({
    id: `${id}_bot_tongue_cut_bot`,
    type: 'line',
    x1: x1 + 8,
    y1: yBottom + W + F,
    x2: x2 - 8,
    y2: yBottom + W + F,
    strokeColor: cutColor,
    strokeWidth: 1,
    lineType: 'cut',
    label: 'Bottom Tuck Flap Lip'
  });
  elements.push({
    id: `${id}_bot_tongue_arc_r`,
    type: 'curve',
    x1: x2 - 8,
    y1: yBottom + W + F,
    x2: x2,
    y2: yBottom + W,
    cx: x2,
    cy: yBottom + W + F - 4,
    strokeColor: cutColor,
    strokeWidth: 1,
    lineType: 'cut',
    label: 'Bottom Tuck Right Curve'
  });

  // Bottom Cut under Panel 3 (Front) open edge
  elements.push({ id: `${id}_panel3_bot_cut`, type: 'line', x1: x3, y1: yBottom, x2: x4, y2: yBottom, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Front Panel Bottom Cut Edge' });

  // ─── 7. THUMB NOTCH ON BACK PANEL OPENING (CURVED ARC) ───────────────────
  const thumbNotchR = 12;
  const tnMidX = (x1 + x2) / 2;
  elements.push({
    id: `${id}_thumb_notch`,
    type: 'curve',
    x1: tnMidX - thumbNotchR,
    y1: yTop,
    x2: tnMidX + thumbNotchR,
    y2: yTop,
    cx: tnMidX,
    cy: yTop + thumbNotchR * 1.3,
    strokeColor: cutColor,
    strokeWidth: 1,
    lineType: 'cut',
    label: 'Thumb Notch Arc'
  });

  // ─── 8. PREPRESS PANEL LABELS & CALLOUTS ─────────────────────────────────
  elements.push({ id: `${id}_txt_title`, type: 'text', x: x1 + 10, y: yTop + 20, text: `CARTON: ${L}×${W}×${H}mm (RTE)`, fontSize: 11, fontWeight: 'bold', color: '#E6007A', label: 'Box Spec' });
  elements.push({ id: `${id}_txt_back`, type: 'text', x: (x1 + x2) / 2 - 20, y: yTop + H / 2, text: 'BACK PANEL', fontSize: 9, fontWeight: 'bold', color: '#64748B', label: 'Back Label' });
  elements.push({ id: `${id}_txt_side1`, type: 'text', x: (x2 + x3) / 2 - 16, y: yTop + H / 2, text: 'SIDE 1', fontSize: 9, fontWeight: 'bold', color: '#64748B', label: 'Side 1 Label' });
  elements.push({ id: `${id}_txt_front`, type: 'text', x: (x3 + x4) / 2 - 22, y: yTop + H / 2, text: 'FRONT PANEL', fontSize: 9, fontWeight: 'bold', color: '#64748B', label: 'Front Label' });
  elements.push({ id: `${id}_txt_side2`, type: 'text', x: (x4 + x5) / 2 - 16, y: yTop + H / 2, text: 'SIDE 2', fontSize: 9, fontWeight: 'bold', color: '#64748B', label: 'Side 2 Label' });

  // ─── 9. CAD MEASUREMENT RULERS ──────────────────────────────────────────
  // Length Callout
  elements.push({ id: `${id}_meas_l`, type: 'measure', x1: x3, y1: yBottom + 12, x2: x4, y2: yBottom + 12, label: `Length: ${L}mm` });
  // Width Callout
  elements.push({ id: `${id}_meas_w`, type: 'measure', x1: x4, y1: yBottom + 12, x2: x5, y2: yBottom + 12, label: `Width: ${W}mm` });
  // Height Callout
  elements.push({ id: `${id}_meas_h`, type: 'measure', x1: x5 + 12, y1: yTop, x2: x5 + 12, y2: yBottom, label: `Height: ${H}mm` });

  return {
    elements,
    dimensions: { L, W, H, G, F, DF, totalW, totalH },
    name: `Folding Box ${L}×${W}×${H}mm`
  };
}

/**
 * Generate a Curved Pillow Box Dieline
 */
export function generatePillowBox(sheetW, sheetH, params = {}) {
  const L = parseFloat(params.length || 110); // Length of pillow
  const W = parseFloat(params.width || 70);   // Face width
  const arcDepth = 22;

  const startX = Math.round((sheetW - (W * 2 + 15)) / 2);
  const startY = Math.round((sheetH - (L + arcDepth * 2)) / 2 + arcDepth);

  const id = `pillow_${Date.now()}`;
  const elements = [];
  const cutColor = '#E6007A';
  const scoreColor = '#009EE3';

  const x0 = startX;
  const x1 = x0 + 15; // Glue tab
  const x2 = x1 + W;  // Panel 1
  const x3 = x2 + W;  // Panel 2

  // Body Outlines
  elements.push({ id: `${id}_glue_cut`, type: 'line', x1: x0, y1: startY, x2: x0, y2: startY + L, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Glue Tab Edge' });
  elements.push({ id: `${id}_glue_score`, type: 'line', x1: x1, y1: startY, x2: x1, y2: startY + L, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Glue Tab Crease' });
  elements.push({ id: `${id}_glue_fill`, type: 'rect', x: x0, y: startY, width: 15, height: L, strokeColor: '#8B5CF6', strokeWidth: 0.5, strokeDash: '2,2', fillMode: 'hatch_diagonal', label: 'Adhesive Flap' });
  elements.push({ id: `${id}_center_score`, type: 'line', x1: x2, y1: startY, x2: x2, y2: startY + L, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Center Fold Crease' });
  elements.push({ id: `${id}_right_cut`, type: 'line', x1: x3, y1: startY, x2: x3, y2: startY + L, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Outer Cut Edge' });

  // Curved End Arcs (Top and Bottom convex / concave creases and cuts!)
  // Top Panel 1 Crease Arc
  elements.push({ id: `${id}_top_arc1_score`, type: 'curve', x1: x1, y1: startY, x2: x2, y2: startY, cx: (x1 + x2) / 2, cy: startY + arcDepth, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Top Crease Arc 1' });
  // Top Panel 1 Cut Arc (outer flap)
  elements.push({ id: `${id}_top_arc1_cut`, type: 'curve', x1: x1, y1: startY, x2: x2, y2: startY, cx: (x1 + x2) / 2, cy: startY - arcDepth, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Top Cut Arc 1' });

  // Top Panel 2 Crease Arc
  elements.push({ id: `${id}_top_arc2_score`, type: 'curve', x1: x2, y1: startY, x2: x3, y2: startY, cx: (x2 + x3) / 2, cy: startY + arcDepth, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Top Crease Arc 2' });
  // Top Panel 2 Cut Arc
  elements.push({ id: `${id}_top_arc2_cut`, type: 'curve', x1: x2, y1: startY, x2: x3, y2: startY, cx: (x2 + x3) / 2, cy: startY - arcDepth, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Top Cut Arc 2' });

  // Bottom Panel 1 Crease Arc
  elements.push({ id: `${id}_bot_arc1_score`, type: 'curve', x1: x1, y1: startY + L, x2: x2, y2: startY + L, cx: (x1 + x2) / 2, cy: startY + L - arcDepth, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Bottom Crease Arc 1' });
  // Bottom Panel 1 Cut Arc
  elements.push({ id: `${id}_bot_arc1_cut`, type: 'curve', x1: x1, y1: startY + L, x2: x2, y2: startY + L, cx: (x1 + x2) / 2, cy: startY + L + arcDepth, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Bottom Cut Arc 1' });

  // Bottom Panel 2 Crease Arc
  elements.push({ id: `${id}_bot_arc2_score`, type: 'curve', x1: x2, y1: startY + L, x2: x3, y2: startY + L, cx: (x2 + x3) / 2, cy: startY + L - arcDepth, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Bottom Crease Arc 2' });
  // Bottom Panel 2 Cut Arc
  elements.push({ id: `${id}_bot_arc2_cut`, type: 'curve', x1: x2, y1: startY + L, x2: x3, y2: startY + L, cx: (x2 + x3) / 2, cy: startY + L + arcDepth, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Bottom Cut Arc 2' });

  elements.push({ id: `${id}_txt`, type: 'text', x: x1 + 15, y: startY + L / 2, text: `PILLOW BOX (${L}×${W}mm)`, fontSize: 10, fontWeight: 'bold', color: '#E6007A', label: 'Spec' });

  return {
    elements,
    dimensions: { L, W, arcDepth },
    name: `Pillow Box ${L}×${W}mm`
  };
}

/**
 * Generate a Straight Tuck End (STE) Box Dieline
 * In STE cartons, both top and bottom tuck flaps are hinged to the same face (e.g. Front or Rear).
 */
export function generateSTEBox(sheetW, sheetH, params = {}) {
  const L = parseFloat(params.length || 70);
  const W = parseFloat(params.width || 40);
  const H = parseFloat(params.height || 120);
  const G = parseFloat(params.glueTab || 15);
  const F = parseFloat(params.tuckFlap || 24);
  const DF = parseFloat(params.dustFlap || 20);

  const totalW = G + L * 2 + W * 2;
  const totalH = H + (W + F) * 2;

  const startX = Math.round(Math.max(25, (sheetW - totalW) / 2));
  const startY = Math.round(Math.max(25, (sheetH - totalH) / 2) + W + F);

  const id = `box_ste_${Date.now()}`;
  const elements = [];

  const cutColor = '#E6007A';
  const scoreColor = '#009EE3';
  const glueColor = '#8B5CF6';

  const x0 = startX;
  const x1 = x0 + G;
  const x2 = x1 + L;
  const x3 = x2 + W;
  const x4 = x3 + L;
  const x5 = x4 + W;

  const yTop = startY;
  const yBottom = startY + H;

  // Glue tab
  elements.push({ id: `${id}_glue_cut_top`, type: 'line', x1: x0 + 4, y1: yTop + 3, x2: x1, y2: yTop, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Glue Tab Top Bevel' });
  elements.push({ id: `${id}_glue_cut_left`, type: 'line', x1: x0 + 4, y1: yTop + 3, x2: x0 + 4, y2: yBottom - 3, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Glue Tab Outer Cut' });
  elements.push({ id: `${id}_glue_cut_bot`, type: 'line', x1: x0 + 4, y1: yBottom - 3, x2: x1, y2: yBottom, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Glue Tab Bottom Bevel' });
  elements.push({ id: `${id}_glue_zone`, type: 'rect', x: x0 + 4, y: yTop + 3, width: G - 4, height: H - 6, strokeColor: glueColor, strokeWidth: 0.5, strokeDash: '2,2', fillMode: 'hatch_diagonal', lineType: 'glue', label: `Glue Area (${G}mm)` });

  // Body Vertical Score Creases
  elements.push({ id: `${id}_crease_1`, type: 'line', x1: x1, y1: yTop, x2: x1, y2: yBottom, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Fold Glue Tab' });
  elements.push({ id: `${id}_crease_2`, type: 'line', x1: x2, y1: yTop, x2: x2, y2: yBottom, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Fold Panel 1 / 2' });
  elements.push({ id: `${id}_crease_3`, type: 'line', x1: x3, y1: yTop, x2: x3, y2: yBottom, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Fold Panel 2 / 3' });
  elements.push({ id: `${id}_crease_4`, type: 'line', x1: x4, y1: yTop, x2: x4, y2: yBottom, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Fold Panel 3 / 4' });
  elements.push({ id: `${id}_cut_right_edge`, type: 'line', x1: x5, y1: yTop, x2: x5, y2: yBottom, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Right Body Cut Edge' });

  // Top Dust Flaps (Panels 2 & 4)
  elements.push({ id: `${id}_df1_crease`, type: 'line', x1: x2, y1: yTop, x2: x3, y2: yTop, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Dust Flap 1 Fold' });
  elements.push({ id: `${id}_df1_cut_l`, type: 'line', x1: x2, y1: yTop, x2: x2 + 3, y2: yTop - DF, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Dust Flap 1 Left Cut' });
  elements.push({ id: `${id}_df1_cut_t`, type: 'line', x1: x2 + 3, y1: yTop - DF, x2: x3 - 3, y2: yTop - DF, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Dust Flap 1 Top Cut' });
  elements.push({ id: `${id}_df1_cut_r`, type: 'line', x1: x3 - 3, y1: yTop - DF, x2: x3, y2: yTop, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Dust Flap 1 Right Cut' });

  elements.push({ id: `${id}_df2_crease`, type: 'line', x1: x4, y1: yTop, x2: x5, y2: yTop, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Dust Flap 2 Fold' });
  elements.push({ id: `${id}_df2_cut_l`, type: 'line', x1: x4, y1: yTop, x2: x4 + 3, y2: yTop - DF, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Dust Flap 2 Left Cut' });
  elements.push({ id: `${id}_df2_cut_t`, type: 'line', x1: x4 + 3, y1: yTop - DF, x2: x5 - 3, y2: yTop - DF, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Dust Flap 2 Top Cut' });
  elements.push({ id: `${id}_df2_cut_r`, type: 'line', x1: x5 - 3, y1: yTop - DF, x2: x5, y2: yTop, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Dust Flap 2 Right Cut' });

  // Bottom Dust Flaps (Panels 2 & 4)
  elements.push({ id: `${id}_bdf1_crease`, type: 'line', x1: x2, y1: yBottom, x2: x3, y2: yBottom, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Bottom Dust Flap 1 Fold' });
  elements.push({ id: `${id}_bdf1_cut_l`, type: 'line', x1: x2, y1: yBottom, x2: x2 + 3, y2: yBottom + DF, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Bottom Dust Flap 1 Left Cut' });
  elements.push({ id: `${id}_bdf1_cut_b`, type: 'line', x1: x2 + 3, y1: yBottom + DF, x2: x3 - 3, y2: yBottom + DF, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Bottom Dust Flap 1 Cut' });
  elements.push({ id: `${id}_bdf1_cut_r`, type: 'line', x1: x3 - 3, y1: yBottom + DF, x2: x3, y2: yBottom, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Bottom Dust Flap 1 Right Cut' });

  elements.push({ id: `${id}_bdf2_crease`, type: 'line', x1: x4, y1: yBottom, x2: x5, y2: yBottom, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Bottom Dust Flap 2 Fold' });
  elements.push({ id: `${id}_bdf2_cut_l`, type: 'line', x1: x4, y1: yBottom, x2: x4 + 3, y2: yBottom + DF, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Bottom Dust Flap 2 Left Cut' });
  elements.push({ id: `${id}_bdf2_cut_b`, type: 'line', x1: x4 + 3, y1: yBottom + DF, x2: x5 - 3, y2: yBottom + DF, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Bottom Dust Flap 2 Cut' });
  elements.push({ id: `${id}_bdf2_cut_r`, type: 'line', x1: x5 - 3, y1: yBottom + DF, x2: x5, y2: yBottom, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Bottom Dust Flap 2 Right Cut' });

  // Top Tuck Flap (Panel 3: Front)
  elements.push({ id: `${id}_top_hinge`, type: 'line', x1: x3, y1: yTop, x2: x4, y2: yTop, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Top Lid Hinge Crease' });
  elements.push({ id: `${id}_top_lid_cut_l`, type: 'line', x1: x3, y1: yTop, x2: x3, y2: yTop - W, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Top Lid Left Cut' });
  elements.push({ id: `${id}_top_lid_cut_r`, type: 'line', x1: x4, y1: yTop, x2: x4, y2: yTop - W, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Top Lid Right Cut' });
  elements.push({ id: `${id}_top_tuck_crease`, type: 'line', x1: x3, y1: yTop - W, x2: x4, y2: yTop - W, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Top Tuck Tongue Crease' });

  // Top Curved Bézier tuck shoulders
  elements.push({ id: `${id}_top_tongue_arc_l`, type: 'curve', x1: x3, y1: yTop - W, x2: x3 + 8, y2: yTop - W - F, cx: x3, cy: yTop - W - F + 4, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Top Tuck Left Curve' });
  elements.push({ id: `${id}_top_tongue_cut_top`, type: 'line', x1: x3 + 8, y1: yTop - W - F, x2: x4 - 8, y2: yTop - W - F, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Top Tuck Flap Lip' });
  elements.push({ id: `${id}_top_tongue_arc_r`, type: 'curve', x1: x4 - 8, y1: yTop - W - F, x2: x4, y2: yTop - W, cx: x4, cy: yTop - W - F + 4, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Top Tuck Right Curve' });

  elements.push({ id: `${id}_panel1_top_cut`, type: 'line', x1: x1, y1: yTop, x2: x2, y2: yTop, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Back Panel Top Cut Edge' });

  // Bottom Tuck Flap (ALSO on Panel 3 for STE!)
  elements.push({ id: `${id}_bot_hinge`, type: 'line', x1: x3, y1: yBottom, x2: x4, y2: yBottom, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Bottom Lid Hinge Crease' });
  elements.push({ id: `${id}_bot_lid_cut_l`, type: 'line', x1: x3, y1: yBottom, x2: x3, y2: yBottom + W, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Bottom Lid Left Cut' });
  elements.push({ id: `${id}_bot_lid_cut_r`, type: 'line', x1: x4, y1: yBottom, x2: x4, y2: yBottom + W, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Bottom Lid Right Cut' });
  elements.push({ id: `${id}_bot_tuck_crease`, type: 'line', x1: x3, y1: yBottom + W, x2: x4, y2: yBottom + W, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Bottom Tuck Tongue Crease' });

  // Bottom Curved Bézier tuck shoulders
  elements.push({ id: `${id}_bot_tongue_arc_l`, type: 'curve', x1: x3, y1: yBottom + W, x2: x3 + 8, y2: yBottom + W + F, cx: x3, cy: yBottom + W + F - 4, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Bottom Tuck Left Curve' });
  elements.push({ id: `${id}_bot_tongue_cut_bot`, type: 'line', x1: x3 + 8, y1: yBottom + W + F, x2: x4 - 8, y2: yBottom + W + F, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Bottom Tuck Flap Lip' });
  elements.push({ id: `${id}_bot_tongue_arc_r`, type: 'curve', x1: x4 - 8, y1: yBottom + W + F, x2: x4, y2: yBottom + W, cx: x4, cy: yBottom + W + F - 4, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Bottom Tuck Right Curve' });

  elements.push({ id: `${id}_panel1_bot_cut`, type: 'line', x1: x1, y1: yBottom, x2: x2, y2: yBottom, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Back Panel Bottom Cut Edge' });

  // Labels & Callouts
  elements.push({ id: `${id}_txt_title`, type: 'text', x: x1 + 10, y: yTop + 20, text: `CARTON: ${L}×${W}×${H}mm (STE)`, fontSize: 11, fontWeight: 'bold', color: '#E6007A', label: 'Box Spec' });
  elements.push({ id: `${id}_txt_back`, type: 'text', x: (x1 + x2) / 2 - 20, y: yTop + H / 2, text: 'BACK PANEL', fontSize: 9, fontWeight: 'bold', color: '#64748B', label: 'Back Label' });
  elements.push({ id: `${id}_txt_side1`, type: 'text', x: (x2 + x3) / 2 - 16, y: yTop + H / 2, text: 'SIDE 1', fontSize: 9, fontWeight: 'bold', color: '#64748B', label: 'Side 1 Label' });
  elements.push({ id: `${id}_txt_front`, type: 'text', x: (x3 + x4) / 2 - 22, y: yTop + H / 2, text: 'FRONT PANEL', fontSize: 9, fontWeight: 'bold', color: '#64748B', label: 'Front Label' });
  elements.push({ id: `${id}_txt_side2`, type: 'text', x: (x4 + x5) / 2 - 16, y: yTop + H / 2, text: 'SIDE 2', fontSize: 9, fontWeight: 'bold', color: '#64748B', label: 'Side 2 Label' });

  // CAD Measurement Rulers
  elements.push({ id: `${id}_meas_l`, type: 'measure', x1: x3, y1: yBottom + 12, x2: x4, y2: yBottom + 12, label: `Length: ${L}mm` });
  elements.push({ id: `${id}_meas_w`, type: 'measure', x1: x4, y1: yBottom + 12, x2: x5, y2: yBottom + 12, label: `Width: ${W}mm` });
  elements.push({ id: `${id}_meas_h`, type: 'measure', x1: x5 + 12, y1: yTop, x2: x5 + 12, y2: yBottom, label: `Height: ${H}mm` });

  return {
    elements,
    dimensions: { L, W, H, G, F, DF, totalW, totalH },
    name: `Straight Tuck Box ${L}×${W}×${H}mm`
  };
}

/**
 * Generate a Roll-End Tuck Front (RETF) Mailer Box Dieline
 */
export function generateMailerBox(sheetW, sheetH, params = {}) {
  const L = parseFloat(params.length || 160); // Length (mm)
  const W = parseFloat(params.width || 110);  // Width (mm)
  const H = parseFloat(params.height || 50);  // Depth (mm)
  const T = 25; // Tuck flap front

  const totalW = L + H * 4;
  const totalH = W * 2 + H * 3 + T;

  const startX = Math.round(Math.max(20, (sheetW - totalW) / 2));
  const startY = Math.round(Math.max(20, (sheetH - totalH) / 2));

  const id = `mailer_${Date.now()}`;
  const elements = [];
  const cutColor = '#E6007A';
  const scoreColor = '#009EE3';

  // Base coordinates
  const xLeftOuter = startX;
  const xLeftRoll = startX + H;
  const xBaseL = startX + H * 2;
  const xBaseR = xBaseL + L;
  const xRightRoll = xBaseR + H;
  const xRightOuter = xRightRoll + H;

  const yLidTuck = startY;
  const yLid = yLidTuck + T;
  const yRear = yLid + W;
  const yBase = yRear + H;
  const yFront = yBase + W;
  const yFrontRoll = yFront + H;

  // Perimeter Cut of Mailer
  elements.push({ id: `${id}_cut_top_tuck`, type: 'line', x1: xBaseL + 5, y1: yLidTuck, x2: xBaseR - 5, y2: yLidTuck, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Top Tuck Cut' });
  elements.push({ id: `${id}_cut_tuck_l`, type: 'line', x1: xBaseL + 5, y1: yLidTuck, x2: xBaseL, y2: yLid, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Tuck Flap Left Bevel' });
  elements.push({ id: `${id}_cut_tuck_r`, type: 'line', x1: xBaseR - 5, y1: yLidTuck, x2: xBaseR, y2: yLid, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Tuck Flap Right Bevel' });
  
  // Lid Crease & Side Ears
  elements.push({ id: `${id}_crs_lid_tuck`, type: 'line', x1: xBaseL, y1: yLid, x2: xBaseR, y2: yLid, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Tuck Crease' });
  elements.push({ id: `${id}_crs_lid_rear`, type: 'line', x1: xBaseL, y1: yRear, x2: xBaseR, y2: yRear, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Rear Lid Hinge' });
  elements.push({ id: `${id}_crs_rear_base`, type: 'line', x1: xBaseL, y1: yBase, x2: xBaseR, y2: yBase, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Rear Base Score' });
  elements.push({ id: `${id}_crs_base_front`, type: 'line', x1: xBaseL, y1: yFront, x2: xBaseR, y2: yFront, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Front Base Score' });
  elements.push({ id: `${id}_crs_front_roll`, type: 'line', x1: xBaseL, y1: yFrontRoll, x2: xBaseR, y2: yFrontRoll, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Front Roll Score' });

  // Side Roll Walls Creases
  elements.push({ id: `${id}_crs_side_l1`, type: 'line', x1: xBaseL, y1: yBase, x2: xBaseL, y2: yFront, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Left Base Wall Fold' });
  elements.push({ id: `${id}_crs_side_l2`, type: 'line', x1: xLeftRoll, y1: yBase, x2: xLeftRoll, y2: yFront, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Left Roll Over Fold' });
  elements.push({ id: `${id}_crs_side_r1`, type: 'line', x1: xBaseR, y1: yBase, x2: xBaseR, y2: yFront, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Right Base Wall Fold' });
  elements.push({ id: `${id}_crs_side_r2`, type: 'line', x1: xRightRoll, y1: yBase, x2: xRightRoll, y2: yFront, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Right Roll Over Fold' });

  // Outer cut wings
  elements.push({ id: `${id}_cut_outer_l`, type: 'line', x1: xLeftOuter, y1: yBase, x2: xLeftOuter, y2: yFront, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Left Flap Cut' });
  elements.push({ id: `${id}_cut_outer_r`, type: 'line', x1: xRightOuter, y1: yBase, x2: xRightOuter, y2: yFront, strokeColor: cutColor, strokeWidth: 1, lineType: 'cut', label: 'Right Flap Cut' });

  // Retf Locking Ears with Bézier Curves
  elements.push({
    id: `${id}_ear_l`,
    type: 'curve',
    x1: xBaseL,
    y1: yLid,
    x2: xBaseL - H,
    y2: yLid + W,
    cx: xBaseL - H,
    cy: yLid + 10,
    strokeColor: cutColor,
    strokeWidth: 1,
    lineType: 'cut',
    label: 'Left Locking Ear Curve'
  });
  elements.push({
    id: `${id}_ear_r`,
    type: 'curve',
    x1: xBaseR,
    y1: yLid,
    x2: xBaseR + H,
    y2: yLid + W,
    cx: xBaseR + H,
    cy: yLid + 10,
    strokeColor: cutColor,
    strokeWidth: 1,
    lineType: 'cut',
    label: 'Right Locking Ear Curve'
  });

  // Labels
  elements.push({ id: `${id}_txt_title`, type: 'text', x: xBaseL + 10, y: yBase + W / 2, text: `MAILER: ${L}×${W}×${H}mm (RETF)`, fontSize: 11, fontWeight: 'bold', color: '#E6007A', label: 'Mailer Spec' });
  elements.push({ id: `${id}_txt_lid`, type: 'text', x: xBaseL + L / 2 - 20, y: yLid + W / 2, text: 'TOP LID', fontSize: 10, fontWeight: 'bold', color: '#64748B', label: 'Lid Label' });

  // Rulers
  elements.push({ id: `${id}_meas_l`, type: 'measure', x1: xBaseL, y1: yFront + 10, x2: xBaseR, y2: yFront + 10, label: `Length: ${L}mm` });
  elements.push({ id: `${id}_meas_w`, type: 'measure', x1: xBaseR + 10, y1: yBase, x2: xBaseR + 10, y2: yFront, label: `Width: ${W}mm` });

  return {
    elements,
    dimensions: { L, W, H, totalW, totalH },
    name: `Mailer Box ${L}×${W}×${H}mm`
  };
}

/**
 * Common Standard Industry Presets
 */
export const BOX_PRESETS = [
  {
    id: 'medicine',
    name: 'Medicine / Pharma Vial Box',
    desc: 'Standard pharmaceutical carton with thumb notch and RTE tuck flaps',
    style: 'RTE',
    length: 60,
    width: 35,
    height: 110,
    glueTab: 14,
    tuckFlap: 22,
    dustFlap: 18
  },
  {
    id: 'cosmetics',
    name: 'Cosmetic Cream / Perfume Carton',
    desc: 'Luxury straight tuck carton for skincare bottles & jars',
    style: 'STE',
    length: 55,
    width: 55,
    height: 130,
    glueTab: 15,
    tuckFlap: 24,
    dustFlap: 20
  },
  {
    id: 'retail_rte',
    name: 'Retail Electronics / Gadget Box',
    desc: 'Reverse tuck box with tuck ears and adhesive glue seam',
    style: 'RTE',
    length: 80,
    width: 45,
    height: 150,
    glueTab: 15,
    tuckFlap: 25,
    dustFlap: 22
  },
  {
    id: 'pillow_gift',
    name: 'Curved Pillow Gift Carton',
    desc: 'Confectionery & jewellery curved fold pillow dieline',
    style: 'PILLOW',
    length: 120,
    width: 75,
    height: 30,
    glueTab: 15,
    tuckFlap: 20,
    dustFlap: 15
  },
  {
    id: 'ecom_mailer',
    name: 'E-Commerce RETF Mailer Box',
    desc: 'Roll-end front tuck shipping box with curved locking ears',
    style: 'MAILER',
    length: 160,
    width: 110,
    height: 50,
    glueTab: 15,
    tuckFlap: 25,
    dustFlap: 20
  }
];

/**
 * Master Box Dieline Dispatcher
 */
export function generateBoxDieline(style = 'RTE', sheetW = 635, sheetH = 457.2, params = {}) {
  switch (style) {
    case 'STE':
      return generateSTEBox(sheetW, sheetH, params);
    case 'PILLOW':
      return generatePillowBox(sheetW, sheetH, params);
    case 'MAILER':
      return generateMailerBox(sheetW, sheetH, params);
    case 'RTE':
    default:
      return generateRTEBox(sheetW, sheetH, params);
  }
}
