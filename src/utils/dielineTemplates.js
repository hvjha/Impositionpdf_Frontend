/**
 * Comprehensive Prepress Packaging & Publishing Dieline Templates
 * Supports:
 * 1. Books & Publishing (Paperback, Hardcover Jacket, Saddle Stitch)
 * 2. Folders & Brochures (Presentation Pocket Folders, Tri-Fold, Bi-Fold)
 * 3. Hangtags, Labels & Euro Slots
 * 4. Packaging Cartons (RTE, STE, Pillow, Mailer - re-exported from boxDielineGenerator)
 */

import {
  generateRTEBox,
  generateSTEBox,
  generatePillowBox,
  generateMailerBox,
  BOX_STYLES,
  BOX_PRESETS
} from './boxDielineGenerator';

export {
  generateRTEBox,
  generateSTEBox,
  generatePillowBox,
  generateMailerBox,
  BOX_STYLES,
  BOX_PRESETS
};

/**
 * ─── 1. BOOK COVER & SPINE DIELINE GENERATOR ─────────────────────────────────
 * Generates true engineering vector keylines for book covers, wraps, and jackets.
 */
export function generateBookCover(sheetW, sheetH, params = {}) {
  const W = parseFloat(params.pageWidth || 148);   // Page Trim Width (e.g. A5 148mm)
  const H = parseFloat(params.pageHeight || 210);  // Page Trim Height (e.g. A5 210mm)
  const S = parseFloat(params.spineWidth || 14);   // Spine Thickness (mm)
  const F = parseFloat(params.flapWidth || 0);     // Flap width for dust jackets (0 = normal paperback)
  const isHardcover = Boolean(params.isHardcover); // Hardcover adds 6mm hinge scores
  const hingeDist = isHardcover ? 7 : 0;

  const totalW = F * 2 + W * 2 + S;
  const totalH = H;

  const startX = Math.round(Math.max(20, (sheetW - totalW) / 2));
  const startY = Math.round(Math.max(20, (sheetH - totalH) / 2));

  const id = `book_${Date.now()}`;
  const elements = [];
  const cutColor = '#E6007A';   // Thru-Cut Magenta
  const scoreColor = '#009EE3'; // Crease Score Cyan

  // X offsets:
  // Back Flap (if F > 0): [x0, x1]
  // Back Cover: [x1, x2]
  // Spine: [x2, x3]
  // Front Cover: [x3, x4]
  // Front Flap: [x4, x5]
  const x0 = startX;
  const x1 = x0 + F;
  const x2 = x1 + W;
  const x3 = x2 + S;
  const x4 = x3 + W;
  const x5 = x4 + F;

  const yTop = startY;
  const yBottom = startY + H;

  // Outer Perimeter Trim Cut Line (Magenta Solid)
  elements.push({
    id: `${id}_trim_cut`,
    type: 'rect',
    x: x0,
    y: yTop,
    width: totalW,
    height: totalH,
    strokeColor: cutColor,
    strokeWidth: 1,
    fillMode: 'none',
    lineType: 'cut',
    label: `Book Trim Cut (${Math.round(totalW)}×${Math.round(totalH)}mm)`
  });

  // Spine Left Crease Fold Score
  elements.push({
    id: `${id}_spine_score_l`,
    type: 'line',
    x1: x2,
    y1: yTop,
    x2: x2,
    y2: yBottom,
    strokeColor: scoreColor,
    strokeWidth: 1,
    strokeDash: '4,4',
    lineType: 'crease',
    label: 'Spine Left Fold Crease'
  });

  // Spine Right Crease Fold Score
  elements.push({
    id: `${id}_spine_score_r`,
    type: 'line',
    x1: x3,
    y1: yTop,
    x2: x3,
    y2: yBottom,
    strokeColor: scoreColor,
    strokeWidth: 1,
    strokeDash: '4,4',
    lineType: 'crease',
    label: 'Spine Right Fold Crease'
  });

  // Hardcover Opening Hinge Scores
  if (hingeDist > 0) {
    elements.push({
      id: `${id}_hinge_l`,
      type: 'line',
      x1: x2 - hingeDist,
      y1: yTop,
      x2: x2 - hingeDist,
      y2: yBottom,
      strokeColor: scoreColor,
      strokeWidth: 0.8,
      strokeDash: '3,3',
      lineType: 'crease',
      label: 'Back Hinge Score'
    });
    elements.push({
      id: `${id}_hinge_r`,
      type: 'line',
      x1: x3 + hingeDist,
      y1: yTop,
      x2: x3 + hingeDist,
      y2: yBottom,
      strokeColor: scoreColor,
      strokeWidth: 0.8,
      strokeDash: '3,3',
      lineType: 'crease',
      label: 'Front Hinge Score'
    });
  }

  // Dust Jacket Flap Creases
  if (F > 0) {
    elements.push({
      id: `${id}_flap_crease_l`,
      type: 'line',
      x1: x1,
      y1: yTop,
      x2: x1,
      y2: yBottom,
      strokeColor: scoreColor,
      strokeWidth: 1,
      strokeDash: '4,4',
      lineType: 'crease',
      label: 'Back Flap Fold'
    });
    elements.push({
      id: `${id}_flap_crease_r`,
      type: 'line',
      x1: x4,
      y1: yTop,
      x2: x4,
      y2: yBottom,
      strokeColor: scoreColor,
      strokeWidth: 1,
      strokeDash: '4,4',
      lineType: 'crease',
      label: 'Front Flap Fold'
    });
    elements.push({
      id: `${id}_txt_flap_l`,
      type: 'text',
      x: (x0 + x1) / 2 - 25,
      y: yTop + H / 2,
      text: 'BACK FLAP',
      fontSize: 10,
      fontWeight: 'bold',
      color: '#64748B',
      label: 'Back Flap Label'
    });
    elements.push({
      id: `${id}_txt_flap_r`,
      type: 'text',
      x: (x4 + x5) / 2 - 25,
      y: yTop + H / 2,
      text: 'FRONT FLAP',
      fontSize: 10,
      fontWeight: 'bold',
      color: '#64748B',
      label: 'Front Flap Label'
    });
  }

  // Panel Labels
  elements.push({
    id: `${id}_txt_back`,
    type: 'text',
    x: (x1 + x2) / 2 - 30,
    y: yTop + H / 2,
    text: 'BACK COVER',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
    label: 'Back Cover'
  });
  elements.push({
    id: `${id}_txt_front`,
    type: 'text',
    x: (x3 + x4) / 2 - 32,
    y: yTop + H / 2,
    text: 'FRONT COVER',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#E6007A',
    label: 'Front Cover'
  });
  elements.push({
    id: `${id}_txt_spine`,
    type: 'text',
    x: (x2 + x3) / 2 - (S < 15 ? 4 : 10),
    y: yTop + 35,
    text: `SPINE (${S}mm)`,
    fontSize: S < 12 ? 8 : 10,
    fontWeight: 'bold',
    color: '#009EE3',
    label: 'Spine Label'
  });

  // Dimension Rulers
  elements.push({
    id: `${id}_meas_w`,
    type: 'measure',
    x1: x3,
    y1: yBottom + 12,
    x2: x4,
    y2: yBottom + 12,
    label: `Cover Width: ${W}mm`
  });
  elements.push({
    id: `${id}_meas_s`,
    type: 'measure',
    x1: x2,
    y1: yTop - 12,
    x2: x3,
    y2: yTop - 12,
    label: `Spine: ${S}mm`
  });
  elements.push({
    id: `${id}_meas_h`,
    type: 'measure',
    x1: x5 + 12,
    y1: yTop,
    x2: x5 + 12,
    y2: yBottom,
    label: `Height: ${H}mm`
  });

  return {
    elements,
    dimensions: { W, H, S, F, totalW, totalH },
    name: `Book Cover ${W}×${H}mm (Spine ${S}mm)`
  };
}

