import { useState } from 'react';
import { Virtuoso } from 'react-virtuoso';

import { defaultDocInfo, type DocInfo } from '../workers/types';
import { PdfPage } from './page';

export type PdfPagesProps = {
  pageClassName: string;
};

export const PdfPages = (props: PdfPagesProps) => {
  const [docInfo, _setDocInfo] = useState<DocInfo>(defaultDocInfo());

  const itemContent = (index: number) => {
    return (
      <PdfPage
        index={index}
        docInfo={docInfo}
        className={props.pageClassName}
      />
    );
  };

  return (
    <Virtuoso
      style={{ height: '400px' }}
      totalCount={200}
      itemContent={itemContent}
    />
  );
};
