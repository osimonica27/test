import { type AffineEditorContainer } from '@blocksuite/presets';

import { CanvasRenderer } from './canvas-renderer.js';
import { editor } from './editor.js';

export class SwitchModeAnimator {
  constructor(private readonly editor: AffineEditorContainer) {}

  private readonly overlay = document.createElement('div');

  get editorRect() {
    return this.editor.getBoundingClientRect();
  }

  async switchMode() {
    this.initOverlay();

    const renderer = new CanvasRenderer(this.editor, this.overlay);
    await renderer.render();
    document.body.append(this.overlay);
    this.editor.mode = this.editor.mode === 'page' ? 'edgeless' : 'page';
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
