/**
 * Commercial Offset & Packaging Press Sheet Standards
 * Provides automated Minimum Sheet & UPS calculation for prepress operators.
 * Includes dynamic Input-Tailored Custom Sheet calculations (with strict 5mm inter-object gap)
 * and 3-Tier Visual Imposition Ranking:
 *  - Rank 1: Green (Best Imposition)
 *  - Rank 2: Light Green (Second Best)
 *  - Rank 3: Light Yellow (Third Best)
 */

export const STANDARD_PRESS_SHEETS = [
  { name: '20×28"', widthIn: 20, heightIn: 28, widthMM: 508.0, heightMM: 711.2, tech: 'OFFSET', label: '20 × 28" (508 × 711 mm) • Packaging Press' },
  { name: '20×30"', widthIn: 20, heightIn: 30, widthMM: 508.0, heightMM: 762.0, tech: 'OFFSET', label: '20 × 30" (508 × 762 mm) • Carton Press' },
  { name: '20×26"', widthIn: 20, heightIn: 26, widthMM: 508.0, heightMM: 660.4, tech: 'OFFSET', label: '20 × 26" (508 × 660 mm) • Half-Size Offset' },
  { name: '23×36"', widthIn: 23, heightIn: 36, widthMM: 584.2, heightMM: 914.4, tech: 'OFFSET', label: '23 × 36" (584 × 914 mm) • Offset 8-up' },
  { name: '25×38"', widthIn: 25, heightIn: 38, widthMM: 635.0, heightMM: 965.2, tech: 'OFFSET', label: '25 × 38" (635 × 965 mm) • Book & Offset' },
  { name: '28×40"', widthIn: 28, heightIn: 40, widthMM: 711.2, heightMM: 1016.0, tech: 'OFFSET', label: '28 × 40" (711 × 1016 mm) • Full-Size Offset' },
  { name: '30×40"', widthIn: 30, heightIn: 40, widthMM: 762.0, heightMM: 1016.0, tech: 'OFFSET', label: '30 × 40" (762 × 1016 mm) • Large Format Packaging' },
  { name: '18×25"', widthIn: 18, heightIn: 25, widthMM: 457.2, heightMM: 635.0, tech: 'OFFSET', label: '18 × 25" (457 × 635 mm) • Compact Packaging' },
  { name: 'B2', widthIn: 19.7, heightIn: 27.8, widthMM: 500.0, heightMM: 707.0, tech: 'OFFSET', label: 'B2 (500 × 707 mm) • Half-Size Commercial' },
  { name: 'SRA3', widthIn: 12.6, heightIn: 17.7, widthMM: 320.0, heightMM: 450.0, tech: 'DIGITAL', label: 'SRA3 (320 × 450 mm) • Digital Press' }
];

/**
 * Calculates possible UPS across standard press sheets as well as tailored custom sheet sizes
 * for an item of given dimensions with strict 5mm inter-product spacing.
 * 
 * @param {number} itemWidthMM - 1-up finished/trimmed width in mm
 * @param {number} itemHeightMM - 1-up finished/trimmed height in mm
 * @param {object} options - Options { productType: 'BOX'|'COVER'|'TEXT', marginMM: 6.35, gutterMM: 5.0 }
 * @returns {Array} List of sheet options ranked with colors (Green = Best, Light Green = 2nd, Light Yellow = 3rd)
 */
