import { WithDisposable } from '@blocksuite/affine/global/lit';
import type { EditorHost } from '@blocksuite/affine/std';
import {
  ArrowDownBigIcon as ArrowDownIcon,
  ArrowUpBigIcon as ArrowUpIcon,
  DoneIcon,
  ExplainIcon,
  ImageIcon,
  ImproveWritingIcon,
  LanguageIcon,
  LongerIcon,
  MakeItRealIcon,
  MindmapIcon,
  MindmapNodeIcon,
  PenIcon,
  PresentationIcon,
  SearchIcon,
  SelectionIcon,
  ShorterIcon,
  ToneIcon,
} from '@blocksuite/icons/lit';
import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';

import { createTextRenderer } from '../../components/text-renderer';
import type { ChatAction } from '../chat-context';
import { renderImages } from '../components/images';
import { HISTORY_IMAGE_ACTIONS } from '../const';

const icons: Record<string, TemplateResult<1>> = {
  'Fix spelling for it': DoneIcon(),
  'Improve grammar for it': DoneIcon(),
  'Explain this code': ExplainIcon(),
  'Check code error': SearchIcon(),
  'Explain this': SelectionIcon(),
  Translate: LanguageIcon(),
  'Change tone': ToneIcon(),
  'Improve writing for it': ImproveWritingIcon(),
  'Make it longer': LongerIcon(),
  'Make it shorter': ShorterIcon(),
  'Continue writing': PenIcon(),
  'Make it real': MakeItRealIcon(),
  'Find action items from it': SearchIcon(),
  Summary: PenIcon(),
  'Create headings': PenIcon(),
  'Write outline': PenIcon(),
  image: ImageIcon(),
  'Brainstorm mindmap': MindmapIcon(),
  'Expand mind map': MindmapNodeIcon(),
  'Create a presentation': PresentationIcon(),
  'Write a poem about this': PenIcon(),
  'Write a blog post about this': PenIcon(),
  'AI image filter clay style': ImageIcon(),
  'AI image filter sketch style': ImageIcon(),
  'AI image filter anime style': ImageIcon(),
  'AI image filter pixel style': ImageIcon(),
  Clearer: ImageIcon(),
  'Remove background': ImageIcon(),
  'Convert to sticker': ImageIcon(),
};

export class ActionWrapper extends WithDisposable(LitElement) {
  static override styles = css`
    .action-name {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 22px;
      margin-bottom: 12px;

      svg {
        color: var(--affine-primary-color);
      }

      div:last-child {
        cursor: pointer;
        display: flex;
        align-items: center;
        flex: 1;

        div:last-child svg {
          margin-left: auto;
        }
      }
    }

    .answer-prompt {
      padding: 8px;
      background-color: var(--affine-background-secondary-color);
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 14px;
      font-weight: 400;
      color: var(--affine-text-primary-color);

      .subtitle {
        font-size: 12px;
        font-weight: 500;
        color: var(--affine-text-secondary-color);
        height: 20px;
        line-height: 20px;
      }

      .prompt {
        margin-top: 12px;
      }
    }
  `;

  @state()
  accessor promptShow = false;

  @property({ attribute: false })
  accessor item!: ChatAction;

  @property({ attribute: false })
  accessor host!: EditorHost;

  protected override render() {
    const { item } = this;

    const originalText = item.messages[1].content;
    const answer = item.messages[2]?.content;
    const images = item.messages[1].attachments;

    return html`<style></style>
      <slot></slot>
      <div
        class="action-name"
        @click=${() => (this.promptShow = !this.promptShow)}
      >
        ${icons[item.action] ? icons[item.action] : DoneIcon()}
        <div>
          <div>${item.action}</div>
          <div>${this.promptShow ? ArrowDownIcon() : ArrowUpIcon()}</div>
        </div>
      </div>
      ${this.promptShow
        ? html`
            <div class="answer-prompt">
              <div class="subtitle">Answer</div>
              ${HISTORY_IMAGE_ACTIONS.includes(item.action)
                ? images && renderImages(images)
                : nothing}
              ${answer
                ? createTextRenderer(this.host, { customHeading: true })(answer)
                : nothing}
              ${originalText
                ? html`<div class="subtitle prompt">Prompt</div>
                    ${createTextRenderer(this.host, { customHeading: true })(
                      item.messages[0].content + originalText
                    )}`
                : nothing}
            </div>
          `
        : nothing} `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'action-wrapper': ActionWrapper;
  }
}
