import type { ShapeElementModel } from '@blocksuite/affine-model';
import { GfxElementModelView } from '@blocksuite/block-std/gfx';

import { mountShapeTextEditor } from '../components/text-editor/mount';

export class ShapeElementView extends GfxElementModelView<ShapeElementModel> {
  static override type: string = 'shape';

  override onCreated(): void {
    super.onCreated();

    this._initDblClickToEdit();
  }

  private _initDblClickToEdit(): void {
    const edgeless = this.std.view.getBlock(this.std.store.root!.id);

    this.on('dblclick', () => {
      if (edgeless) {
        mountShapeTextEditor(this.model, edgeless);
      }
    });
  }
}
