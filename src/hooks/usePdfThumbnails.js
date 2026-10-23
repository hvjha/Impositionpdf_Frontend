import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker with unpkg fallback for maximum reliability
if (typeof window !== 'undefined') {
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker || `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
  }
}

/**
 * Hook to render PDF pages as thumbnail data URLs with robust support for
 * ultra-high resolution image sheets, complex packaging dielines, and multi-page PDFs.
 * 
 * @param {string|File|Blob|ArrayBuffer} pdfSource - URL, File, Blob or ArrayBuffer
 * @param {number} maxPages - Maximum pages to render
 * @param {number} thumbWidth - Base thumbnail width in pixels
 * @returns {{ thumbnails: string[], pageAspectRatios: number[], pageViewports: object[], pageCount: number, loading: boolean, progress: number, error: string|null }}
 */
export default function usePdfThumbnails(pdfSource, maxPages = 64, thumbWidth = 360) {
  const [thumbnails, setThumbnails] = useState([]);
  const [pageAspectRatios, setPageAspectRatios] = useState([]);
  const [pageViewports, setPageViewports] = useState([]);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const taskRef = useRef(null);

  useEffect(() => {
    if (!pdfSource) {
      setThumbnails([]);
      setPageViewports([]);
      setPageAspectRatios([]);
      setPageCount(0);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const renderThumbnails = async () => {
      setLoading(true);
      setError(null);
      setProgress(0);

      try {
        let docParams;

        if (pdfSource instanceof File || pdfSource instanceof Blob) {
          const buffer = await pdfSource.arrayBuffer();
          if (cancelled) return;
          docParams = { data: new Uint8Array(buffer) };
        } else if (pdfSource instanceof ArrayBuffer) {
          docParams = { data: new Uint8Array(pdfSource) };
        } else if (typeof pdfSource === 'string') {
          // Robust main-thread fetch avoids web worker stream/CORS errors on high-res files
          try {
            const resp = await fetch(pdfSource);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const buffer = await resp.arrayBuffer();
            if (cancelled) return;
            docParams = { data: new Uint8Array(buffer) };
          } catch (fetchErr) {
            console.warn('[PDF Thumbnails] Direct buffer fetch failed, falling back to URL:', fetchErr);
            docParams = {
              url: pdfSource,
              disableRange: true,
              disableStream: true
            };
          }
        } else {
          throw new Error('Unsupported PDF source type');
        }

        // Configure robust decoding parameters for high-resolution prepress artwork
        docParams = {
          ...docParams,
          cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/standard_fonts/',
          maxImageSize: 1024 * 1024 * 32, // Safe 32MP limit prevents memory allocation crashes
          isEvalSupported: false
        };

        let pdf;
        try {
          const loadingTask = pdfjsLib.getDocument(docParams);
          taskRef.current = loadingTask;
          pdf = await loadingTask.promise;
        } catch (workerErr) {
          console.warn('[PDF Thumbnails] Primary worker load failed, retrying in main-thread safe mode:', workerErr);
          if (cancelled) return;
          // Fallback: Disable worker to prevent worker thread crashes on complex high-res graphics
          const fallbackParams = {
            ...docParams,
            disableWorker: true,
            verbosity: 0
          };
          const fallbackTask = pdfjsLib.getDocument(fallbackParams);
          taskRef.current = fallbackTask;
          pdf = await fallbackTask.promise;
        }

        if (cancelled || !pdf) return;

        const total = pdf.numPages;
        setPageCount(total);
        const pagesToRender = Math.min(total, maxPages);
        const thumbs = [];
        const ratios = [];
        const vports = [];

        for (let i = 1; i <= pagesToRender; i++) {
          if (cancelled) break;

          let page;
          try {
            page = await pdf.getPage(i);
          } catch (pageErr) {
            console.warn(`[PDF Thumbnails] Failed to load page ${i}:`, pageErr);
            continue;
          }

          const viewport = page.getViewport({ scale: 1 });
          const aspect = viewport.width / viewport.height;
          ratios.push(aspect);
          vports.push({
            widthPt: viewport.width,
            heightPt: viewport.height,
            widthMM: Math.round((viewport.width * 25.4 / 72) * 10) / 10,
            heightMM: Math.round((viewport.height * 25.4 / 72) * 10) / 10
          });

          // Intelligent scaling for high-res images:
          // Keep canvas bounded between 240px and 720px to ensure crisp rendering
          // without triggering browser canvas memory limits (which cause black/blank previews)
          const maxCanvasSize = 720;
          const targetWidth = Math.min(maxCanvasSize, Math.max(240, thumbWidth));
          let scale = targetWidth / Math.max(10, viewport.width);
          if (viewport.height * scale > maxCanvasSize) {
            scale = maxCanvasSize / Math.max(10, viewport.height);
          }
          if (viewport.width * scale > maxCanvasSize) {
            scale = maxCanvasSize / Math.max(10, viewport.width);
          }
          const scaledViewport = page.getViewport({ scale });

          // Create offscreen canvas with safe dimensions
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.min(maxCanvasSize, Math.floor(scaledViewport.width)));
          canvas.height = Math.max(1, Math.min(maxCanvasSize, Math.floor(scaledViewport.height)));
          const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });

          // Fill clean white background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          try {
            const renderTask = page.render({
              canvasContext: ctx,
              viewport: scaledViewport,
              background: 'rgb(255, 255, 255)',
              intent: 'display'
            });

            await renderTask.promise;
            const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
            thumbs.push(dataUrl);
          } catch (renderErr) {
            console.warn(`[PDF Thumbnails] Rendering failed for page ${i}, generating high-res vector fallback:`, renderErr);
            // High-contrast vector fallback so preview is NEVER blank
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#06B6D4';
            ctx.lineWidth = 2;
            ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
            ctx.fillStyle = '#0F172A';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`PAGE ${i} (${Math.round(viewport.width * 25.4 / 72)} × ${Math.round(viewport.height * 25.4 / 72)} mm)`, canvas.width / 2, canvas.height / 2 - 6);
            ctx.fillStyle = '#0284C7';
            ctx.font = '10px monospace';
            ctx.fillText('High-Res Prepress Artwork', canvas.width / 2, canvas.height / 2 + 10);
            thumbs.push(canvas.toDataURL('image/png'));
          }

          if (!cancelled) {
            // Update state incrementally so Page 1 renders IMMEDIATELY on the imposition sheet!
            setThumbnails([...thumbs]);
            setPageAspectRatios([...ratios]);
            setPageViewports([...vports]);
            setProgress(Math.round((i / pagesToRender) * 100));
          }

          try {
            page.cleanup();
          } catch {}
        }

        if (!cancelled && thumbs.length > 0) {
          setThumbnails(thumbs);
          setPageAspectRatios(ratios);
          setPageViewports(vports);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[PDF Thumbnails] Pipeline warning:', err.message);
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    renderThumbnails();

    return () => {
      cancelled = true;
      if (taskRef.current) {
        try {
          taskRef.current.destroy();
        } catch {}
        taskRef.current = null;
      }
    };
  }, [pdfSource, maxPages, thumbWidth]);

  return { thumbnails, pageAspectRatios, pageViewports, pageCount, loading, progress, error };
}
