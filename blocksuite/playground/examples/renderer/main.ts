import '../../style.css';

import { effects as blocksEffects } from '@blocksuite/blocks/effects';
import { PageEditor } from '@blocksuite/presets';
import { effects as presetsEffects } from '@blocksuite/presets/effects';
import { Text } from '@blocksuite/store';

import { createEmptyDoc } from '../../apps/_common/helper';
import { initToCanvasSync } from './to-canvas.js';

blocksEffects();
presetsEffects();

const doc = createEmptyDoc().init();
const editor = new PageEditor();
editor.doc = doc;
document.querySelector('#left-column')?.append(editor);

const addParagraph = (content: string) => {
  const note = doc.getBlockByFlavour('affine:note')[0];
  const props = {
    text: new Text(content),
  };
  doc.addBlock('affine:paragraph', props, note.id);
};

const firstParagraph = doc.getBlockByFlavour('affine:paragraph')[0];
doc.updateBlock(firstParagraph, { text: new Text('Renderer') });

addParagraph('Hello World!');
addParagraph(
  'Hello World! Lorem ipsum dolor sit amet. Consectetur adipiscing elit. Sed do eiusmod tempor incididunt.'
);
addParagraph(
  '你好这是测试，这是一个为了换行而写的中文段落。这个段落会自动换行。'
);

initToCanvasSync();
