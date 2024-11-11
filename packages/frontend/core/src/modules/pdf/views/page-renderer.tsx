import { useLiveData } from '@toeverything/infra';
import { useEffect, useRef, useState } from 'react';

import type { PDF } from '../entities/pdf';
import type { PDFPage } from '../entities/pdf-page';
import { LoadingSvg } from './components';
import * as styles from './styles.css';

interface PDFPageProps {
  pdf: PDF;
  width: number;
  height: number;
  pageNum: number;
  scale?: number;
  className?: string;
  onSelect?: (pageNum: number) => void;
}

export const PDFPageRenderer = ({
  pdf,
  width,
  height,
  pageNum,
  className,
  onSelect,
  scale = window.devicePixelRatio,
}: PDFPageProps) => {
  const [pdfPage, setPdfPage] = useState<PDFPage | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const img = useLiveData(pdfPage?.bitmap$ ?? null);

  useEffect(() => {
    const { page, release } = pdf.page(pageNum, `${width}:${height}:${scale}`);
    setPdfPage(page);

    return release;
  }, [pdf, width, height, pageNum, scale]);

  useEffect(() => {
    pdfPage?.render({ width, height, scale });

    return pdfPage?.render.unsubscribe;
  }, [pdfPage, width, height, scale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.drawImage(img, 0, 0);
  }, [img, width, height, scale]);

  return (
    <div
      className={className}
      onClick={() => onSelect?.(pageNum)}
      style={{ width, aspectRatio: `${width} / ${height}` }}
    >
      {img === null ? (
        <LoadingSvg className={styles.pdfLoading} />
      ) : (
        <canvas className={styles.pdfPageCanvas} ref={canvasRef} />
      )}
    </div>
  );
};
