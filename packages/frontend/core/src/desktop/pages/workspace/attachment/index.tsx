import { Skeleton } from '@affine/component';
import { AttachmentViewer } from '@affine/component/attachment-viewer';
import {
  type AttachmentBlockModel,
  matchFlavours,
} from '@blocksuite/affine/blocks';
import {
  type Doc,
  DocsService,
  FrameworkScope,
  useService,
} from '@toeverything/infra';
import { type ReactElement, useLayoutEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewTitle,
} from '../../../../modules/workbench';
import { PageNotFound } from '../../404';
import * as styles from './index.css';

enum State {
  Loading,
  NotFound,
  Found,
}

const useLoadAttachment = () => {
  const { pageId, attachmentId } = useParams();
  const docsService = useService(DocsService);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [state, setState] = useState(State.Loading);
  const [model, setModel] = useState<AttachmentBlockModel | null>(null);

  useLayoutEffect(() => {
    if (!pageId || !attachmentId) {
      setState(State.NotFound);
      return;
    }

    const { doc, release } = docsService.open(pageId);

    const disposables: Disposable[] = [];
    let notFound = true;

    if (doc.blockSuiteDoc.ready) {
      const block = doc.blockSuiteDoc.getBlock(attachmentId);
      if (block) {
        setModel(block.model as AttachmentBlockModel);
        setState(State.Found);
        notFound = false;
      }
    }

    if (notFound) {
      doc.blockSuiteDoc.load();

      const tid = setTimeout(() => setState(State.NotFound), 5 * 10000); // 50s
      const disposable = doc.blockSuiteDoc.slots.blockUpdated
        .filter(({ type, id }) => type === 'add' && id === attachmentId)
        // @ts-expect-error allow
        .filter(({ model }) => matchFlavours(model, ['affine:attachment']))
        // @ts-expect-error allow
        .once(({ model }) => {
          clearTimeout(tid);
          setModel(model as AttachmentBlockModel);
          setState(State.Found);
        });

      disposables.push({
        [Symbol.dispose]: () => clearTimeout(tid),
      });
      disposables.push({
        [Symbol.dispose]: () => disposable.dispose(),
      });
    }

    setDoc(doc);

    return () => {
      disposables.forEach(d => d[Symbol.dispose]());
      release();
    };
  }, [docsService, pageId, attachmentId]);

  return { doc, model, state };
};

export const AttachmentPage = (): ReactElement => {
  const { doc, model, state } = useLoadAttachment();

  if (state === State.NotFound) {
    return <PageNotFound noPermission />;
  }

  if (state === State.Found && doc && model) {
    return (
      <>
        <ViewTitle title={model.name} />
        <ViewIcon icon={model.type.endsWith('pdf') ? 'pdf' : 'attachment'} />
        <ViewHeader />
        <ViewBody>
          <FrameworkScope scope={doc.scope}>
            <AttachmentViewer model={model} />
          </FrameworkScope>
        </ViewBody>
      </>
    );
  }

  return (
    <div className={styles.attachmentSkeletonStyle}>
      <Skeleton
        className={styles.attachmentSkeletonItemStyle}
        animation="wave"
        height={30}
      />
      <Skeleton
        className={styles.attachmentSkeletonItemStyle}
        animation="wave"
        height={30}
        width="80%"
      />
      <Skeleton
        className={styles.attachmentSkeletonItemStyle}
        animation="wave"
        height={30}
      />
      <Skeleton
        className={styles.attachmentSkeletonItemStyle}
        animation="wave"
        height={30}
        width="70%"
      />
      <Skeleton
        className={styles.attachmentSkeletonItemStyle}
        animation="wave"
        height={30}
      />
    </div>
  );
};

export const Component = () => {
  return <AttachmentPage />;
};
