import {
  ViewportTurboRendererExtension,
  ViewportTurboRendererIdentifier,
} from '@blocksuite/affine-shared/viewport-renderer';

import { addSampleNotes } from './doc-generator.js';
import { setupEditor } from './setup.js';

async function init() {
  setupEditor('edgeless', [ViewportTurboRendererExtension]);
  addSampleNotes(doc, 100);
  doc.load();

  const renderer = editor.std.get(ViewportTurboRendererIdentifier);
  // @ts-expect-error dev
  window.renderer = renderer;
}

init();
