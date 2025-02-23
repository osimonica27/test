import {
  type BlockStdScope,
  LifeCycleWatcher,
  LifeCycleWatcherIdentifier,
  StdIdentifier,
} from '@blocksuite/block-std';
import { GfxControllerIdentifier } from '@blocksuite/block-std/gfx';
import { type Container, type ServiceIdentifier } from '@blocksuite/global/di';
import { debounce, DisposableGroup } from '@blocksuite/global/utils';
import { type Pane } from 'tweakpane';

import {
  getViewportLayout,
  initTweakpane,
  syncCanvasSize,
} from './dom-utils.js';
import { type ViewportLayout } from './types.js';

export const ViewportTurboRendererIdentifier = LifeCycleWatcherIdentifier(
  'ViewportTurboRenderer'
) as ServiceIdentifier<ViewportTurboRendererExtension>;

class Tile {
  bitmap: ImageBitmap;
  zoom: number;
  version: number;
  constructor(bitmap: ImageBitmap, zoom: number, version: number) {
    this.bitmap = bitmap;
    this.zoom = zoom;
    this.version = version;
  }
  close() {
    this.bitmap.close();
  }
}

interface LayoutCache {
  layout: ViewportLayout;
  version: number;
}

// With high enough zoom, fallback to DOM rendering
const zoomThreshold = 1;

export class ViewportTurboRendererExtension extends LifeCycleWatcher {
  state: 'monitoring' | 'paused' = 'paused';
  disposables = new DisposableGroup();

  static override setup(di: Container) {
    di.addImpl(ViewportTurboRendererIdentifier, this, [StdIdentifier]);
  }

  public readonly canvas: HTMLCanvasElement = document.createElement('canvas');
  private readonly worker: Worker;
  private layoutCache: LayoutCache | null = null;
  private tile: Tile | null = null;
  private debugPane: Pane | null = null;
  private currentVersion = 0;

  constructor(std: BlockStdScope) {
    super(std);
    this.worker = new Worker(new URL('./painter.worker.ts', import.meta.url), {
      type: 'module',
    });
  }

  override mounted() {
    const mountPoint = document.querySelector('.affine-edgeless-viewport');
    if (mountPoint) {
      mountPoint.append(this.canvas);
      initTweakpane(this, mountPoint as HTMLElement);
    }

    this.viewport.elementReady.once(() => {
      syncCanvasSize(this.canvas, this.std.host);
      this.state = 'monitoring';
      this.disposables.add(
        this.viewport.viewportUpdated.on(() => {
          this.refresh().catch(console.error);
        })
      );
    });

    const debouncedRefresh = debounce(
      () => {
        this.refresh().catch(console.error);
      },
      1000, // During this period, fallback to DOM
      { leading: false, trailing: true }
    );
    this.disposables.add(
      this.std.store.slots.blockUpdated.on(() => {
        this.invalidate();
        debouncedRefresh();
      })
    );
  }

  override unmounted() {
    this.clearTile();
    if (this.debugPane) {
      this.debugPane.dispose();
      this.debugPane = null;
    }
    this.worker.terminate();
    this.canvas.remove();
    this.disposables.dispose();
  }

  get viewport() {
    return this.std.get(GfxControllerIdentifier).viewport;
  }

  async refresh() {
    if (this.state === 'paused') return;

    if (this.viewport.zoom > zoomThreshold) {
      this.clearCanvas();
    } else if (this.canUseBitmapCache()) {
      this.drawCachedBitmap(this.layoutCache!.layout);
    } else {
      if (!this.layoutCache) {
        this.updateLayoutCache();
      }
      const layoutCache = this.layoutCache!;
      await this.paintLayout(layoutCache);
      this.drawCachedBitmap(layoutCache.layout);
    }
  }

  invalidate() {
    this.clearCache();
    this.clearCanvas();
  }

  private updateLayoutCache() {
    const layout = getViewportLayout(this.std.host, this.viewport);
    this.currentVersion++;
    this.layoutCache = {
      layout,
      version: this.currentVersion,
    };
  }

  private clearCache() {
    this.layoutCache = null;
    this.clearTile();
  }

  private clearTile() {
    if (this.tile) {
      this.tile.close();
      this.tile = null;
    }
  }

  private async paintLayout(layoutCache: LayoutCache): Promise<void> {
    return new Promise(resolve => {
      if (!this.worker) return;

      const { layout, version } = layoutCache;
      const dpr = window.devicePixelRatio;
      this.worker.postMessage({
        type: 'paintLayout',
        data: {
          layout,
          width: layout.rect.w,
          height: layout.rect.h,
          dpr,
          zoom: this.viewport.zoom,
          version,
        },
      });

      this.worker.onmessage = (e: MessageEvent) => {
        if (e.data.type === 'bitmapPainted') {
          this.handlePaintedBitmap(
            e.data.bitmap,
            layout,
            e.data.version,
            resolve
          );
        }
      };
    });
  }

  private updateTile(bitmap: ImageBitmap, zoom: number, version: number) {
    if (this.tile) {
      this.tile.close();
    }
    this.tile = new Tile(bitmap, zoom, version);
  }

  private handlePaintedBitmap(
    bitmap: ImageBitmap,
    layout: ViewportLayout,
    version: number,
    resolve: () => void
  ) {
    const { layoutCache } = this;
    const canUseBitmap = !!layoutCache && version === layoutCache.version;

    if (canUseBitmap) {
      this.updateTile(bitmap, this.viewport.zoom, version);
      this.drawCachedBitmap(layout);
      resolve();
    } else {
      this.clearTile();
      bitmap.close();
      resolve();
    }
  }

  private canUseBitmapCache(): boolean {
    return (
      !!this.layoutCache &&
      !!this.tile &&
      this.viewport.zoom === this.tile.zoom &&
      this.layoutCache.version === this.tile.version
    );
  }

  private clearCanvas() {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawCachedBitmap(layout: ViewportLayout) {
    // During async painting, the layout cache has been invalidated
    if (!this.tile) return;

    const bitmap = this.tile.bitmap;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    this.clearCanvas();
    const layoutViewCoord = this.viewport.toViewCoord(
      layout.rect.x,
      layout.rect.y
    );

    ctx.drawImage(
      bitmap,
      layoutViewCoord[0] * window.devicePixelRatio,
      layoutViewCoord[1] * window.devicePixelRatio,
      layout.rect.w * window.devicePixelRatio * this.viewport.zoom,
      layout.rect.h * window.devicePixelRatio * this.viewport.zoom
    );
  }
}
