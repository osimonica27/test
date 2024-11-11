import { IconButton, Scrollable } from '@affine/component';
import {
  type PDF,
  type PDFRendererState,
  PDFService,
  PDFStatus,
} from '@affine/core/modules/pdf';
import type { PDFPage } from '@affine/core/modules/pdf/entities/pdf';
import type { AttachmentBlockModel } from '@blocksuite/affine/blocks';
import { CollapseIcon, ExpandIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import clsx from 'clsx';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { VirtuosoHandle, VirtuosoProps } from 'react-virtuoso';
import { Virtuoso } from 'react-virtuoso';

import * as styles from './styles.css';

type ItemProps = VirtuosoProps<null, undefined>;

const Page = React.memo(
  ({
    width,
    height,
    className,
  }: {
    index: number;
    width: number;
    height: number;
    className: string;
  }) => {
    return (
      <div
        className={className}
        style={{ width: `${width}px`, height: `${height}px` }}
      ></div>
    );
  }
);

Page.displayName = 'viewer-page';

const THUMBNAIL_WIDTH = 94;

const Thumbnail = React.memo(
  ({
    index,
    width,
    height,
    className,
    onSelect,
  }: {
    index: number;
    width: number;
    height: number;
    className: string;
    onSelect: (index: number) => void;
  }) => {
    return (
      <div
        className={className}
        style={{ width: `${width}px`, height: `${height}px` }}
        onClick={() => onSelect(index)}
      ></div>
    );
  }
);

Thumbnail.displayName = 'viewer-thumbnail';

const Scroller = React.forwardRef<HTMLDivElement, ItemProps>(
  ({ ...props }, ref) => {
    return (
      <Scrollable.Root>
        <Scrollable.Viewport ref={ref} {...props} />
        <Scrollable.Scrollbar />
      </Scrollable.Root>
    );
  }
);

Scroller.displayName = 'viewer-scroller';

const Item = React.forwardRef<HTMLDivElement, ItemProps>(
  ({ ...props }, ref) => {
    return <div ref={ref} {...props} />;
  }
);

Item.displayName = 'viewer-item';

interface ViewerProps {
  model: AttachmentBlockModel;
}

enum RenderKind {
  Page = 'page',
  Thumbnail = 'thumbnail',
}

interface PDFPageProps {
  className?: string;
  pdf: PDF;
  page: number;
  width: number;
  height: number;
}

function PDFPageRenderer({
  pdf,
  page,
  className,
  width,
  height,
}: PDFPageProps) {
  const [pdfPage, setPdfPage] = useState<PDFPage | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const img = useLiveData(pdfPage?.bitmap$ ?? null);

  useEffect(() => {
    const pdfPage = pdf.page(RenderKind.Page, page);
    setPdfPage(pdfPage.page);

    return () => {
      pdfPage.release();
    };
  }, [pdf, page, width, height]);

  useEffect(() => {
    pdfPage?.render({ width, height, scale: 1 });

    return pdfPage?.render.unsubscribe;
  }, [pdfPage, height, width]);

  useEffect(() => {
    if (!canvasRef.current || !img) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
  }, [img, height, width]);

  return (
    <div className={className} style={{ width, height }}>
      <canvas style={{ width: '100%', height: '100%' }} ref={canvasRef} />
    </div>
  );
}

interface PDFViewerInnerProps {
  pdf: PDF;
  state: Extract<PDFRendererState, { status: PDFStatus.Opened }>;
}

const PDFViewerInner = ({ pdf, state }: PDFViewerInnerProps) => {
  const pdfMeta = state.meta;
  const [cursor, setCursor] = useState(0);
  const [viewportInfo, setViewportInfo] = useState({
    dpi: window.devicePixelRatio,
    width: 1,
    height: 1,
  });
  const scrollerHandleRef = useRef<VirtuosoHandle | null>(null);
  const [collapsed, setCollapsed] = useState(true);

  const onSelect = useCallback(
    (index: number) => {
      scrollerHandleRef.current?.scrollToIndex({
        index,
        align: 'start',
        behavior: 'smooth',
      });
    },
    [scrollerHandleRef]
  );

  const pageContent = useCallback(
    (index: number) => {
      return (
        <PDFPageRenderer
          key={index}
          pdf={pdf}
          page={index}
          className={clsx([styles.viewerPage, 'pdf-page'])}
          width={pdfMeta.width}
          height={pdfMeta.height}
        />
      );
    },
    [pdf, pdfMeta]
  );

  const thumbnailContent = useCallback(
    (index: number) => {
      return (
        <Thumbnail
          key={index}
          index={index}
          className={clsx([
            styles.thumbnailsPage,
            { selected: index === cursor },
            'pdf-thumbnail',
          ])}
          width={THUMBNAIL_WIDTH}
          height={Math.ceil(
            (state.meta.height / state.meta.width) * THUMBNAIL_WIDTH
          )}
          onSelect={onSelect}
        />
      );
    },
    [cursor, state, onSelect]
  );

  const mainComponents = useMemo(() => {
    return {
      Header: () => <div style={{ width: '100%', height: '20px' }} />,
      Footer: () => <div style={{ width: '100%', height: '20px' }} />,
      Item: (props: ItemProps) => (
        <Item className={styles.mainItemWrapper} {...props} />
      ),
      Scroller,
    };
  }, []);

  const thumbnailsComponents = useMemo(() => {
    return {
      Item: (props: ItemProps) => (
        <Item className={styles.thumbnailsItemWrapper} {...props} />
      ),
      Scroller,
    };
  }, []);

  const mainStyle = useMemo(() => {
    const { height: vh } = viewportInfo;
    const { pageCount: t, height: h, width: w } = state.meta;
    const height = Math.min(
      vh - 60 - 24 - 24 - 2 - 8,
      t * THUMBNAIL_WIDTH * (h / w) + (t - 1) * 12
    );
    return { height: `${height}px` };
  }, [state, viewportInfo]);

  return (
    <div
      data-testid="attachment-viewer"
      className={clsx([
        styles.body,
        {
          gridding: true,
          scrollable: true,
        },
      ])}
    >
      <Virtuoso<null, ItemProps['context']>
        key={pdf.id}
        ref={scrollerHandleRef}
        className={styles.virtuoso}
        totalCount={state.meta.pageCount}
        itemContent={pageContent}
        components={mainComponents}
      />
      <div className={clsx(['thumbnails', styles.thumbnails])}>
        <div className={clsx([styles.thumbnailsPages, { collapsed }])}>
          <Virtuoso<null, ItemProps['context']>
            key={`${pdf.id}-thumbnails`}
            style={mainStyle}
            className={styles.virtuoso}
            totalCount={state.meta.pageCount}
            itemContent={thumbnailContent}
            components={thumbnailsComponents}
          />
        </div>
        <div className={clsx(['indicator', styles.thumbnailsIndicator])}>
          <div>
            <span className="page-count">
              {state.meta.pageCount > 0 ? cursor + 1 : 0}
            </span>
            /<span className="page-total">{state.meta.pageCount}</span>
          </div>
          <IconButton
            icon={collapsed ? <CollapseIcon /> : <ExpandIcon />}
            onClick={() => setCollapsed(!collapsed)}
          />
        </div>
      </div>
    </div>
  );
};

function PDFViewerStatus({ pdf }: { pdf: PDF }) {
  const state = useLiveData(pdf.state$);

  if (state?.status !== PDFStatus.Opened) {
    return null;
  }

  return <PDFViewerInner pdf={pdf} state={state} />;
}

export function PDFViewer({ model }: ViewerProps) {
  const pdfService = useService(PDFService);
  const [pdf, setPdf] = useState<PDF | null>(null);

  useEffect(() => {
    const { pdf, release } = pdfService.get(model);
    setPdf(pdf);

    return release;
  }, [model, pdfService, setPdf]);

  if (!pdf) {
    return null;
  }

  return <PDFViewerStatus pdf={pdf} />;
}
