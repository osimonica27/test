import { useLayoutEffect } from 'react';

import type { DocInfo } from '../workers/types';

export type PdfPageProps = {
  className: string;
  index: number;
  docInfo: DocInfo;
};

export const PdfPage = (props: PdfPageProps) => {
  const {
    className,
    docInfo: { width, height },
  } = props;
  const style = {
    width: `${width}px`,
    height: `${height}px`,
  };

  useLayoutEffect(() => {}, []);

  return <div className={className} style={style}></div>;
};
