import { Scrollable } from '@affine/component';
import clsx from 'clsx';
import { forwardRef } from 'react';
import type { VirtuosoProps } from 'react-virtuoso';

import * as styles from './styles.css';

export type PDFVirtuosoContext = {
  width: number;
  height: number;
  pageClassName?: string;
  onPageSelect?: (index: number) => void;
};

export type PDFVirtuosoProps = VirtuosoProps<unknown, PDFVirtuosoContext>;

export const Scroller = forwardRef<HTMLDivElement, PDFVirtuosoProps>(
  ({ context: _, ...props }, ref) => {
    return (
      <Scrollable.Root>
        <Scrollable.Viewport ref={ref} {...props} />
        <Scrollable.Scrollbar />
      </Scrollable.Root>
    );
  }
);

Scroller.displayName = 'pdf-virtuoso-scroller';

export const List = forwardRef<HTMLDivElement, PDFVirtuosoProps>(
  ({ context: _, className, ...props }, ref) => {
    return (
      <div
        className={clsx([styles.virtuosoList, className])}
        ref={ref}
        {...props}
      />
    );
  }
);

List.displayName = 'pdf-virtuoso-list';

export const ListWithSmallGap = forwardRef<HTMLDivElement, PDFVirtuosoProps>(
  ({ context: _, className, ...props }, ref) => {
    return (
      <List className={clsx([className, 'small-gap'])} ref={ref} {...props} />
    );
  }
);

ListWithSmallGap.displayName = 'pdf-virtuoso-small-gap-list';

export const Item = forwardRef<HTMLDivElement, PDFVirtuosoProps>(
  ({ context: _, ...props }, ref) => {
    return <div className={styles.virtuosoItem} ref={ref} {...props} />;
  }
);

Item.displayName = 'pdf-virtuoso-item';

export const ListPadding = () => (
  <div style={{ width: '100%', height: '20px' }} />
);