/**
 * ─── 2. PRESENTATION POCKET FOLDER DIELINE GENERATOR ─────────────────────────
 * Standard 9×12" corporate presentation folder with 4" bottom pocket, glue tabs, and card slits.
 */
export function generatePocketFolder(sheetW, sheetH, params = {}) {
  const panelW = parseFloat(params.panelWidth || 225); // 9 in (~228mm)
  const panelH = parseFloat(params.panelHeight || 305); // 12 in (~305mm)
  const pocketH = parseFloat(params.pocketHeight || 100); // 4 in (~102mm)
  const glueTabW = 15;

  const totalW = panelW * 2;
  const totalH = panelH + pocketH;

  const startX = Math.round(Math.max(20, (sheetW - totalW) / 2));
  const startY = Math.round(Math.max(20, (sheetH - totalH) / 2));

  const id = `folder_${Date.now()}`;
  const elements = [];
  const cutColor = '#E6007A';
  const scoreColor = '#009EE3';

  const x0 = startX;
  const x1 = startX + panelW;
  const x2 = x1 + panelW;

  const yTop = startY;
  const yFold = yTop + panelH;
  const yPocketBottom = yFold + pocketH;

  // Main Body Perimeter Cut
  elements.push({ id: `${id}_body_cut`, type: 'rect', x: x0, y: yTop, width: totalW, height: panelH, strokeColor: cutColor, strokeWidth: 1, fillMode: 'none', label: 'Folder Body Trim' });

  // Center Spine Crease Fold
  elements.push({ id: `${id}_center_fold`, type: 'line', x1: x1, y1: yTop, x2: x1, y2: yFold, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Center Spine Fold' });

  // Right Pocket Crease Fold
  elements.push({ id: `${id}_pocket_fold`, type: 'line', x1: x1, y1: yFold, x2: x2, y2: yFold, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Pocket Bottom Crease' });

  // Pocket Flap Body
  elements.push({ id: `${id}_pocket_cut_bot`, type: 'line', x1: x1 + glueTabW, y1: yPocketBottom, x2: x2 - glueTabW, y2: yPocketBottom, strokeColor: cutColor, strokeWidth: 1, label: 'Pocket Bottom Edge' });
  elements.push({ id: `${id}_pocket_cut_l`, type: 'line', x1: x1, y1: yFold, x2: x1 + glueTabW, y2: yPocketBottom, strokeColor: cutColor, strokeWidth: 1, label: 'Pocket Left Bevel Cut' });
  elements.push({ id: `${id}_pocket_cut_r`, type: 'line', x1: x2 - glueTabW, y1: yPocketBottom, x2: x2, y2: yFold, strokeColor: cutColor, strokeWidth: 1, label: 'Pocket Right Bevel Cut' });

  // Pocket Adhesive Glue Flap
  elements.push({ id: `${id}_glue_tab`, type: 'rect', x: x1, y: yFold, width: glueTabW, height: pocketH, strokeColor: '#8B5CF6', strokeWidth: 0.5, strokeDash: '2,2', fillMode: 'hatch_diagonal', label: 'Pocket Glue Flap' });

  // Business Card Slits (Two horizontal curved kiss-cut slits)
  const cardMidX = (x1 + x2) / 2;
  const cardMidY = yFold + pocketH / 2;
  elements.push({ id: `${id}_card_slit1`, type: 'curve', x1: cardMidX - 25, y1: cardMidY - 10, x2: cardMidX + 25, y2: cardMidY - 10, cx: cardMidX, cy: cardMidY - 14, strokeColor: cutColor, strokeWidth: 1, label: 'Card Slit Top' });
  elements.push({ id: `${id}_card_slit2`, type: 'curve', x1: cardMidX - 25, y1: cardMidY + 10, x2: cardMidX + 25, y2: cardMidY + 10, cx: cardMidX, cy: cardMidY + 14, strokeColor: cutColor, strokeWidth: 1, label: 'Card Slit Bottom' });

  // Panel Labels
  elements.push({ id: `${id}_txt_inside_l`, type: 'text', x: (x0 + x1) / 2 - 40, y: yTop + panelH / 2, text: 'INSIDE LEFT PANEL', fontSize: 11, fontWeight: 'bold', color: '#64748B', label: 'Left Inside' });
  elements.push({ id: `${id}_txt_inside_r`, type: 'text', x: (x1 + x2) / 2 - 44, y: yTop + panelH / 2 - 30, text: 'INSIDE RIGHT PANEL', fontSize: 11, fontWeight: 'bold', color: '#64748B', label: 'Right Inside' });
  elements.push({ id: `${id}_txt_pocket`, type: 'text', x: (x1 + x2) / 2 - 35, y: yFold + 25, text: 'FOLD-UP POCKET', fontSize: 10, fontWeight: 'bold', color: '#E6007A', label: 'Pocket Label' });

  // Dimensions
  elements.push({ id: `${id}_meas_w`, type: 'measure', x1: x0, y1: yTop - 12, x2: x1, y2: yTop - 12, label: `Panel: ${panelW}mm` });
  elements.push({ id: `${id}_meas_h`, type: 'measure', x1: x2 + 12, y1: yTop, x2: x2 + 12, y2: yFold, label: `Height: ${panelH}mm` });

  return {
    elements,
    dimensions: { panelW, panelH, pocketH, totalW, totalH },
    name: `Presentation Folder ${panelW}×${panelH}mm`
  };
}

/**
 * ─── 3. TRI-FOLD BROCHURE DIELINE GENERATOR ──────────────────────────────────
 */
export function generateTriFoldBrochure(sheetW, sheetH, params = {}) {
  const totalW = parseFloat(params.width || 297);  // A4 Landscape Width
  const totalH = parseFloat(params.height || 210); // A4 Landscape Height

  const p1 = Math.round(totalW * 0.33);
  const p2 = Math.round(totalW * 0.336);
  const p3 = totalW - p1 - p2; // Fold-in panel slightly narrower

  const startX = Math.round(Math.max(20, (sheetW - totalW) / 2));
  const startY = Math.round(Math.max(20, (sheetH - totalH) / 2));

  const id = `brochure_${Date.now()}`;
  const elements = [];
  const cutColor = '#E6007A';
  const scoreColor = '#009EE3';

  // Outer Trim Cut
  elements.push({ id: `${id}_trim`, type: 'rect', x: startX, y: startY, width: totalW, height: totalH, strokeColor: cutColor, strokeWidth: 1, fillMode: 'none', label: 'Brochure Trim Boundary' });

  // Vertical Creases
  elements.push({ id: `${id}_crs1`, type: 'line', x1: startX + p1, y1: startY, x2: startX + p1, y2: startY + totalH, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Fold Crease 1' });
  elements.push({ id: `${id}_crs2`, type: 'line', x1: startX + p1 + p2, y1: startY, x2: startX + p1 + p2, y2: startY + totalH, strokeColor: scoreColor, strokeWidth: 1, strokeDash: '4,4', lineType: 'crease', label: 'Fold Crease 2' });

  // Labels
  elements.push({ id: `${id}_txt_p1`, type: 'text', x: startX + p1 / 2 - 25, y: startY + totalH / 2, text: `PANEL 1 (${p1}mm)`, fontSize: 10, fontWeight: 'bold', color: '#64748B', label: 'Panel 1' });
  elements.push({ id: `${id}_txt_p2`, type: 'text', x: startX + p1 + p2 / 2 - 25, y: startY + totalH / 2, text: `PANEL 2 (${p2}mm)`, fontSize: 10, fontWeight: 'bold', color: '#64748B', label: 'Panel 2' });
  elements.push({ id: `${id}_txt_p3`, type: 'text', x: startX + p1 + p2 + p3 / 2 - 25, y: startY + totalH / 2, text: `PANEL 3 (${p3}mm)`, fontSize: 10, fontWeight: 'bold', color: '#E6007A', label: 'Panel 3' });

  return {
    elements,
    dimensions: { totalW, totalH, p1, p2, p3 },
    name: `Tri-Fold Brochure ${totalW}×${totalH}mm`
  };
}

/**
 * ─── 4. HANGTAG & EURO SLOT DIELINE GENERATOR ────────────────────────────────
 */
export function generateHangtag(sheetW, sheetH, params = {}) {
  const W = parseFloat(params.width || 60);
  const H = parseFloat(params.height || 110);
  const r = parseFloat(params.radius || 8);
  const hasEuroSlot = params.euroSlot !== false;

  const startX = Math.round((sheetW - W) / 2);
  const startY = Math.round((sheetH - H) / 2);

  const id = `tag_${Date.now()}`;
  const elements = [];
  const cutColor = '#E6007A';

  // Outer Tag Body with Rounded Corners
  elements.push({
    id: `${id}_body`,
    type: 'roundrect',
    x: startX,
    y: startY,
    width: W,
    height: H,
    rx: r,
    strokeColor: cutColor,
    strokeWidth: 1,
    fillMode: 'none',
    label: `Hangtag Die (${W}×${H}mm)`
  });

  if (hasEuroSlot) {
    // Euro-punch Slot (Hanging pegboard hole)
    elements.push({
      id: `${id}_euro`,
      type: 'roundrect',
      x: startX + (W - 32) / 2,
      y: startY + 12,
      width: 32,
      height: 9,
      rx: 4.5,
      strokeColor: cutColor,
      strokeWidth: 1,
      fillMode: 'none',
      label: 'Euro Punch Slot'
    });
  } else {
    // 5mm circular lanyard punch hole
    elements.push({
      id: `${id}_hole`,
      type: 'circle',
      cx: startX + W / 2,
      cy: startY + 15,
      r: 2.5,
      strokeColor: cutColor,
      strokeWidth: 1,
      fillMode: 'none',
      label: '5mm Lanyard Hole'
    });
  }

  // Label
  elements.push({
    id: `${id}_txt`,
    type: 'text',
    x: startX + W / 2 - 20,
    y: startY + H / 2,
    text: `TAG: ${W}×${H}`,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748B',
    label: 'Tag Spec'
  });

  return {
    elements,
    dimensions: { W, H, r },
    name: `Retail Hangtag ${W}×${H}mm`
  };
}

/**
 * ─── ALL PREPRESS CATEGORIES & PRESETS ────────────────────────────────────────
 */
export const DIELINE_CATEGORIES = [
  {
    id: 'ALL',
    label: 'All Prepress Categories',
    icon: 'Layers'
  },
  {
    id: 'BOOKS',
    label: 'Books & Publishing',
    icon: 'BookOpen',
    desc: 'Paperback book covers, spine thickness calculation, dust jackets, saddle stitch'
  },
  {
    id: 'FOLDERS',
    label: 'Folders & Brochures',
    icon: 'Folder',
    desc: 'Pocket presentation folders with glue tabs, bi-folds, and tri-folds'
  },
  {
    id: 'PACKAGING',
    label: 'Packaging Cartons',
    icon: 'Package',
    desc: 'Reverse tuck boxes, straight tuck cartons, pillow boxes, roll-end mailers'
  },
  {
    id: 'TAGS',
    label: 'Tags & Labels',
    icon: 'Tag',
    desc: 'Retail hangtags with Euro punch slots, blister cards, and sticker sheets'
  },
  {
    id: 'BLANK',
    label: 'Blank Canvas',
    icon: 'Square',
    desc: 'Clean paper stock to draw any custom dieline, shape, curve, or prepress vector'
  }
];

export const ALL_DIELINE_PRESETS = [
  // Books & Publications
  {
    id: 'book_a5_paperback',
    category: 'BOOKS',
    name: 'A5 Paperback Book Cover (Spine 14mm)',
    desc: '148×210mm Front & Back cover with 14mm spine creases',
    generator: (w, h) => generateBookCover(w, h, { pageWidth: 148, pageHeight: 210, spineWidth: 14 })
  },
  {
    id: 'book_a4_hardcover',
    category: 'BOOKS',
    name: 'A4 Hardcover Wrap (Spine 22mm + Hinge)',
    desc: '210×297mm cover with 22mm spine and 7mm hinge opening scores',
    generator: (w, h) => generateBookCover(w, h, { pageWidth: 210, pageHeight: 297, spineWidth: 22, isHardcover: true })
  },
  {
    id: 'book_dust_jacket',
    category: 'BOOKS',
    name: 'Trade Book Dust Jacket Wrap (with Flaps)',
    desc: 'Front/back cover with 18mm spine and 75mm inside flaps',
    generator: (w, h) => generateBookCover(w, h, { pageWidth: 140, pageHeight: 216, spineWidth: 18, flapWidth: 75 })
  },

  // Folders & Brochures
  {
    id: 'presentation_folder',
    category: 'FOLDERS',
    name: '9×12" Presentation Pocket Folder',
    desc: 'Two 225×305mm panels with 100mm bottom pocket, glue tab & card slits',
    generator: (w, h) => generatePocketFolder(w, h, { panelWidth: 225, panelHeight: 305, pocketHeight: 100 })
  },
  {
    id: 'tri_fold_a4',
    category: 'FOLDERS',
    name: 'A4 Tri-Fold Brochure (6-Panel)',
    desc: '297×210mm landscape sheet with 2 vertical fold scores',
    generator: (w, h) => generateTriFoldBrochure(w, h, { width: 297, height: 210 })
  },

  // Packaging Boxes
  {
    id: 'box_rte_std',
    category: 'PACKAGING',
    name: 'Reverse Tuck End (RTE) Box',
    desc: '70×40×120mm folding carton with Bézier curves & adhesive glue hatch',
    generator: (w, h) => generateRTEBox(w, h, { length: 70, width: 40, height: 120 })
  },
  {
    id: 'box_ste_luxury',
    category: 'PACKAGING',
    name: 'Straight Tuck End (STE) Box',
    desc: '70×40×120mm luxury retail carton with rear folding flaps',
    generator: (w, h) => generateSTEBox(w, h, { length: 70, width: 40, height: 120 })
  },
  {
    id: 'box_pillow_gift',
    category: 'PACKAGING',
    name: 'Curved Pillow Gift Box',
    desc: '120×75mm gift carton with convex & concave curved crease arcs',
    generator: (w, h) => generatePillowBox(w, h, { length: 120, width: 75 })
  },
  {
    id: 'box_mailer_retf',
    category: 'PACKAGING',
    name: 'Roll-End RETF Mailer Shipping Box',
    desc: '160×110×50mm corrugated e-commerce box with locking ear flaps',
    generator: (w, h) => generateMailerBox(w, h, { length: 160, width: 110, height: 50 })
  },

  // Tags & Labels
  {
    id: 'hangtag_euro',
    category: 'TAGS',
    name: 'Retail Pegboard Hangtag with Euro Slot',
    desc: '60×110mm rounded corner card with standard Euro-punch hole',
    generator: (w, h) => generateHangtag(w, h, { width: 60, height: 110, radius: 8, euroSlot: true })
  },
  {
    id: 'hangtag_lanyard',
    category: 'TAGS',
    name: 'Apparel Swing Tag with 5mm Hole',
    desc: '50×90mm apparel tag with 5mm lanyard / cord eyelet',
    generator: (w, h) => generateHangtag(w, h, { width: 50, height: 90, radius: 4, euroSlot: false })
  }
];