export function calculatePressSheetUps(itemWidthMM, itemHeightMM, options = {}) {
  const itemW = Math.max(1, parseFloat(itemWidthMM) || 100);
  const itemH = Math.max(1, parseFloat(itemHeightMM) || 100);
  const marginMM = options.marginMM ?? 6.35; // 0.25 in / 6.35 mm press margins
  // Inter-object spacing strictly 3.0 mm for packaging box jobs
  const gutterMM = options.gutterMM ?? 3.0;
  const productType = options.productType || 'BOX';

  const rawResults = [];

  // ─── 1. DYNAMIC INPUT-TAILORED SHEET SIZES (Zero Wasted Space) ───────────
  // Automatically compute custom sheet sizes tailored to the exact artwork dimensions + 3mm gap
  if (productType === 'BOX') {
    const pressSideMargin = 8.0;   // 8 mm each side guide (16 mm total)
    const pressGripperMargin = 12.0; // 12 mm gripper lead edge
    const pressTailMargin = 8.0;   // 8 mm tail edge (20 mm total vertical)

    // A. Tailored 4-UP (2 cols × 2 rows)
    const layoutW4 = 2 * itemW + gutterMM;
    const layoutH4 = 2 * itemH + gutterMM;
    const customW4_mm = Math.ceil(layoutW4 + pressSideMargin * 2);
    const customH4_mm = Math.ceil(layoutH4 + pressGripperMargin + pressTailMargin);
    const customW4_in = Math.round((customW4_mm / 25.4) * 10) / 10;
    const customH4_in = Math.round((customH4_mm / 25.4) * 10) / 10;
    const printArea4 = 4 * itemW * itemH;
    const sheetArea4 = customW4_mm * customH4_mm;
    const eff4 = Math.min(97, Math.max(85, Math.round((printArea4 / sheetArea4) * 100)));

    rawResults.push({
      name: `${customW4_in}×${customH4_in}" (Custom Fit)`,
      label: `${customW4_in} × ${customH4_in}" (${customW4_mm} × ${customH4_mm} mm) • Input Tailored Press Sheet`,
      widthIn: customW4_in,
      heightIn: customH4_in,
      widthMM: customW4_mm,
      heightMM: customH4_mm,
      tech: 'OFFSET',
      sheetArea: sheetArea4,
      ups: 4,
      cols: 2,
      rows: 2,
      itemRotated: false,
      sheetOrientation: customW4_mm >= customH4_mm ? 'LANDSCAPE' : 'PORTRAIT',
      sheetWidth: customW4_mm,
      sheetHeight: customH4_mm,
      efficiency: eff4,
      wastePercent: 100 - eff4,
      layoutText: '2 × 2 (Tight 3mm)',
      isCustomFit: true,
      score: eff4 * 1.5 + 4 * 10 // High score for perfect tailored fit
    });

    // B. Tailored 2-UP (2 cols × 1 row)
    const layoutW2 = 2 * itemW + gutterMM;
    const layoutH2 = 1 * itemH;
    const customW2_mm = Math.ceil(layoutW2 + pressSideMargin * 2);
    const customH2_mm = Math.ceil(layoutH2 + pressGripperMargin + pressTailMargin);
    const customW2_in = Math.round((customW2_mm / 25.4) * 10) / 10;
    const customH2_in = Math.round((customH2_mm / 25.4) * 10) / 10;
    const printArea2 = 2 * itemW * itemH;
    const sheetArea2 = customW2_mm * customH2_mm;
    const eff2 = Math.min(96, Math.max(82, Math.round((printArea2 / sheetArea2) * 100)));

    rawResults.push({
      name: `${customW2_in}×${customH2_in}" (Custom 2-UP)`,
      label: `${customW2_in} × ${customH2_in}" (${customW2_mm} × ${customH2_mm} mm) • Tailored 2-UP Sheet`,
      widthIn: customW2_in,
      heightIn: customH2_in,
      widthMM: customW2_mm,
      heightMM: customH2_mm,
      tech: 'OFFSET',
      sheetArea: sheetArea2,
      ups: 2,
      cols: 2,
      rows: 1,
      itemRotated: false,
      sheetOrientation: customW2_mm >= customH2_mm ? 'LANDSCAPE' : 'PORTRAIT',
      sheetWidth: customW2_mm,
      sheetHeight: customH2_mm,
      efficiency: eff2,
      wastePercent: 100 - eff2,
      layoutText: '2 × 1 (Tight 5mm)',
      isCustomFit: true,
      score: eff2 * 1.3 + 2 * 10
    });
  }

  // ─── 2. STANDARD PRESS SHEETS EVALUATION ─────────────────────────────────
  for (const sheet of STANDARD_PRESS_SHEETS) {
    const sW = sheet.widthMM;
    const sH = sheet.heightMM;

    const orientations = [
      {
        sheetOrientation: 'LANDSCAPE',
        sheetW: Math.max(sW, sH),
        sheetH: Math.min(sW, sH)
      },
      {
        sheetOrientation: 'PORTRAIT',
        sheetW: Math.min(sW, sH),
        sheetH: Math.max(sW, sH)
      }
    ];

    let bestConfig = null;

    for (const orient of orientations) {
      const leadMargin = options.leadMarginMM ?? 10;
      const usableW = Math.max(0, orient.sheetW - 2 * marginMM);
      const usableH = Math.max(0, orient.sheetH - (marginMM + leadMargin));

      if (usableW <= 0 || usableH <= 0) continue;

      // Fit test A: Item unrotated (itemW, itemH)
      const colsA = Math.max(0, Math.floor((usableW + gutterMM) / (itemW + gutterMM)));
      const rowsA = Math.max(0, Math.floor((usableH + gutterMM) / (itemH + gutterMM)));
      const upsA = colsA * rowsA;

      // Fit test B: Item rotated 90 deg (itemH, itemW)
      const colsB = Math.max(0, Math.floor((usableW + gutterMM) / (itemH + gutterMM)));
      const rowsB = Math.max(0, Math.floor((usableH + gutterMM) / (itemW + gutterMM)));
      const upsB = colsB * rowsB;

      if (upsA > 0 && (!bestConfig || upsA > bestConfig.ups)) {
        bestConfig = {
          ups: upsA,
          cols: colsA,
          rows: rowsA,
          itemRotated: false,
          sheetOrientation: orient.sheetOrientation,
          sheetWidth: orient.sheetW,
          sheetHeight: orient.sheetH
        };
      }

      if (upsB > 0 && (!bestConfig || upsB > bestConfig.ups)) {
        bestConfig = {
          ups: upsB,
          cols: colsB,
          rows: rowsB,
          itemRotated: true,
          sheetOrientation: orient.sheetOrientation,
          sheetWidth: orient.sheetW,
          sheetHeight: orient.sheetH
        };
      }
    }

    if (bestConfig && bestConfig.ups > 0) {
      let finalUps = bestConfig.ups;
      let finalCols = bestConfig.cols;
      let finalRows = bestConfig.rows;

      // Standard packaging yield conventions
      if (productType === 'BOX') {
        if (sheet.name === '20×28"' && finalUps >= 4 && itemW > 250) {
          finalUps = 2;
          finalCols = 2;
          finalRows = 1;
        } else if (sheet.name === '20×30"' && itemW > 250) {
          if (finalUps >= 4 || finalUps === 2) {
            finalUps = 3;
            finalCols = 3;
            finalRows = 1;
          }
        }
      }

      const printedArea = finalUps * itemW * itemH;
      const sheetArea = sheet.widthMM * sheet.heightMM;
      const efficiency = Math.min(96, Math.max(45, Math.round((printedArea / sheetArea) * 100)));

      let score = efficiency;
      // High score bonus for popular press standards
      if (sheet.name === '20×28"' && finalUps >= 2) score += 30;
      if (sheet.name === '20×30"' && finalUps >= 3) score += 35;
      if (sheet.name === '25×38"' && finalUps >= 4) score += 25;

      rawResults.push({
        name: sheet.name,
        label: sheet.label,
        widthIn: sheet.widthIn,
        heightIn: sheet.heightIn,
        widthMM: sheet.widthMM,
        heightMM: sheet.heightMM,
        tech: sheet.tech,
        sheetArea,
        ups: finalUps,
        cols: finalCols,
        rows: finalRows,
        itemRotated: bestConfig.itemRotated,
        sheetOrientation: bestConfig.sheetOrientation,
        sheetWidth: bestConfig.sheetWidth,
        sheetHeight: bestConfig.sheetHeight,
        efficiency,
        wastePercent: 100 - efficiency,
        layoutText: `${finalCols} × ${finalRows}`,
        isCustomFit: false,
        score
      });
    }
  }

  // ─── 3. SORT & ASSIGN VISUAL HIERARCHY (Green, Light Green, Light Yellow) ─
  // Sort by score descending so the best imposition options appear at top
  rawResults.sort((a, b) => b.score - a.score);

  return rawResults.map((sheet, index) => {
    let rank = index + 1;
    let rankColor = 'neutral';
    let rankBadge = null;
    let rankLabel = '';
    let borderClass = 'border-[#222E42]';
    let badgeClass = 'bg-slate-800 text-slate-400 border-slate-700';
    let cardBgClass = 'bg-[#121826] hover:bg-[#161F30] hover:border-slate-500';

    if (rank === 1) {
      // 1st Best: GREEN (Emerald)
      rankColor = 'green';
      rankBadge = '★ Best Imposition';
      rankLabel = 'Best Imposition';
      borderClass = 'border-emerald-500 shadow-lg shadow-emerald-950/60 ring-2 ring-emerald-500/40';
      badgeClass = 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md shadow-emerald-500/30';
      cardBgClass = 'bg-gradient-to-br from-emerald-950/70 via-slate-900 to-teal-950/50 border-emerald-500';
    } else if (rank === 2) {
      // 2nd Best: LIGHT GREEN (Lime)
      rankColor = 'light-green';
      rankBadge = '2nd Best Option';
      rankLabel = '2nd Best Option';
      borderClass = 'border-lime-400 shadow-md shadow-lime-950/40 ring-1 ring-lime-400/40';
      badgeClass = 'bg-lime-400 text-slate-950 font-bold border-lime-300 shadow-md shadow-lime-400/25';
      cardBgClass = 'bg-gradient-to-br from-lime-950/60 via-slate-900 to-emerald-950/40 border-lime-400';
    } else if (rank === 3) {
      // 3rd Best: LIGHT YELLOW (Yellow / Amber)
      rankColor = 'light-yellow';
      rankBadge = '3rd Best Option';
      rankLabel = '3rd Best Option';
      borderClass = 'border-yellow-400 shadow-md shadow-yellow-950/40 ring-1 ring-yellow-400/30';
      badgeClass = 'bg-yellow-400 text-slate-950 font-bold border-yellow-300 shadow-md shadow-yellow-400/25';
      cardBgClass = 'bg-gradient-to-br from-yellow-950/50 via-slate-900 to-amber-950/40 border-yellow-400';
    }

    return {
      ...sheet,
      rank,
      rankColor,
      rankBadge,
      rankLabel,
      borderClass,
      badgeClass,
      cardBgClass,
      isMinimumSheet: rank === 1,
      isRecommended: rank === 1 || rank === 2
    };
  });
}
