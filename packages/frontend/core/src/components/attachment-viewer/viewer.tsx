import { IconButton, observeResize, Scrollable } from '@affine/component';
import {
  type PDFChannel,
  PDFService,
  type PDFWorker,
} from '@affine/core/modules/pdf';
import { MessageOp, RenderKind } from '@affine/core/modules/pdf/workers/types';
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
import { genSeq, getAttachmentBlob, renderItem } from './utils';

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
  const service = useService(PDFService);
  const [worker, setWorker] = useState<PDFWorker | null>(null);
  const docInfo = useLiveData(
    useMemo(
      () =>
        worker
          ? worker.docInfo$
          : new LiveData({
              total: 0,
              width: 1,
              height: 1,
            }),
      [worker]
    )
  );
  const [channel, setChannel] = useState<PDFChannel | null>(null);
  const [cursor, setCursor] = useState(0);
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
  const mainCaches = useMemo<Set<number>>(() => new Set(), []);

  const [collapsed, setCollapsed] = useState(true);
  const thumbnailsScrollerHandleRef = useRef<VirtuosoHandle | null>(null);
  const thumbnailsScrollerRef = useRef<HTMLElement | null>(null);
  const [thumbnailsVisibleRange, setThumbnailsVisibleRange] = useState({
    startIndex: 0,
    endIndex: 0,
  });
  const thumbnailsCaches = useMemo<Set<number>>(() => new Set(), []);

  const render = useCallback(
    (
      id: number,
      kind: RenderKind,
      width: number,
      height: number,
      buffer: Uint8ClampedArray
    ) => {
      const isPage = kind === RenderKind.Page;
      const container = isPage ? scrollerRef : thumbnailsScrollerRef;
      const name = isPage ? 'page' : 'thumbnail';
      renderItem(container.current, `pdf-${name}`, id, width, height, buffer);
    },
    [scrollerRef, thumbnailsScrollerRef]
  );

  const postQueue = useCallback(
    (caches: Set<number>, start: number, end: number, kind: RenderKind) => {
      if (!channel) return;

      const scale =
        viewportInfo.dpi *
        (kind === RenderKind.Thumbnail ? THUMBNAIL_WIDTH / docInfo.width : 1);
      const seq = new Set(genSeq(start, end, docInfo.total));

      // fixes doc with only one page
      if (seq.size === 1) {
        channel.post(MessageOp.Render, {
          index: 0,
          scale,
          kind,
        });
      } else {
        seq.difference(caches).forEach(index => {
          channel.post(MessageOp.Render, {
            index,
            scale,
            kind,
          });
        });
      }

      caches.clear();
      seq.forEach(index => caches.add(index));
    },
    [docInfo, viewportInfo, channel]
  );

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const { total } = docInfo;
    if (!total) return;

    const { scrollTop, scrollHeight } = el;
    const itemHeight = scrollHeight / total;
    const n = scrollTop / itemHeight;
    const t = n / total;
    const index = Math.floor(n + t);
    const cursor = Math.min(index, total - 1);

    setCursor(cursor);
  }, [scrollerRef, docInfo]);

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
    const { startIndex, endIndex } = mainVisibleRange;
    postQueue(mainCaches, startIndex, endIndex, RenderKind.Page);
  }, [postQueue, mainVisibleRange, mainCaches]);

  useEffect(() => {
    if (collapsed) return;
    const { startIndex, endIndex } = thumbnailsVisibleRange;
    postQueue(thumbnailsCaches, startIndex, endIndex, RenderKind.Thumbnail);
  }, [postQueue, thumbnailsVisibleRange, thumbnailsCaches, collapsed]);

  const pageContent = useCallback(
    (index: number) => {
      return (
        <Page
          key={index}
          index={index}
          className={clsx([styles.viewerPage, 'pdf-page'])}
          width={docInfo.width}
          height={docInfo.height}
        />
      );
    },
    [docInfo]
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
          height={Math.ceil((docInfo.height / docInfo.width) * THUMBNAIL_WIDTH)}
          onSelect={onSelect}
        />
      );
    },
    [cursor, docInfo, onSelect]
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
    const size = Math.min(5, docInfo.total);
    const itemHeight = docInfo.height + 20;
    const height = Math.ceil(size * itemHeight);
    return { top: height, bottom: height };
  }, [docInfo]);

  const mainStyle = useMemo(() => {
    const { height: vh } = viewportInfo;
    const { total: t, height: h, width: w } = docInfo;
    const height = Math.min(
      vh - 60 - 24 - 24 - 2 - 8,
      t * THUMBNAIL_WIDTH * (h / w) + (t - 1) * 12
    );
    return { height: `${height}px` };
  }, [docInfo, viewportInfo]);

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
    mainCaches.clear();
    thumbnailsCaches.clear();
    setMainVisibleRange({ startIndex: 0, endIndex: 0 });
    setThumbnailsVisibleRange({ startIndex: 0, endIndex: 0 });
  }, [channel, mainCaches, thumbnailsCaches]);

  useLayoutEffect(() => {
    const { worker, release } = service.get(model.id);

    const disposables = worker.on({
      ready: () => {
        if (worker.docInfo$.value.total) {
          return;
        }

        getAttachmentBlob(model)
          .then(blob => {
            if (!blob) return;
            return blob.arrayBuffer();
          })
          .then(buffer => {
            if (!buffer) return;
            worker.open(buffer);
          })
          .catch(showBoundary);
      },
    });

    const channel = worker.channel();
    channel
      .on(({ index, kind, height, width, buffer }) =>
        render(index, kind, width, height, buffer)
      )
      .start();

    setChannel(channel);
    setWorker(worker);

    return () => {
      channel.dispose();
      disposables[Symbol.dispose]();
      release();
    };
  }, [showBoundary, render, service, model]);

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
        totalCount={docInfo.total}
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
            totalCount={docInfo.total}
            itemContent={thumbnailContent}
            components={thumbnailsComponents}
          />
        </div>
        <div className={clsx(['indicator', styles.thumbnailsIndicator])}>
          <div>
            <span className="page-count">
              {docInfo.total > 0 ? cursor + 1 : 0}
            </span>
            /<span className="page-total">{docInfo.total}</span>
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
