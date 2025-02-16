import { CaptionedBlockComponent } from '@blocksuite/affine-components/caption';
import {
  focusTextModel,
  type RichText,
} from '@blocksuite/affine-components/rich-text';
import mermaid from 'mermaid';
import type { CodeBlockModel } from '@blocksuite/affine-model';
import { BRACKET_PAIRS, NOTE_SELECTOR } from '@blocksuite/affine-shared/consts';
import {
  DocModeProvider,
  NotificationProvider,
} from '@blocksuite/affine-shared/services';
import { getViewportElement } from '@blocksuite/affine-shared/utils';
import type { BlockComponent } from '@blocksuite/block-std';
import { getInlineRangeProvider } from '@blocksuite/block-std';
import { IS_MAC } from '@blocksuite/global/env';
import { noop } from '@blocksuite/global/utils';
import {
  INLINE_ROOT_ATTR,
  type InlineRangeProvider,
  type InlineRootElement,
  type VLine,
} from '@blocksuite/inline';
import { Slice } from '@blocksuite/store';
import { computed, effect, type Signal, signal } from '@preact/signals-core';
import { html, nothing, type TemplateResult } from 'lit';
import { query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import type { ThemedToken } from 'shiki';

import { CodeClipboardController } from './clipboard/index.js';
import { CodeBlockInlineManagerExtension } from './code-block-inline.js';
import type { CodeBlockService } from './code-block-service.js';
import { codeBlockStyles } from './styles.js';

export class CodeBlockComponent extends CaptionedBlockComponent<
  CodeBlockModel,
  CodeBlockService
> {
  static override styles = codeBlockStyles;

  private _inlineRangeProvider: InlineRangeProvider | null = null;
  private _renderQueue: Promise<void> = Promise.resolve();
  private _isRendering = false;
  private _mermaidContainer: HTMLElement | null = null;
  clipboardController = new CodeClipboardController(this);

  highlightTokens$: Signal<ThemedToken[][]> = signal([]);

  languageName$: Signal<string> = computed(() => {
    const lang = this.model.language$.value;
    if (lang === null) {
      return 'Plain Text';
    }

    const matchedInfo = this.service.langs.find(info => info.id === lang);
    return matchedInfo ? matchedInfo.name : 'Plain Text';
  });

  get inlineEditor() {
    const inlineRoot = this.querySelector<InlineRootElement>(
      `[${INLINE_ROOT_ATTR}]`
    );
    return inlineRoot?.inlineEditor;
  }

  get inlineManager() {
    return this.std.get(CodeBlockInlineManagerExtension.identifier);
  }

  get notificationService() {
    return this.std.getOptional(NotificationProvider);
  }

  get readonly() {
    return this.doc.readonly;
  }

  override get topContenteditableElement() {
    if (this.std.get(DocModeProvider).getEditorMode() === 'edgeless') {
      return this.closest<BlockComponent>(NOTE_SELECTOR);
    }
    return this.rootComponent;
  }

      // 新增渲染方法
private async _renderMermaid() {
 // 加入渲染队列
 this._renderQueue = this._renderQueue
 .then(async () => {
   if (this._isRendering) return;
   this._isRendering = true;
   
   if (!this._mermaidContainer) {
    this._mermaidContainer = this.querySelector('.mermaid-container');
    if (!this._mermaidContainer) return;
  }

  // 生成唯一ID（使用时间戳 + 随机数）
  const chartId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  
  try {
    const code = this.model.text.toString();
    
    // 使用唯一ID渲染
    const { svg } = await mermaid.render(chartId, code); 
    
    // 清理旧内容
    this._mermaidContainer.innerHTML = '';
    
    // 创建独立容器
    const container = document.createElement('div');
    container.className = 'mermaid-chart';
    container.innerHTML = svg;
    
    // 动态主题适配
    const theme = this.service.themeKey === 'dark' ? 'dark' : 'neutral';
    container.querySelector('svg')?.setAttribute('data-theme', theme);
    
    // 追加新内容（非覆盖）
    this._mermaidContainer.appendChild(container);

  } catch (err) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'mermaid-error';
    errorDiv.textContent = `Mermaid Error: ${err}`;
    this._mermaidContainer.replaceChildren(errorDiv);
  }
   
 })
 .finally(() => {
   this._isRendering = false;
 });
}

  private _updateHighlightTokens() {
    const modelLang = this.model.language$.value;
    if(modelLang==="mermaid"){
      this._renderMermaid();
    }

    if (modelLang === null) {
      this.highlightTokens$.value = [];
      return;
    }

    const matchedInfo = this.service.langs.find(
      info =>
        info.id === modelLang ||
        info.name === modelLang ||
        info.aliases?.includes(modelLang)
    );

    if (matchedInfo) {
      this.model.language$.value = matchedInfo.id;
      const langImport = matchedInfo.import;
      const lang = matchedInfo.id;

      const highlighter = this.service.highlighter$.value;
      const theme = this.service.themeKey;
      if (!theme || !highlighter) {
        this.highlightTokens$.value = [];
        return;
      }

      noop(this.model.text.deltas$.value);
      const code = this.model.text.toString();

      const loadedLanguages = highlighter.getLoadedLanguages();
      if (!loadedLanguages.includes(lang)) {
        highlighter
          .loadLanguage(langImport)
          .then(() => {
            this.highlightTokens$.value = highlighter.codeToTokensBase(code, {
              lang,
              theme,
            });
          })
          .catch(console.error);
      } else {
        this.highlightTokens$.value = highlighter.codeToTokensBase(code, {
          lang,
          theme,
        });
      }
    } else {
      this.highlightTokens$.value = [];
      // clear language if not found
      this.model.language$.value = null;
    }
  }

  override connectedCallback() {
    super.connectedCallback();

    // Mermaid 初始化
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: this.service.themeKey === 'dark' ? 'dark' : 'neutral',
    fontFamily: 'var(--affine-font-family)'
  });

  // 主题变化监听
  this.disposables.add(
    effect(() => {
      const theme = this.service.themeKey === 'dark' ? 'dark' : 'neutral';
      mermaid.initialize({ theme });
      this._renderMermaid();
    })
  );

    // set highlight options getter used by "exportToHtml"
    this.clipboardController.hostConnected();

    this.disposables.add(
      effect(() => {
        this._updateHighlightTokens();
      })
    );
    this.disposables.add(
      effect(() => {
        noop(this.highlightTokens$.value);
        this._richTextElement?.inlineEditor?.render();
      })
    );

    const selectionManager = this.host.selection;
    const INDENT_SYMBOL = '  ';
    const LINE_BREAK_SYMBOL = '\n';
    const allIndexOf = (
      text: string,
      symbol: string,
      start = 0,
      end = text.length
    ) => {
      const indexArr: number[] = [];
      let i = start;

      while (i < end) {
        const index = text.indexOf(symbol, i);
        if (index === -1 || index > end) {
          break;
        }
        indexArr.push(index);
        i = index + 1;
      }
      return indexArr;
    };

    // TODO: move to service for better performance
    this.bindHotKey({
      Backspace: ctx => {
        const state = ctx.get('keyboardState');
        const textSelection = selectionManager.find('text');
        if (!textSelection) {
          state.raw.preventDefault();
          return;
        }

        const from = textSelection.from;

        if (from.index === 0 && from.length === 0) {
          state.raw.preventDefault();
          selectionManager.setGroup('note', [
            selectionManager.create('block', { blockId: this.blockId }),
          ]);
          return true;
        }

        const inlineEditor = this.inlineEditor;
        const inlineRange = inlineEditor?.getInlineRange();
        if (!inlineRange || !inlineEditor) return;
        const left = inlineEditor.yText.toString()[inlineRange.index - 1];
        const right = inlineEditor.yText.toString()[inlineRange.index];
        const leftBrackets = BRACKET_PAIRS.map(pair => pair.left);
        if (BRACKET_PAIRS[leftBrackets.indexOf(left)]?.right === right) {
          const index = inlineRange.index - 1;
          inlineEditor.deleteText({
            index: index,
            length: 2,
          });
          inlineEditor.setInlineRange({
            index: index,
            length: 0,
          });
          state.raw.preventDefault();
          return true;
        }

        return;
      },
      Tab: ctx => {
        if (this.doc.readonly) return;
        const state = ctx.get('keyboardState');
        const event = state.raw;
        const inlineEditor = this.inlineEditor;
        if (!inlineEditor) return;
        const inlineRange = inlineEditor.getInlineRange();
        if (inlineRange) {
          event.stopPropagation();
          event.preventDefault();

          const text = this.inlineEditor.yText.toString();
          const index = text.lastIndexOf(
            LINE_BREAK_SYMBOL,
            inlineRange.index - 1
          );
          const indexArr = allIndexOf(
            text,
            LINE_BREAK_SYMBOL,
            inlineRange.index,
            inlineRange.index + inlineRange.length
          )
            .map(i => i + 1)
            .reverse();
          if (index !== -1) {
            indexArr.push(index + 1);
          } else {
            indexArr.push(0);
          }
          indexArr.forEach(i => {
            if (!this.inlineEditor) return;
            this.inlineEditor.insertText(
              {
                index: i,
                length: 0,
              },
              INDENT_SYMBOL
            );
          });
          this.inlineEditor.setInlineRange({
            index: inlineRange.index + 2,
            length:
              inlineRange.length + (indexArr.length - 1) * INDENT_SYMBOL.length,
          });

          return true;
        }

        return;
      },
      'Shift-Tab': ctx => {
        const state = ctx.get('keyboardState');
        const event = state.raw;
        const inlineEditor = this.inlineEditor;
        if (!inlineEditor) return;
        const inlineRange = inlineEditor.getInlineRange();
        if (inlineRange) {
          event.stopPropagation();
          event.preventDefault();

          const text = this.inlineEditor.yText.toString();
          const index = text.lastIndexOf(
            LINE_BREAK_SYMBOL,
            inlineRange.index - 1
          );
          let indexArr = allIndexOf(
            text,
            LINE_BREAK_SYMBOL,
            inlineRange.index,
            inlineRange.index + inlineRange.length
          )
            .map(i => i + 1)
            .reverse();
          if (index !== -1) {
            indexArr.push(index + 1);
          } else {
            indexArr.push(0);
          }
          indexArr = indexArr.filter(
            i => text.slice(i, i + 2) === INDENT_SYMBOL
          );
          indexArr.forEach(i => {
            if (!this.inlineEditor) return;
            this.inlineEditor.deleteText({
              index: i,
              length: 2,
            });
          });
          if (indexArr.length > 0) {
            this.inlineEditor.setInlineRange({
              index:
                inlineRange.index -
                (indexArr[indexArr.length - 1] < inlineRange.index ? 2 : 0),
              length:
                inlineRange.length -
                (indexArr.length - 1) * INDENT_SYMBOL.length,
            });
          }

          return true;
        }

        return;
      },
      'Control-d': () => {
        if (!IS_MAC) return;
        return true;
      },
      Delete: () => {
        return true;
      },
      Enter: () => {
        this.doc.captureSync();
        return true;
      },
      'Mod-Enter': () => {
        const { model, std } = this;
        if (!model || !std) return;
        const inlineEditor = this.inlineEditor;
        const inlineRange = inlineEditor?.getInlineRange();
        if (!inlineRange || !inlineEditor) return;
        const isEnd = model.text.length === inlineRange.index;
        if (!isEnd) return;
        const parent = this.doc.getParent(model);
        if (!parent) return;
        const index = parent.children.indexOf(model);
        if (index === -1) return;
        const id = this.doc.addBlock('affine:paragraph', {}, parent, index + 1);
        focusTextModel(std, id);
        return true;
      },
    });

    this._inlineRangeProvider = getInlineRangeProvider(this);
  }

  copyCode() {
    const model = this.model;
    const slice = Slice.fromModels(model.doc, [model]);
    this.std.clipboard
      .copySlice(slice)
      .then(() => {
        this.notificationService?.toast('Copied to clipboard');
      })
      .catch(e => {
        this.notificationService?.toast('Copied failed, something went wrong');
        console.error(e);
      });
  }

  override disconnectedCallback() {
  // 清理所有Mermaid实例
  this._mermaidContainer?.querySelectorAll('.mermaid-chart').forEach(el => {
    el.remove();
  });
  super.disconnectedCallback();
    super.disconnectedCallback();
    this.clipboardController.hostDisconnected();
  }

  override async getUpdateComplete() {
    const result = await super.getUpdateComplete();
    await this._richTextElement?.updateComplete;
    return result;
  }

  override renderBlock(): TemplateResult<1> {
    const showLineNumbers =
      this.std.getConfig('affine:code')?.showLineNumbers ?? true;
      const isMermaid = this.model.language$.value === 'mermaid';
    return html`
      <div
        class=${classMap({
          'affine-code-block-container': true,
          wrap: this.model.wrap,
          'mermaid-mode': isMermaid // 新增样式标识
        })}
      >
        <div class="${isMermaid?"mermaid-container":"mermaid-container-none"}"></div>
        <rich-text
          .yText=${this.model.text.yText}
          .inlineEventSource=${this.topContenteditableElement ?? nothing}
          .undoManager=${this.doc.history}
          .attributesSchema=${this.inlineManager.getSchema()}
          .attributeRenderer=${this.inlineManager.getRenderer()}
          .readonly=${this.doc.readonly}
          .inlineRangeProvider=${this._inlineRangeProvider}
          .enableClipboard=${false}
          .enableUndoRedo=${false}
          .wrapText=${this.model.wrap}
          .verticalScrollContainerGetter=${() => getViewportElement(this.host)}
          .vLineRenderer=${showLineNumbers
            ? (vLine: VLine) => {
                return html`
                  <span contenteditable="false" class="line-number"
                    >${vLine.index + 1}</span
                  >
                  ${vLine.renderVElements()}
                `;
              }
            : undefined}
        >
        </rich-text>
        ${this.renderChildren(this.model)} ${Object.values(this.widgets)}
      </div>
    `;
  }

  setWrap(wrap: boolean) {
    this.doc.updateBlock(this.model, { wrap });
  }

  @query('rich-text')
  private accessor _richTextElement: RichText | null = null;

  override accessor blockContainerStyles = {
    margin: '18px 0',
  };

  override accessor useCaptionEditor = true;

  override accessor useZeroWidth = true;
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-code': CodeBlockComponent;
  }
}
