import type { GroupElementModel } from '@blocksuite/affine-model';
import { GfxElementModelView } from '@blocksuite/block-std/gfx';

import { mountGroupTitleEditor } from '../components/text-editor/mount';

export class GroupElementView extends GfxElementModelView<GroupElementModel> {
  static override type: string = 'group';

  override onCreated(): void {
    super.onCreated();

    this._initDblClickToEdit();
  }

  private _initDblClickToEdit(): void {
    this.on('dblclick', () => {
      const edgeless = this.std.view.getBlock(this.std.store.root!.id);

      if (edgeless) {
        mountGroupTitleEditor(this.model, edgeless);
      }
    });
  }
}
