import type { EditorContainer } from '@blocksuite/editor';
import type { Page } from '@blocksuite/store';
import { assertExists } from '@blocksuite/store';
import { useBlockSuiteWorkspacePageTitle } from '@toeverything/hooks/use-blocksuite-workspace-page-title';
import { useAtomValue, useSetAtom } from 'jotai';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import type React from 'react';
import { useCallback } from 'react';

import { currentEditorAtom, workspacePreferredModeAtom } from '../atoms';
import { useCurrentWorkspace } from '../hooks/current/use-current-workspace';
import { usePageMeta } from '../hooks/use-page-meta';
import type { BlockSuiteWorkspace } from '../shared';
import { PageNotFoundError } from './affine/affine-error-eoundary';
import { WorkspaceHeader } from './blocksuite/workspace-header';

export type PageDetailEditorProps = {
  isPublic?: boolean;
  isPreview?: boolean;
  blockSuiteWorkspace: BlockSuiteWorkspace;
  pageId: string;
  onInit: (page: Page, editor: Readonly<EditorContainer>) => void;
  onLoad?: (page: Page, editor: EditorContainer) => void;
  header?: React.ReactNode;
};

const Editor = dynamic(
  async () =>
    (await import('./blocksuite/block-suite-editor')).BlockSuiteEditor,
  {
    ssr: false,
  }
);

export const PageDetailEditor: React.FC<PageDetailEditorProps> = ({
  blockSuiteWorkspace,
  pageId,
  onInit,
  onLoad,
  header,
  isPublic,
  isPreview,
}) => {
  const page = blockSuiteWorkspace.getPage(pageId);
  if (!page) {
    throw new PageNotFoundError(blockSuiteWorkspace, pageId);
  }
  const title = useBlockSuiteWorkspacePageTitle(blockSuiteWorkspace, pageId);
  const meta = usePageMeta(blockSuiteWorkspace).find(
    meta => meta.id === pageId
  );
  const currentMode =
    useAtomValue(workspacePreferredModeAtom)[pageId] ?? 'page';
  const setEditor = useSetAtom(currentEditorAtom);
  assertExists(meta);
  // todo: move this to top level
  const [currentWorkspace] = useCurrentWorkspace();
  assertExists(currentWorkspace);
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <WorkspaceHeader
        isPublic={isPublic ?? false}
        isPreview={isPreview ?? false}
        workspace={currentWorkspace}
        currentPage={page}
        key={pageId}
      >
        {header}
      </WorkspaceHeader>
      <Editor
        style={{
          height: 'calc(100% - 52px)',
        }}
        key={pageId}
        mode={isPublic ? 'page' : currentMode}
        page={page}
        onInit={useCallback(
          (page: Page, editor: Readonly<EditorContainer>) => {
            setEditor(editor);
            onInit(page, editor);
          },
          [onInit, setEditor]
        )}
        onLoad={useCallback(
          (page: Page, editor: EditorContainer) => {
            setEditor(editor);
            onLoad?.(page, editor);
          },
          [onLoad, setEditor]
        )}
      />
    </>
  );
};
