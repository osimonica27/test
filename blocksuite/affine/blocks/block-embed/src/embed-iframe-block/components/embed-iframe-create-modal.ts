import { unsafeCSSVar, unsafeCSSVarV2 } from '@blocksuite/affine-shared/theme';
import { isValidUrl, stopPropagation } from '@blocksuite/affine-shared/utils';
import { WithDisposable } from '@blocksuite/global/lit';
import { CloseIcon, EmbedIcon } from '@blocksuite/icons/lit';
import type { BlockStdScope } from '@blocksuite/std';
import type { BlockModel } from '@blocksuite/store';
import { css, html, LitElement, nothing } from 'lit';
import { property, query, state } from 'lit/decorators.js';

import { EmbedIframeService } from '../extension/embed-iframe-service';

export class EmbedIframeCreateModal extends WithDisposable(LitElement) {
  static override styles = css`
    .embed-iframe-create-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
    }

    .embed-iframe-create-modal-mask {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }

    .modal-main-wrapper {
      position: relative;
      box-sizing: border-box;
      width: 340px;
      padding: 0 24px;
      border-radius: 12px;
      background: ${unsafeCSSVarV2('layer/background/overlayPanel')};
      box-shadow: ${unsafeCSSVar('overlayPanelShadow')};
      z-index: var(--affine-z-index-modal);
    }

    .modal-content-wrapper {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .modal-close-button {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 24px;
      height: 24px;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      color: var(--affine-icon-color);
      border-radius: 4px;
    }
    .modal-close-button:hover {
      background-color: var(--affine-hover-color);
    }

    .modal-content-header {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .icon-container {
        padding-top: 48px;
        padding-bottom: 16px;
        display: flex;
        justify-content: center;

        .icon-background {
          display: flex;
          width: 64px;
          height: 64px;
          justify-content: center;
          align-items: center;
          border-radius: 50%;
          background: var(--affine-background-secondary-color);
          color: ${unsafeCSSVarV2('icon/primary')};
        }
      }

      .title,
      .description {
        text-align: center;
      }

      .title {
        /* Client/h6 */
        font-family: Inter;
        font-size: 18px;
        font-style: normal;
        font-weight: 600;
        line-height: 26px; /* 144.444% */
        letter-spacing: -0.24px;
        color: ${unsafeCSSVarV2('text/primary')};
      }

      .description {
        font-feature-settings:
          'liga' off,
          'clig' off;
        /* Client/xs */
        font-family: Inter;
        font-size: 12px;
        font-style: normal;
        font-weight: 400;
        line-height: 20px; /* 166.667% */
        color: ${unsafeCSSVarV2('text/secondary')};
      }
    }

    .input-container {
      width: 100%;

      .link-input {
        box-sizing: border-box;
        width: 100%;
        display: flex;
        padding: 4px 10px;
        align-items: center;
        gap: 8px;
        align-self: stretch;
        border-radius: 8px;
        border: 1px solid ${unsafeCSSVarV2('layer/insideBorder/border')};
        background: ${unsafeCSSVarV2('input/background')};
      }

      .link-input:focus {
        border-color: var(--affine-blue-700);
        box-shadow: var(--affine-active-shadow);
        outline: none;
      }
      .link-input::placeholder {
        color: var(--affine-placeholder-color);
      }
    }

    .button-container {
      display: flex;
      justify-content: center;
      padding: 20px 0px;
      cursor: pointer;

      .confirm-button {
        width: 100%;
        height: 32px;
        line-height: 32px;
        text-align: center;
        justify-content: center;
        align-items: center;
        border-radius: 8px;
        background: ${unsafeCSSVarV2('button/primary')};
        border: 1px solid ${unsafeCSSVarV2('layer/insideBorder/border')};

        color: ${unsafeCSSVarV2('button/pureWhiteText')};
        /* Client/xsMedium */
        font-family: Inter;
        font-size: 12px;
        font-style: normal;
        font-weight: 500;
      }

      .confirm-button[disabled] {
        opacity: 0.5;
      }
    }
  `;

  private readonly _onClose = () => {
    this.remove();
  };

  private readonly _isInputEmpty = () => {
    return this._linkInputValue.trim() === '';
  };

