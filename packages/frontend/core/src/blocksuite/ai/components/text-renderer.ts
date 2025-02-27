import { createReactComponentFromLit } from '@affine/component';
import {
  BlockStdScope,
  BlockViewIdentifier,
  type EditorHost,
  ShadowlessElement,
} from '@blocksuite/affine/block-std';
import {
  CodeBlockComponent,
  codeBlockWrapMiddleware,
  defaultBlockMarkdownAdapterMatchers,
  defaultImageProxyMiddleware,
  DividerBlockComponent,
  InlineDeltaToMarkdownAdapterExtensions,
  ListBlockComponent,
  MarkdownAdapter,
  MarkdownInlineToDeltaAdapterExtensions,
  PageEditorBlockSpecs,
  ParagraphBlockComponent,
} from '@blocksuite/affine/blocks';
import { Container, type ServiceProvider } from '@blocksuite/affine/global/di';
import { WithDisposable } from '@blocksuite/affine/global/utils';
import type {
  BlockSnapshot,
  ExtensionType,
  Query,
  Schema,
  Store,
  Transformer,
  TransformerMiddleware,
} from '@blocksuite/affine/store';
import { css, html, nothing, type PropertyValues } from 'lit';
import { property, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { guard } from 'lit/directives/guard.js';
import { keyed } from 'lit/directives/keyed.js';
import { literal } from 'lit/static-html.js';
import React from 'react';

import { createTransformer } from '../../utils';
import type {
  AffineAIPanelState,
  AffineAIPanelWidgetConfig,
} from '../widgets/ai-panel/type';

const textBlockStyles = css`
  ${ParagraphBlockComponent.styles}
  ${ListBlockComponent.styles}
  ${DividerBlockComponent.styles}
  ${CodeBlockComponent.styles}
`;

const customHeadingStyles = css`
  .custom-heading {
    .h1 {
      font-size: calc(var(--affine-font-h-1) - 2px);
      code {
        font-size: calc(var(--affine-font-base) + 6px);
      }
    }
    .h2 {
      font-size: calc(var(--affine-font-h-2) - 2px);
      code {
        font-size: calc(var(--affine-font-base) + 4px);
      }
    }
    .h3 {
      font-size: calc(var(--affine-font-h-3) - 2px);
      code {
        font-size: calc(var(--affine-font-base) + 2px);
      }
    }
    .h4 {
      font-size: calc(var(--affine-font-h-4) - 2px);
      code {
        font-size: var(--affine-font-base);
      }
    }
    .h5 {
      font-size: calc(var(--affine-font-h-5) - 2px);
      code {
        font-size: calc(var(--affine-font-base) - 2px);
      }
    }
    .h6 {
      font-size: calc(var(--affine-font-h-6) - 2px);
      code {
        font-size: calc(var(--affine-font-base) - 4px);
      }
    }
  }
`;

export type TextRendererOptions = {
  maxHeight?: number;
  customHeading?: boolean;
  extensions?: ExtensionType[];
  additionalMiddlewares?: TransformerMiddleware[];
};

export const CustomPageEditorBlockSpecs: ExtensionType[] = [
  ...PageEditorBlockSpecs,
  {
    setup: di => {
      di.override(
        BlockViewIdentifier('affine:page'),
        () => literal`affine-page-root`
      );
    },
  },
];

// todo: refactor it for more general purpose usage instead of AI only?
export class TextRenderer extends WithDisposable(ShadowlessElement) {
  static override styles = css`
    .ai-answer-text-editor.affine-page-viewport {
      background: transparent;
      font-family: var(--affine-font-family);
      margin-top: 0;
      margin-bottom: 0;
    }

    .ai-answer-text-editor .affine-page-root-block-container {
      padding: 0;
      margin: 0;
      line-height: var(--affine-line-height);
      color: var(--affine-text-primary-color);
      font-weight: 400;
    }

    .affine-paragraph-block-container {
      line-height: 22px;
    }

    .ai-answer-text-editor {
      .affine-note-block-container {
        > .affine-block-children-container {
          > :first-child,
          > :first-child * {
            margin-top: 0 !important;
          }
          > :last-child,
          > :last-child * {
            margin-bottom: 0 !important;
          }
        }
      }
    }

    .text-renderer-container {
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0;
      overscroll-behavior-y: none;
    }
    .text-renderer-container.show-scrollbar::-webkit-scrollbar {
      width: 5px;
      height: 100px;
    }
    .text-renderer-container.show-scrollbar::-webkit-scrollbar-thumb {
      border-radius: 20px;
    }
    .text-renderer-container.show-scrollbar:hover::-webkit-scrollbar-thumb {
      background-color: var(--affine-black-30);
    }
    .text-renderer-container.show-scrollbar::-webkit-scrollbar-corner {
      display: none;
    }

    .text-renderer-container {
      rich-text .nowrap-lines v-text span,
      rich-text .nowrap-lines v-element span {
        white-space: pre;
      }
      editor-host:focus-visible {
        outline: none;
      }
      editor-host * {
        box-sizing: border-box;
      }
      editor-host {
        isolation: isolate;
      }
    }

    ${textBlockStyles}
    ${customHeadingStyles}
  `;

  private _answers: string[] = [];

  private readonly _clearTimer = () => {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  };

  private _doc: Store | undefined | null = null;

  private _std: BlockStdScope | null = null;

  private readonly _query: Query = {
    mode: 'strict',
    match: [
      'affine:page',
      'affine:note',
      'affine:table',
      'affine:surface',
      'affine:paragraph',
      'affine:code',
      'affine:list',
      'affine:divider',
    ].map(flavour => ({ flavour, viewType: 'display' })),
  };

  private _timer?: ReturnType<typeof setInterval> | null = null;

  private _transformer: Transformer | null = null;

  private _adapter: MarkdownAdapter | null = null;

  private _rootBlocks: BlockSnapshot[] = [];

  private _host: EditorHost | null = null;

  private get transformer() {
    if (!this._transformer) {
      this._transformer = this._createTransformer();
    }
    return this._transformer;
  }

  private get adapter() {
    if (!this._adapter) {
      this._adapter = this._createMarkdownAdapter();
    }
    return this._adapter;
  }

  private _createTransformer() {
    const schema = this.schema ?? this.host?.std.store.workspace.schema;
    if (!schema) {
      return null;
    }
    const middlewares = [
      defaultImageProxyMiddleware,
      codeBlockWrapMiddleware(true),
      ...(this.options.additionalMiddlewares ?? []),
    ];
    const transformer = createTransformer(schema, middlewares);
    return transformer;
  }

  private _createMarkdownAdapter() {
    if (!this.transformer) {
      return null;
    }
    let provider: ServiceProvider;
    if (this.host) {
      provider = this.host.std.provider;
    } else {
      const container = new Container();
      [
        ...MarkdownInlineToDeltaAdapterExtensions,
        ...defaultBlockMarkdownAdapterMatchers,
        ...InlineDeltaToMarkdownAdapterExtensions,
      ].forEach(ext => {
        ext.setup(container);
      });

      provider = container.provider();
    }
    const adapter = new MarkdownAdapter(this.transformer, provider);
    return adapter;
  }

  private readonly _initDoc = async () => {
    if (!this.transformer || !this.adapter) {
      return;
    }
    this._doc = await this.adapter.toDoc({
      file: '',
      assets: this.transformer.assetsManager,
    });
    if (this._doc) {
      this._doc.readonly = true;
      this._std = new BlockStdScope({
        store: this._doc,
        extensions: this.options.extensions ?? CustomPageEditorBlockSpecs,
      });
      this._host = this._std.render();
    }

    // TODO
    // const doc = this._doc.doc.getStore({
    //   query: this._query,
    // });
    // this.disposables.add(() => {
    //   this._doc?.doc.clearQuery(this._query);
    // });
  };

  private readonly _updateDoc = () => {
    const latestAnswer = this._answers.pop();
    this._answers = [];
    if (!latestAnswer) {
      return;
    }
    if (!this.transformer || !this.adapter) {
      return;
    }
    if (this.state !== 'generating') {
      this._clearTimer();
    }
    this.adapter
      .toSliceSnapshot({
        file: latestAnswer,
        assets: this.transformer.assetsManager,
        workspaceId: '',
        pageId: '',
      })
      .then(slice => {
        const content = slice?.content;
        const blocks = content?.[0]?.children || [];
        const doc = this._doc;
        if (doc && blocks.length >= this._rootBlocks.length) {
          doc.readonly = false;
          const lastBlockId = this._rootBlocks.at(-1)?.id;
          const lastBlock = lastBlockId && doc.getBlock(lastBlockId);
          if (lastBlock) {
            doc.deleteBlock(lastBlock.model);
          }
          const newBlocks =
            this._rootBlocks.length > 0
              ? blocks.slice(this._rootBlocks.length - 1)
              : blocks;
          const parent = doc.getBlocksByFlavour('affine:note').at(-1);
          const processBlocks = async () => {
            for (const block of newBlocks) {
              await this.transformer?.snapshotToBlock(block, doc, parent?.id);
            }
            this.requestUpdate();
          };
          this._rootBlocks = blocks;
          processBlocks()
            .then(() => {
              doc.readonly = true;
            })
            .catch(console.error);
        }
      })
      .catch(console.error);
  };

  override connectedCallback() {
    super.connectedCallback();
    this._answers.push(this.answer);
    this._initDoc()
      .then(() => {
        this._updateDoc();
        if (this.state === 'generating') {
          this._timer = setInterval(this._updateDoc, 600);
        }
      })
      .catch(console.error);
  }

  private disposeDoc() {
    this._doc?.dispose();
    this._doc?.workspace.dispose();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._clearTimer();
    this.disposeDoc();
  }

  override render() {
    if (!this._doc) {
      return nothing;
    }
    const std = this._std;
    if (!std) {
      return nothing;
    }

    const { maxHeight, customHeading } = this.options;
    const classes = classMap({
      'text-renderer-container': true,
      'show-scrollbar': !!maxHeight,
      'custom-heading': !!customHeading,
    });
    return html`
      <style>
        .text-renderer-container {
          max-height: ${maxHeight ? Math.max(maxHeight, 200) + 'px' : ''};
        }
      </style>
      <div class=${classes}>
        <div class="ai-answer-text-editor affine-page-viewport">
          ${guard([std], () => std.render())}
        </div>
      </div>
    `;
  }

  override shouldUpdate(changedProperties: PropertyValues) {
    if (changedProperties.has('answer')) {
      this._answers.push(this.answer);
      return false;
    }

    return true;
  }

  override updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    requestAnimationFrame(() => {
      if (!this._container) return;
      this._container.scrollTop = this._container.scrollHeight;
    });
  }

  @query('.text-renderer-container')
  private accessor _container!: HTMLDivElement;

  @property({ attribute: false })
  accessor answer!: string;

  @property({ attribute: false })
  accessor host: EditorHost | null = null;

  @property({ attribute: false })
  accessor schema: Schema | null = null;

  @property({ attribute: false })
  accessor options!: TextRendererOptions;

  @property({ attribute: false })
  accessor state: AffineAIPanelState | undefined = undefined;
}

export const createTextRenderer: (
  host: EditorHost,
  options: TextRendererOptions
) => AffineAIPanelWidgetConfig['answerRenderer'] = (host, options) => {
  return (answer, state) => {
    return html`<text-renderer
      .host=${host}
      .answer=${answer}
      .state=${state}
      .options=${options}
    ></text-renderer>`;
  };
};

export const LitTextRenderer = createReactComponentFromLit({
  react: React,
  elementClass: TextRenderer,
});

declare global {
  interface HTMLElementTagNameMap {
    'text-renderer': TextRenderer;
  }
}
