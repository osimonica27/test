import {
  BlockStdScope,
  EditorHost,
  ShadowlessElement,
} from '@blocksuite/block-std';
import { PageEditorBlockSpecs, ThemeProvider } from '@blocksuite/blocks';
import { noop, SignalWatcher, WithDisposable } from '@blocksuite/global/utils';
import type { Store } from '@blocksuite/store';
import { css, html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { guard } from 'lit/directives/guard.js';

noop(EditorHost);

export class PageEditor extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  static override styles = css`
    page-editor {
      font-family: var(--affine-font-family);
      background: var(--affine-background-primary-color);
    }

    page-editor * {
      box-sizing: border-box;
    }

    @media print {
      page-editor {
        height: auto;
      }
    }

    .affine-page-viewport {
      position: relative;
      height: 100%;
      overflow-x: hidden;
      overflow-y: auto;
      container-name: viewport;
      container-type: inline-size;
    }

    .page-editor-container {
      display: block;
      height: 100%;
    }
  `;

  get host() {
    try {
      return this.std.host;
    } catch {
      return null;
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    this._disposables.add(
      this.doc.slots.rootAdded.on(() => this.requestUpdate())
    );
    this.std = new BlockStdScope({
      store: this.doc,
      extensions: this.specs,
    });
  }

  override async getUpdateComplete(): Promise<boolean> {
    const result = await super.getUpdateComplete();
    await this.host?.updateComplete;
    return result;
  }

  override render() {
    if (!this.doc.root) return nothing;

    const std = this.std;
    const theme = std.get(ThemeProvider).app$.value;
    return html`
      <div
        data-theme=${theme}
        class=${this.hasViewport
          ? 'affine-page-viewport'
          : 'page-editor-container'}
      >
        ${guard([std], () => std.render())}
      </div>
    `;
  }

  override willUpdate(
    changedProperties: Map<string | number | symbol, unknown>
  ) {
    super.willUpdate(changedProperties);
    if (changedProperties.has('doc')) {
      this.std = new BlockStdScope({
        store: this.doc,
        extensions: this.specs,
      });
    }
  }

  @property({ attribute: false })
  accessor doc!: Store;

  @property({ type: Boolean })
  accessor hasViewport = true;

  @property({ attribute: false })
  accessor specs = PageEditorBlockSpecs;

  @state()
  accessor std!: BlockStdScope;
}

declare global {
  interface HTMLElementTagNameMap {
    'page-editor': PageEditor;
  }
}
