import { ViewportTurboRendererExtension } from '@blocksuite/block-std/gfx';

import { addSampleNotes } from './doc-generator.js';
import { setupEditor } from './setup.js';

async function init() {
  setupEditor('edgeless', [ViewportTurboRendererExtension]);
  addSampleNotes(doc, 100);
  doc.load();
}

init();
