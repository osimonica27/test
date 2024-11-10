import { IconButton, observeResize, Scrollable } from '@affine/component';
import type { Pdf, PdfSender } from '@affine/core/modules/pdf';
import { PdfsService } from '@affine/core/modules/pdf';
import {
  defaultDocInfo,
  RenderKind,
  type RenderOut,
  State,
} from '@affine/core/modules/pdf/workers/types';
import type { AttachmentBlockModel } from '@blocksuite/affine/blocks';
import { CollapseIcon, ExpandIcon } from '@blocksuite/icons/rc';
import { LiveData, useLiveData, useService } from '@toeverything/infra';
import clsx from 'clsx';
import { debounce } from 'lodash-es';
import type { ReactElement } from 'react';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useErrorBoundary } from 'react-error-boundary';
import type { VirtuosoHandle, VirtuosoProps } from 'react-virtuoso';
import { Virtuoso } from 'react-virtuoso';

import * as styles from './styles.css';
import { genSeq, renderItem } from './utils';

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

export const Viewer = ({ model }: ViewerProps): ReactElement => {
  const { showBoundary } = useErrorBoundary();
  const pdfsService = useService(PdfsService);
  const [pdf, setPdf] = useState<Pdf | null>(null);
  const [sender, setSender] = useState<PdfSender | null>(null);
  const [cursor, setCursor] = useState(0);
  const info = useLiveData(
    useMemo(
      () =>
        pdf
          ? pdf.info$
          : new LiveData({ state: State.IDLE, ...defaultDocInfo() }),
      [pdf]
    )
  );

  const [viewportInfo, setViewportInfo] = useState({
    dpi: window.devicePixelRatio,
    width: 1,
    height: 1,
  });
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const scrollerHandleRef = useRef<VirtuosoHandle | null>(null);

  const [mainVisibleRange, setMainVisibleRange] = useState({
    startIndex: 0,
    endIndex: 0,
  });
  const mainRenderingSeq$ = useMemo(
    () =>
      new LiveData<{
        seq: Set<number>;
        diff: Set<number>;
      }>({
        seq: new Set(),
        diff: new Set(),
      }),
    []
  );

  const [collapsed, setCollapsed] = useState(true);
  const thumbnailsScrollerHandleRef = useRef<VirtuosoHandle | null>(null);
  const thumbnailsScrollerRef = useRef<HTMLElement | null>(null);
  const [thumbnailsVisibleRange, setThumbnailsVisibleRange] = useState({
    startIndex: 0,
    endIndex: 0,
  });
  const thumbnailsRenderingSeq$ = useMemo(
    () =>
      new LiveData<{
        seq: Set<number>;
        diff: Set<number>;
      }>({
        seq: new Set(),
        diff: new Set(),
      }),
    []
  );

  const render = useCallback(
    (data: RenderOut) => {
      const isPage = data.kind === RenderKind.Page;
      const container = isPage ? scrollerRef : thumbnailsScrollerRef;
      const name = isPage ? 'page' : 'thumbnail';
      renderItem(container.current, `pdf-${name}`, data);
    },
    [scrollerRef, thumbnailsScrollerRef]
  );

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const { total } = info;
    if (!total) return;

    const { scrollTop, scrollHeight } = el;
    const itemHeight = scrollHeight / total;
    const n = scrollTop / itemHeight;
    const t = n / total;
    const index = Math.floor(n + t);
    const cursor = Math.min(index, total - 1);

    setCursor(cursor);
  }, [scrollerRef, info]);

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

  const updateMainVisibleRange = useMemo(
    () => debounce(setMainVisibleRange, 233, { trailing: true }),
    [setMainVisibleRange]
  );

  const updateThumbnailsVisibleRange = useMemo(
    () => debounce(setThumbnailsVisibleRange, 233, { trailing: true }),
    [setThumbnailsVisibleRange]
  );

  const updateSeq = useCallback(
    (
      range: { startIndex: number; endIndex: number },
      seq$: LiveData<{
        seq: Set<number>;
        diff: Set<number>;
      }>
    ) => {
      if (!sender) return;
      const { startIndex, endIndex } = range;
      const seq = new Set(genSeq(startIndex, endIndex, info.total));
      seq$.next({
        seq,
        diff: seq.difference(seq$.value.seq),
      });
    },
    [info, sender]
  );

  const createRenderingSubscriber = useCallback(
    (
      seq$: LiveData<{
        seq: Set<number>;
        diff: Set<number>;
      }>,
      kind: RenderKind
    ) => {
      if (!sender) return;

      const scale =
        (kind === RenderKind.Page ? 1 : THUMBNAIL_WIDTH / info.width) *
        viewportInfo.dpi;

      let unsubscribe: () => void;

      const subscriber = seq$.subscribe(({ seq: _, diff }) => {
        unsubscribe?.();

        unsubscribe = sender.subscribe(
          'render',
          { seq: Array.from(diff), kind, scale },
          {
            next: data => {
              if (!data) return;
              render(data);
            },
            error: err => {
              console.error(err);
              unsubscribe();
            },
          }
        );
      });

      return () => {
        unsubscribe?.();
        subscriber.unsubscribe();
      };
    },
    [viewportInfo, info, render, sender]
  );

  const pageContent = useCallback(
    (index: number) => {
      return (
        <Page
          key={index}
          index={index}
          className={clsx([styles.viewerPage, 'pdf-page'])}
          width={info.width}
          height={info.height}
        />
      );
    },
    [info]
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
          height={Math.ceil((info.height / info.width) * THUMBNAIL_WIDTH)}
          onSelect={onSelect}
        />
      );
    },
    [cursor, info, onSelect]
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

  const increaseViewportBy = useMemo(() => {
    const size = Math.min(5, info.total);
    const itemHeight = info.height + 20;
    const height = Math.ceil(size * itemHeight);
    return { top: height, bottom: height };
  }, [info]);

  const mainStyle = useMemo(() => {
    const { height: vh } = viewportInfo;
    const { total: t, height: h, width: w } = info;
    const height = Math.min(
      vh - 60 - 24 - 24 - 2 - 8,
      t * THUMBNAIL_WIDTH * (h / w) + (t - 1) * 12
    );
    return { height: `${height}px` };
  }, [info, viewportInfo]);

  useEffect(() => {
    const unsubscribe = createRenderingSubscriber(
      mainRenderingSeq$,
      RenderKind.Page
    );
    return () => {
      unsubscribe?.();
    };
  }, [scrollerRef, createRenderingSubscriber, mainRenderingSeq$]);

  useEffect(() => {
    const unsubscribe = createRenderingSubscriber(
      thumbnailsRenderingSeq$,
      RenderKind.Thumbnail
    );
    return () => {
      unsubscribe?.();
    };
  }, [
    thumbnailsScrollerHandleRef,
    createRenderingSubscriber,
    thumbnailsRenderingSeq$,
  ]);

  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;

    return observeResize(el, entry => {
      const rect = entry.contentRect;
      setViewportInfo(info => ({
        ...info,
        width: rect.width,
        height: rect.height,
      }));
    });
  }, [viewerRef]);

  useEffect(() => {
    updateSeq(mainVisibleRange, mainRenderingSeq$);
  }, [updateSeq, mainVisibleRange, mainRenderingSeq$]);

  useEffect(() => {
    if (collapsed) return;
    updateSeq(thumbnailsVisibleRange, thumbnailsRenderingSeq$);
  }, [collapsed, updateSeq, thumbnailsVisibleRange, thumbnailsRenderingSeq$]);

  useEffect(() => {
    scrollerHandleRef.current?.scrollToIndex({
      index: 0,
      align: 'start',
    });
    thumbnailsScrollerHandleRef.current?.scrollToIndex({
      index: 0,
      align: 'start',
    });
    setCursor(0);
    mainRenderingSeq$.next({ seq: new Set(), diff: new Set() });
    thumbnailsRenderingSeq$.next({ seq: new Set(), diff: new Set() });
    setMainVisibleRange({ startIndex: 0, endIndex: 0 });
    setThumbnailsVisibleRange({ startIndex: 0, endIndex: 0 });
  }, [sender, mainRenderingSeq$, thumbnailsRenderingSeq$]);

  useLayoutEffect(() => {
    if (!model.sourceId) {
      showBoundary('Attachment not found');
      return;
    }

    let unsubscribe: () => void;

    const { pdf, release } = pdfsService.get(model);

    setPdf(pdf);

    const subscriber = pdf.open(model).subscribe({
      error: error => {
        console.log(error);
      },
      complete: () => {
        const { sender, release } = pdf.client.channel();
        setSender(sender);
        unsubscribe = release;
      },
    });

    return () => {
      unsubscribe?.();
      subscriber.unsubscribe();
      release();
    };
  }, [showBoundary, pdfsService, model]);

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
      ref={viewerRef}
    >
      <Virtuoso<null, ItemProps['context']>
        key={model.id}
        onScroll={onScroll}
        ref={scrollerHandleRef}
        scrollerRef={scroller => {
          scrollerRef.current = scroller as HTMLElement;
        }}
        className={styles.virtuoso}
        rangeChanged={updateMainVisibleRange}
        increaseViewportBy={increaseViewportBy}
        totalCount={info.total}
        itemContent={pageContent}
        components={mainComponents}
      />
      <div className={clsx(['thumbnails', styles.thumbnails])}>
        <div className={clsx([styles.thumbnailsPages, { collapsed }])}>
          <Virtuoso<null, ItemProps['context']>
            key={model.id}
            style={mainStyle}
            ref={thumbnailsScrollerHandleRef}
            scrollerRef={scroller => {
              thumbnailsScrollerRef.current = scroller as HTMLElement;
            }}
            rangeChanged={updateThumbnailsVisibleRange}
            className={styles.virtuoso}
            totalCount={info.total}
            itemContent={thumbnailContent}
            components={thumbnailsComponents}
          />
        </div>
        <div className={clsx(['indicator', styles.thumbnailsIndicator])}>
          <div>
            <span className="page-count">
              {info.total > 0 ? cursor + 1 : 0}
            </span>
            /<span className="page-total">{info.total}</span>
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
