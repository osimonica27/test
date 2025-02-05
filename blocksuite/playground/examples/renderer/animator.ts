import { type AffineEditorContainer } from '@blocksuite/presets';

import { CanvasRenderer } from './canvas-renderer.js';
import { editor } from './editor.js';
import type { Rect, SectionLayout } from './types.js';

async function wait(time: number = 100) {
  return new Promise(resolve => setTimeout(resolve, time));
}

function domRectToRect(domRect: DOMRect): Rect {
  return {
    x: domRect.x,
    y: domRect.y,
    w: domRect.width,
    h: domRect.height,
  };
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
    const beginLayout = this.renderer.hostLayout;

    await this.renderer.render(false);
    document.body.append(this.overlay);
    this.editor.mode = this.editor.mode === 'page' ? 'edgeless' : 'page';
    await wait();

    const endLayout = this.renderer.hostLayout;

    this.overlay.style.display = 'inherit';
    await this.animate(
      beginLayout.section,
      endLayout.section,
      domRectToRect(beginLayout.hostRect),
      domRectToRect(endLayout.hostRect)
    );
    this.overlay.style.display = 'none';
  }

  async animate(
    beginSection: SectionLayout,
    endSection: SectionLayout,
    beginHostRect: Rect,
    endHostRect: Rect
  ): Promise<void> {
    return new Promise(resolve => {
      const duration = 600;
      const startTime = performance.now();

      const animate = () => {
        const currentTime = performance.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        this.renderer.renderTransitionFrame(
          beginSection,
          endSection,
          beginHostRect,
          endHostRect,
          progress
        );

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
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
