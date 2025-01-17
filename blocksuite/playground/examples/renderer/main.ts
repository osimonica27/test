import { Text } from '@blocksuite/store';

import { CanvasRenderer } from './canvas-renderer.js';
import { doc, editor } from './editor.js';

function initUI() {
  const toCanvasButton = document.querySelector('#to-canvas-button')!;
  const targetContainer = <HTMLDivElement>(
    document.querySelector('#right-column')
  );
  toCanvasButton.addEventListener('click', () => {
    const host = document.querySelector('editor-host')!;
    const renderer = new CanvasRenderer(host, targetContainer);
    renderer.render();
  });
  document.querySelector('#left-column')?.append(editor);
}

function addParagraph(content: string) {
  const note = doc.getBlockByFlavour('affine:note')[0];
  const props = {
    text: new Text(content),
  };
  doc.addBlock('affine:paragraph', props, note.id);
}

function main() {
  initUI();

  const firstParagraph = doc.getBlockByFlavour('affine:paragraph')[0];
  doc.updateBlock(firstParagraph, { text: new Text('Renderer') });

  addParagraph('Hello World!');
  addParagraph(
    'Hello World! Lorem ipsum dolor sit amet. Consectetur adipiscing elit. Sed do eiusmod tempor incididunt.'
  );
  addParagraph(
    '你好这是测试，这是一个为了换行而写的中文段落。这个段落会自动换行。'
  );
}

main();
