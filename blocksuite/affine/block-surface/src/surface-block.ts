import type { Color } from '@blocksuite/affine-model';
import { ThemeProvider } from '@blocksuite/affine-shared/services';
import type { EditorHost, SurfaceSelection } from '@blocksuite/block-std';
import { BlockComponent, RANGE_SYNC_EXCLUDE_ATTR } from '@blocksuite/block-std';
import {
  GfxControllerIdentifier,
  type Viewport,
} from '@blocksuite/block-std/gfx';
import type { Slot } from '@blocksuite/global/utils';
import { Bound } from '@blocksuite/global/utils';
import { css, html } from 'lit';
import { query } from 'lit/decorators.js';

import { ConnectorElementModel } from './element-model/index.js';
import { CanvasRenderer } from './renderer/canvas-renderer.js';
import type { ElementRenderer } from './renderer/elements/index.js';
import { OverlayIdentifier } from './renderer/overlay.js';
import type { SurfaceBlockModel } from './surface-model.js';
import type { SurfaceBlockService } from './surface-service.js';

export interface SurfaceContext {
  viewport: Viewport;
  host: EditorHost;
  elementRenderers: Record<string, ElementRenderer>;
  selection: {
    selectedIds: string[];
    slots: {
      updated: Slot<SurfaceSelection[]>;
    };
  };
}

export class SurfaceBlockComponent extends BlockComponent<
  SurfaceBlockModel,
  SurfaceBlockService
> {
  static isConnector = (element: unknown): element is ConnectorElementModel => {
    return element instanceof ConnectorElementModel;
  };

  static override styles = css`
    .affine-edgeless-surface-block-container {
      width: 100%;
      height: 100%;
    }

    .affine-edgeless-surface-block-container canvas {
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      position: absolute;
      z-index: 1;
      pointer-events: none;
    }

    edgeless-block-portal-container {
      position: relative;
      box-sizing: border-box;
      overflow: hidden;
      display: block;
      height: 100%;
      font-family: var(--affine-font-family);
      font-size: var(--affine-font-base);
      line-height: var(--affine-line-height);
      color: var(--affine-text-primary-color);
      font-weight: 400;
    }

    .affine-block-children-container.edgeless {
      padding-left: 0;
      position: relative;
      overflow: hidden;
      height: 100%;
      /**
       * Fix: pointerEvent stops firing after a short time.
       * When a gesture is started, the browser intersects the touch-action values of the touched element and its ancestors,
       * up to the one that implements the gesture (in other words, the first containing scrolling element)
       * https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
       */
      touch-action: none;
      background-color: var(--affine-background-primary-color);
      background-image: radial-gradient(
        var(--affine-edgeless-grid-color) 1px,
        var(--affine-background-primary-color) 1px
      );
      z-index: 0;
    }

    .affine-edgeless-block-child {
      position: absolute;
      transform-origin: center;
      box-sizing: border-box;
      border: 2px solid var(--affine-white-10);
      border-radius: 8px;
      box-shadow: var(--affine-shadow-3);
      pointer-events: all;
    }
  `;

  private _cachedViewport = new Bound();

  private readonly _initThemeObserver = () => {
    const theme = this.std.get(ThemeProvider);
    this.disposables.add(theme.theme$.subscribe(() => this.requestUpdate()));
  };

  private _lastTime = 0;

  private _renderer!: CanvasRenderer;

  fitToViewport = (bound: Bound) => {
    const { viewport } = this._gfx;
    bound = bound.expand(30);
    if (Date.now() - this._lastTime > 200)
      this._cachedViewport = viewport.viewportBounds;
    this._lastTime = Date.now();

    if (this._cachedViewport.contains(bound)) return;

    this._cachedViewport = this._cachedViewport.unite(bound);
    viewport.setViewportByBound(this._cachedViewport, [0, 0, 0, 0], true);
  };

  refresh = () => {
    this._renderer?.refresh();
  };

  private get _edgelessService() {
    return this.std.getService('affine:page') as unknown as SurfaceContext;
  }

  private get _gfx() {
    return this.std.get(GfxControllerIdentifier);
  }

  get renderer() {
    return this._renderer;
  }

  private _initOverlays() {
    this.std.provider.getAll(OverlayIdentifier).forEach(overlay => {
      this._renderer.addOverlay(overlay);
    });

    this._disposables.add(() => {
      this.std.provider.getAll(OverlayIdentifier).forEach(overlay => {
        this._renderer.removeOverlay(overlay);
      });
    });
  }

  private _initRenderer() {
    const gfx = this._gfx;
    const themeService = this.std.get(ThemeProvider);

    this._renderer = new CanvasRenderer({
      viewport: gfx.viewport,
      layerManager: gfx.layer,
      gridManager: gfx.grid,
      enableStackingCanvas: true,
      provider: {
        generateColorProperty: (color: Color, fallback?: Color) =>
          themeService.generateColorProperty(
            color,
            fallback,
            themeService.edgelessTheme
          ),
        getColorValue: (color: Color, fallback?: Color, real?: boolean) =>
          themeService.getColorValue(
            color,
            fallback,
            real,
            themeService.edgelessTheme
          ),
        getColorScheme: () => themeService.edgelessTheme,
        getPropertyValue: (property: string) =>
          themeService.getCssVariableColor(
            property,
            themeService.edgelessTheme
          ),
        selectedElements: () => this._edgelessService.selection.selectedIds,
      },
      onStackingCanvasCreated(canvas) {
        canvas.className = 'indexable-canvas';
      },
      elementRenderers: this._edgelessService.elementRenderers,
      surfaceModel: this.model,
    });

    this._disposables.add(() => {
      this._renderer.dispose();
    });
    this._disposables.add(
      this._renderer.stackingCanvasUpdated.on(payload => {
        if (payload.added.length) {
          this._surfaceContainer.append(...payload.added);
        }

        if (payload.removed.length) {
          payload.removed.forEach(canvas => {
            canvas.remove();
          });
        }
      })
    );
    this._disposables.add(
      this._edgelessService.selection.slots.updated.on(() => {
        this._renderer.refresh();
      })
    );
  }

  override connectedCallback() {
    super.connectedCallback();

    this.setAttribute(RANGE_SYNC_EXCLUDE_ATTR, 'true');

    this._initThemeObserver();
    this._initRenderer();
    this._initOverlays();
  }

  override firstUpdated() {
    this._renderer.attach(this._surfaceContainer);
    this._surfaceContainer.append(...this._renderer.stackingCanvas);
  }

  override render() {
    return html`
      <div class="affine-edgeless-surface-block-container">
        <!-- attach canvas later in renderer -->
      </div>
    `;
  }

  @query('.affine-edgeless-surface-block-container')
  private accessor _surfaceContainer!: HTMLElement;
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-surface': SurfaceBlockComponent;
  }
}
