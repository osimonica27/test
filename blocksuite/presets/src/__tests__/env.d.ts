import type { Doc, Workspace, Job } from '@blocksuite/store';

import type { AffineEditorContainer } from '../index.js';

declare global {
  const editor: AffineEditorContainer;
  const doc: Doc;
  const collection: Workspace;
  const job: Job;
  interface Window {
    editor: AffineEditorContainer;
    doc: Doc;
    job: Job;
    collection: Workspace;
  }
}
