import {
  AIStarIcon,
  stopPropagation,
  unsafeCSSVarV2,
} from '@blocksuite/affine/blocks';
import { SignalWatcher, WithDisposable } from '@blocksuite/affine/global/utils';
import { SendIcon, SearchIcon } from '@blocksuite/icons/lit';
import { css, html, LitElement, nothing } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import type { DocMeta } from '@blocksuite/affine/store';
import { AIProvider } from '../../../provider';

export class ContextSearch extends SignalWatcher(WithDisposable(LitElement)) {
  static override styles = css`
    :host {
      width: 100%;
      padding: 0 12px;
      box-sizing: border-box;
    }

    .root {
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: var(--affine-background-overlay-panel-color);
    }

    .search-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .search-title {
      font-size: var(--affine-font-sm);
      font-weight: 500;
      color: var(--affine-text-primary-color);
    }

    .search-input-container {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      width: 100%;
    }

    .search-icon {
      display: flex;
      padding: 2px;
      align-items: center;
    }

    .input-container {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      flex: 1 0 0;
      position: relative;
    }

    input {
      flex: 1 0 0;
      border: none;
      outline: none;
      -webkit-box-shadow: none;
      -moz-box-shadow: none;
      box-shadow: none;
      background-color: transparent;
      padding: 4px 0;
      width: 100%;

      color: var(--affine-text-primary-color);
      font-family: var(--affine-font-family);
      font-size: var(--affine-font-sm);
      font-style: normal;
      font-weight: 400;
      line-height: 22px;
    }

    input::placeholder {
      color: var(--affine-placeholder-color);
    }

    .search-results {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 200px;
      overflow-y: auto;
      margin-left: 28px;
    }

    .result-item {
      display: flex;
      padding: 6px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: var(--affine-font-xs);
      color: var(--affine-text-primary-color);
    }

    .result-item:hover {
      background: var(--affine-hover-color);
    }

    .result-title {
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }

    .no-results {
      margin-left: 28px;
      font-size: var(--affine-font-xs);
      color: var(--affine-text-secondary-color);
    }

    .loading {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: 28px;
      font-size: var(--affine-font-xs);
      color: var(--affine-text-secondary-color);
    }

    .loading-spinner {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      border-left-color: var(--affine-primary-color);
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .search-button {
      display: flex;
      align-items: center;
      padding: 2px;
      gap: 4px;
      border-radius: 4px;
      background: ${unsafeCSSVarV2('icon/disable')};
      cursor: pointer;
    }

    .search-button[data-active] {
      background: ${unsafeCSSVarV2('icon/activated')};
    }

    .search-button svg {
      width: 20px;
      height: 20px;
      color: ${unsafeCSSVarV2('button/pureWhiteText')};
    }

    .error {
      margin-left: 28px;
      font-size: var(--affine-font-xs);
      color: var(--affine-error-color);
    }
  `;

  private _searchResults: DocMeta[] = [];
  private _isSearching = false;
  private _searchError: Error | null = null;

  private readonly _onInput = () => {
    const value = this.searchInput.value.trim();
    if (value.length > 0) {
      this._searchButton.dataset.active = '';
    } else {
      delete this._searchButton.dataset.active;
      this._searchResults = [];
      this.requestUpdate();
    }
  };

  private readonly _onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.isComposing) {
      this._performSearch(e);
    }
  };

  private async _performSearch(e: MouseEvent | KeyboardEvent) {
    e.preventDefault();
    e.stopPropagation();

    const query = this.searchInput.value.trim();
    if (query.length === 0) return;

    this._isSearching = true;
    this._searchError = null;
    this.requestUpdate();

    try {
      // Get the current workspace ID
      const workspaceId = this.workspaceId;
      
      if (!workspaceId) {
        throw new Error('No workspace ID available');
      }

      // Use the CopilotClient through the AIProvider to get similar docs
      const client = AIProvider.getCopilotClient();
      
      if (!client) {
        throw new Error('AI provider not available');
      }

      const similarDocs = await client.getSimilarDocsForContext({
        workspaceId,
        sessionId: 'search-session',
        contextId: 'search-context',
        query,
        limit: 5
      });

      // Convert the results to DocMeta format
      this._searchResults = similarDocs.map(doc => ({
        id: doc.docId,
        title: doc.title || 'Untitled',
        updatedDate: new Date()
      }));
    } catch (error) {
      console.error('Error searching for similar docs:', error);
      this._searchError = error instanceof Error ? error : new Error(String(error));
      
      // Fallback to basic search if available
      if (this.docsList) {
        this._searchResults = this.docsList.filter(doc => 
          doc.title.toLowerCase().includes(query.toLowerCase())
        );
      }
    } finally {
      this._isSearching = false;
      this.requestUpdate();
    }
  }

  private _selectDoc(doc: DocMeta) {
    this.onSelectDoc?.(doc);
  }

  override render() {
    return html`
      <div class="root">
        <div class="search-header">
          <div class="search-title">Find relevant documents</div>
        </div>
        <div class="search-input-container">
          <div class="search-icon">${SearchIcon()}</div>
          <div class="input-container">
            <input
              type="text"
              placeholder="Search with AI..."
              @keydown=${this._onKeyDown}
              @input=${this._onInput}
              @pointerdown=${stopPropagation}
              @click=${stopPropagation}
            />
            <div
              class="search-button"
              @click=${this._performSearch}
              @pointerdown=${stopPropagation}
            >
              ${SearchIcon()}
            </div>
          </div>
        </div>
        
        ${this._isSearching
          ? html`
              <div class="loading">
                <div class="loading-spinner"></div>
                <span>Searching...</span>
              </div>
            `
          : nothing}
        
        ${this._searchError
          ? html`<div class="error">Error: ${this._searchError.message}</div>`
          : nothing}
        
        ${!this._isSearching && this._searchResults.length > 0
          ? html`
              <div class="search-results">
                ${this._searchResults.map(
                  doc => html`
                    <div class="result-item" @click=${() => this._selectDoc(doc)}>
                      <div class="result-title">${doc.title}</div>
                    </div>
                  `
                )}
              </div>
            `
          : nothing}
        
        ${!this._isSearching && this.searchInput?.value && this._searchResults.length === 0 && !this._searchError
          ? html`<div class="no-results">No results found</div>`
          : nothing}
      </div>
    `;
  }

  @query('.search-button')
  private accessor _searchButton!: HTMLDivElement;

  @query('input')
  accessor searchInput!: HTMLInputElement;

  @property({ attribute: false })
  accessor docsList: DocMeta[] | null = null;

  @property({ attribute: false })
  accessor workspaceId: string = '';

  @property({ attribute: false })
  accessor onSelectDoc: ((doc: DocMeta) => void) | undefined = undefined;
}

declare global {
  interface HTMLElementTagNameMap {
    'context-search': ContextSearch;
  }
}
