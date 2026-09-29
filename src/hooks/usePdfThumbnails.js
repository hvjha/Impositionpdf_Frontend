import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

/**
 * Hook to render PDF pages as thumbnail data URLs.
 * 
 * @param {string|File|Blob|ArrayBuffer} pdfSource - URL, File, Blob or ArrayBuffer
 * @param {number} maxPages - Maximum pages to render
 * @param {number} thumbWidth - Thumbnail width in pixels for crisp SVG rendering
 * @returns {{ thumbnails: string[], pageAspectRatios: number[], pageCount: number, loading: boolean, progress: number, error: string|null }}
 */
export default function usePdfThumbnails(pdfSource, maxPages = 64, thumbWidth = 320) {
  const [thumbnails, setThumbnails] = useState([]);
  const [pageAspectRatios, setPageAspectRatios] = useState([]);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const taskRef = useRef(null);

  useEffect(() => {
    if (!pdfSource) {
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
          docParams = {
            url: pdfSource,
            disableRange: true,
            disableStream: true,
          };
        } else {
          throw new Error('Unsupported PDF source type');
        }

        const loadingTask = pdfjsLib.getDocument(docParams);
        taskRef.current = loadingTask;

        const pdf = await loadingTask.promise;
        if (cancelled) return;

        const total = pdf.numPages;
        setPageCount(total);
        const pagesToRender = Math.min(total, maxPages);
        const thumbs = [];
        const ratios = [];

        for (let i = 1; i <= pagesToRender; i++) {
          if (cancelled) break;

          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1 });
          const aspect = viewport.width / viewport.height;
          ratios.push(aspect);

          // Calculate scale for desired thumbnail width
          const scale = thumbWidth / viewport.width;
          const scaledViewport = page.getViewport({ scale });

          // Create offscreen canvas
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.floor(scaledViewport.width));
          canvas.height = Math.max(1, Math.floor(scaledViewport.height));
          const ctx = canvas.getContext('2d', { alpha: false });

          // Fill white background before rendering
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          await page.render({
            canvasContext: ctx,
            viewport: scaledViewport,
            background: 'rgb(255, 255, 255)',
          }).promise;

          if (!cancelled) {
            thumbs.push(canvas.toDataURL('image/jpeg', 0.82));
            setProgress(Math.round((i / pagesToRender) * 100));
          }

          page.cleanup();
        }

        if (!cancelled) {
          setThumbnails(thumbs);
          setPageAspectRatios(ratios);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[PDF Thumbnails] Failed to render:', err.message);
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

  return { thumbnails, pageAspectRatios, pageCount, loading, progress, error };
}
