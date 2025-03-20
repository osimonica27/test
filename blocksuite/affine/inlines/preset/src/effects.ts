import { AffineText } from './nodes/affine-text';
import { AffineFootnoteNode } from './nodes/footnote-node/footnote-node';
import { FootNotePopup } from './nodes/footnote-node/footnote-popup';
import { FootNotePopupChip } from './nodes/footnote-node/footnote-popup-chip';
import { LatexEditorMenu } from './nodes/latex-node/latex-editor-menu';
import { LatexEditorUnit } from './nodes/latex-node/latex-editor-unit';
import { AffineLatexNode } from './nodes/latex-node/latex-node';

export function effects() {
  customElements.define('affine-text', AffineText);
  customElements.define('latex-editor-menu', LatexEditorMenu);
  customElements.define('latex-editor-unit', LatexEditorUnit);
  customElements.define('affine-latex-node', AffineLatexNode);
  customElements.define('affine-footnote-node', AffineFootnoteNode);
  customElements.define('footnote-popup', FootNotePopup);
  customElements.define('footnote-popup-chip', FootNotePopupChip);
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-latex-node': AffineLatexNode;
    'affine-footnote-node': AffineFootnoteNode;
    'footnote-popup': FootNotePopup;
    'footnote-popup-chip': FootNotePopupChip;
    'affine-text': AffineText;
    'latex-editor-unit': LatexEditorUnit;
    'latex-editor-menu': LatexEditorMenu;
  }
}
