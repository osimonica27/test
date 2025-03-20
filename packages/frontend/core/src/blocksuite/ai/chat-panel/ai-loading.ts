import { ShadowlessElement } from '@blocksuite/affine/block-std';
import { unsafeCSSVar } from '@blocksuite/affine/shared/theme';
import { css, html, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';

export class AILoading extends ShadowlessElement {
  static override styles = css`
    .ai-loading {
      display: flex;
      align-items: center;
      margin-left: -14px;
      color: ${unsafeCSSVar('primaryColor')};
      /* light/smMedium */
      font-family: Inter;
      font-size: 14px;
      font-style: normal;
      font-weight: 500;
      line-height: 22px;

      rive-player {
        display: contents;
      }

      .thinking-text {
        margin-left: -5px;
      }
    }
  `;

  @property({ attribute: false })
  accessor icon!: TemplateResult;

  @property({ attribute: false })
  accessor text: string = '';

  protected override render() {
    return html`
      <div class="ai-loading">
        ${this.icon}
        <span class="loading-text">${this.text}</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ai-loading': AILoading;
  }
}

export default AILoading;
