import type { AttachmentBlockModel } from '@blocksuite/blocks';
import { ArrowDownBigIcon, PageIcon } from '@blocksuite/icons/rc';
import clsx from 'clsx';

import { Button } from '../../ui/button';
import * as styles from './styles.css';

interface ErrorProps {
  model: AttachmentBlockModel;
  ext: string;
  isPDF: boolean;
}

export const Error = ({ ext }: ErrorProps) => {
  return (
    <div className={clsx([styles.body, styles.error])}>
      <PageIcon />
      <h3 className={styles.errorTitle}>Unable to preview this file</h3>
      <p className={styles.errorMessage}>.{ext} file type not supported.</p>
      <div className={styles.errorBtns}>
        <Button variant="primary" prefix={<ArrowDownBigIcon />}>
          Download
        </Button>
        <Button>Retry</Button>
      </div>
    </div>
  );
};
