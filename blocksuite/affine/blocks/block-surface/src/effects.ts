import { EdgelessConnectorLabelEditor } from './components/text-editor/edgeless-connector-label-editor.js';
import { EdgelessGroupTitleEditor } from './components/text-editor/edgeless-group-title-editor.js';
import { EdgelessShapeTextEditor } from './components/text-editor/edgeless-shape-text-editor.js';
import { SurfaceBlockComponent } from './surface-block.js';
import { SurfaceBlockVoidComponent } from './surface-block-void.js';

export function effects() {
  registerTextEditor();

  customElements.define('affine-surface-void', SurfaceBlockVoidComponent);
  customElements.define('affine-surface', SurfaceBlockComponent);
}

export function registerTextEditor() {
  customElements.define(
    'edgeless-connector-label-editor',
    EdgelessConnectorLabelEditor
  );
  customElements.define('edgeless-shape-text-editor', EdgelessShapeTextEditor);
  customElements.define(
    'edgeless-group-title-editor',
    EdgelessGroupTitleEditor
  );
}

declare global {
  interface HTMLElementTagNameMap {
    'edgeless-connector-label-editor': EdgelessConnectorLabelEditor;
    'edgeless-group-title-editor': EdgelessGroupTitleEditor;
    'edgeless-shape-text-editor': EdgelessShapeTextEditor;
  }
}
