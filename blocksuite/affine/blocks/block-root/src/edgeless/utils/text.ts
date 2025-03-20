import type { FrameBlockModel } from '@blocksuite/affine-model';
import type { BlockComponent } from '@blocksuite/block-std';
import { GfxControllerIdentifier } from '@blocksuite/block-std/gfx';
import { BlockSuiteError, ErrorCode } from '@blocksuite/global/exceptions';

import { EdgelessFrameTitleEditor } from '../components/text/edgeless-frame-title-editor.js';

export function mountFrameTitleEditor(
  frame: FrameBlockModel,
  edgeless: BlockComponent
) {
  const mountElm = edgeless.querySelector('.edgeless-mount-point');
  if (!mountElm) {
    throw new BlockSuiteError(
      ErrorCode.ValueNotExists,
      "edgeless block's mount point does not exist"
    );
  }

  const gfx = edgeless.std.get(GfxControllerIdentifier);

  gfx.tool.setTool('default');
  gfx.selection.set({
    elements: [frame.id],
    editing: true,
  });

  const frameEditor = new EdgelessFrameTitleEditor();
  frameEditor.frameModel = frame;
  frameEditor.edgeless = edgeless;

  mountElm.append(frameEditor);
}
