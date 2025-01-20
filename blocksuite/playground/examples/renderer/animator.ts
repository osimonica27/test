import { type AffineEditorContainer } from '@blocksuite/presets';

import { CanvasRenderer } from './canvas-renderer.js';
import { editor } from './editor.js';

async function wait(time: number = 100) {
  return new Promise(resolve => setTimeout(resolve, time));
}

export class SwitchModeAnimator {
  constructor(private readonly editor: AffineEditorContainer) {
    this.renderer = new CanvasRenderer(this.editor, this.overlay);
  }

  renderer: CanvasRenderer;

  private readonly overlay = document.createElement('div');

  get editorRect() {
    return this.editor.getBoundingClientRect();
  }

  async switchMode() {
    this.initOverlay();
    const beginLayout = this.renderer.getHostLayout();

    await this.renderer.render();
    document.body.append(this.overlay);
    this.editor.mode = this.editor.mode === 'page' ? 'edgeless' : 'page';
    await wait();

    const endLayout = this.renderer.getHostLayout();
    console.log(
      beginLayout.paragraphs.map(p => p.sentences),
      endLayout.paragraphs.map(p => p.sentences)
    );
  }

  initOverlay() {
    const { left, top, width, height } = this.editorRect;
    this.overlay.style.position = 'fixed';
    this.overlay.style.left = left + 'px';
    this.overlay.style.top = top + 'px';
    this.overlay.style.width = width + 'px';
    this.overlay.style.height = height + 'px';
    this.overlay.style.backgroundColor = 'white';
    this.overlay.style.pointerEvents = 'none';
    this.overlay.style.zIndex = '9999';
    this.overlay.style.display = 'flex';
    this.overlay.style.alignItems = 'flex-end';
  }
}

export const animator = new SwitchModeAnimator(editor);
