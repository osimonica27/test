import type { Tag } from '@affine/env/filter';
import clsx from 'clsx';
import { useEffect, useMemo, useRef } from 'react';

import * as styles from './page-tags.css';

export interface PageTagsProps {
  tags: Tag[];
  maxItems?: number; // max number to show. if not specified, show all. if specified, show the first n items and add a "..." tag
  widthOnHover?: number | string; // max width on hover
  hoverExpandDirection?: 'left' | 'right'; // expansion direction on hover
}

const TagItem = ({ tag, idx }: { tag: Tag; idx: number }) => {
  return (
    <div data-testid="page-tag" className={styles.tag} data-idx={idx}>
      <div
        className={styles.tagIndicator}
        style={{
          backgroundColor: tag.color,
        }}
      />
      <div className={styles.tagLabel}>{tag.value}</div>
    </div>
  );
};

export const PageTags = ({
  tags,
  widthOnHover,
  maxItems,
  hoverExpandDirection,
}: PageTagsProps) => {
  const sanitizedWidthOnHover = widthOnHover
    ? typeof widthOnHover === 'string'
      ? widthOnHover
      : `${widthOnHover}px`
    : 'auto';
  const tagsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tagsContainerRef.current) {
      const tagsContainer = tagsContainerRef.current;
      const listener = () => {
        // on mouseleave, reset scroll position to the hoverExpandDirection
        tagsContainer.scrollTo({
          left: hoverExpandDirection === 'left' ? Number.MAX_SAFE_INTEGER : 0,
          behavior: 'smooth',
        });
      };
      listener();
      tagsContainerRef.current.addEventListener('mouseleave', listener);
      return () => {
        tagsContainer.removeEventListener('mouseleave', listener);
      };
    }
    return;
  }, [hoverExpandDirection]);

  const firstNTags = useMemo(() => {
    if (!maxItems) return tags;
    return tags.slice(0, maxItems);
  }, [maxItems, tags]);

  return (
    <div
      data-testid="page-tags"
      className={styles.root}
      style={{
        // @ts-expect-error it's fine
        '--hover-max-width': sanitizedWidthOnHover,
      }}
    >
      <div
        style={{
          right: hoverExpandDirection === 'left' ? 0 : 'auto',
          left: hoverExpandDirection === 'right' ? 0 : 'auto',
        }}
        className={clsx(styles.innerContainer)}
      >
        <div className={styles.innerBackdrop} />
        <div className={styles.tagsScrollContainer} ref={tagsContainerRef}>
          {firstNTags.map((tag, idx) => (
            <TagItem key={tag.id} tag={tag} idx={idx} />
          ))}
        </div>
      </div>
    </div>
  );
};