  private readonly _addBookmark = (url: string) => {
    if (!isValidUrl(url)) {
      // notify user that the url is invalid
      return;
    }

    const blockId = this.std.store.addBlock(
      'affine:bookmark',
      {
        url,
      },
      this.parentModel.id,
      this.index
    );

    return blockId;
  };

  private readonly _onConfirm = async () => {
    if (this._isInputEmpty()) {
      return;
    }

    try {
      const embedIframeService = this.std.get(EmbedIframeService);
      if (!embedIframeService) {
        console.error('iframe EmbedIframeService not found');
        return;
      }

      const url = this.input.value;
      // check if the url can be embedded
      const canEmbed = embedIframeService.canEmbed(url);
      // if can not be embedded, try to add as a bookmark
      if (!canEmbed) {
        console.log('iframe can not be embedded, add as a bookmark', url);
        this._addBookmark(url);
        return;
      }

      // create a new embed iframe block
      const embedIframeBlock = embedIframeService.addEmbedIframeBlock(
        {
          url,
        },
        this.parentModel.id,
        this.index
      );

      return embedIframeBlock;
    } catch (error) {
      console.error('Error in embed iframe creation:', error);
      return;
    } finally {
      this._onClose();
    }
  };

  private readonly _handleInput = (e: InputEvent) => {
    const target = e.target as HTMLInputElement;
    this._linkInputValue = target.value;
  };

  private readonly _handleKeyDown = async (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.isComposing) {
      await this._onConfirm();
    }
  };

  override connectedCallback() {
    super.connectedCallback();

    this.updateComplete
      .then(() => {
        requestAnimationFrame(() => {
          this.input.focus();
        });
      })
      .catch(console.error);
    this.disposables.addFromEvent(this, 'cut', stopPropagation);
    this.disposables.addFromEvent(this, 'copy', stopPropagation);
    this.disposables.addFromEvent(this, 'paste', stopPropagation);
  }

  override render() {
    const { showCloseButton } = this;
    return html`
      <div class="embed-iframe-create-modal">
        <div
          class="embed-iframe-create-modal-mask"
          @click=${this._onClose}
        ></div>
        <div class="modal-main-wrapper">
          ${showCloseButton
            ? html`
                <div class="modal-close-button" @click=${this._onClose}>
                  ${CloseIcon({ width: '20', height: '20' })}
                </div>
              `
            : nothing}
          <div class="modal-content-wrapper">
            <div class="modal-content-header">
              <div class="icon-container">
                <div class="icon-background">
                  ${EmbedIcon({ width: '32px', height: '32px' })}
                </div>
              </div>
              <div>
                <div class="title">Embed Link</div>
                <div class="description">
                  Works with links of PDFs, Google Drive, Google Maps, CodePen…
                </div>
              </div>
            </div>
            <div class="input-container">
              <input
                class="link-input"
                type="text"
                placeholder="Paste in https://…"
                @input=${this._handleInput}
                @keydown=${this._handleKeyDown}
              />
            </div>
          </div>
          <div class="button-container">
            <div
              class="confirm-button"
              @click=${this._onConfirm}
              ?disabled=${this._isInputEmpty()}
            >
              Confirm
            </div>
          </div>
        </div>
      </div>
    `;
  }

  @state()
  private accessor _linkInputValue = '';

  @query('input')
  accessor input!: HTMLInputElement;

  @property({ attribute: false })
  accessor parentModel!: BlockModel;

  @property({ attribute: false })
  accessor index: number | undefined = undefined;

  @property({ attribute: false })
  accessor std!: BlockStdScope;

  @property({ attribute: false })
  accessor onConfirm: () => void = () => {};

  @property({ attribute: false })
  accessor showCloseButton: boolean = true;
}

export async function toggleEmbedIframeCreateModal(
  std: BlockStdScope,
  createOptions: {
    parentModel: BlockModel;
    index?: number;
  }
): Promise<void> {
  std.selection.clear();

  const embedIframeCreateModal = new EmbedIframeCreateModal();
  embedIframeCreateModal.std = std;
  embedIframeCreateModal.parentModel = createOptions.parentModel;
  embedIframeCreateModal.index = createOptions.index;

  document.body.append(embedIframeCreateModal);

  return new Promise(resolve => {
    embedIframeCreateModal.onConfirm = () => resolve();
  });
}
