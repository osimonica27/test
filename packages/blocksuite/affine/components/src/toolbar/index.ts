import { EditorIconButton } from './icon-button.js';
import {
  EditorMenuAction,
  EditorMenuButton,
  EditorMenuContent,
} from './menu-button.js';
import { EditorToolbarSeparator } from './separator.js';
import { EditorToolbar } from './toolbar.js';
import { Tooltip } from './tooltip.js';

export { EditorIconButton } from './icon-button.js';
export {
  EditorMenuAction,
  EditorMenuButton,
  EditorMenuContent,
} from './menu-button.js';
export { EditorToolbarSeparator } from './separator.js';
export { EditorToolbar } from './toolbar.js';
export { Tooltip } from './tooltip.js';
export type {
  AdvancedMenuItem,
  FatMenuItems,
  MenuItem,
  MenuItemGroup,
} from './types.js';
export {
  cloneGroups,
  groupsToActions,
  renderActions,
  renderGroups,
  renderToolbarSeparator,
} from './utils.js';

export function effects() {
  customElements.define('editor-toolbar-separator', EditorToolbarSeparator);
  customElements.define('editor-toolbar', EditorToolbar);
  customElements.define('editor-icon-button', EditorIconButton);
  customElements.define('editor-menu-button', EditorMenuButton);
  customElements.define('editor-menu-content', EditorMenuContent);
  customElements.define('editor-menu-action', EditorMenuAction);
  customElements.define('affine-tooltip', Tooltip);
}
