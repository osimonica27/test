import { css } from 'lit';

export const codeBlockStyles = css`

.mermaid-container {
  padding: 12px;
  background: var(--affine-background-primary-color);
  border-radius: 4px;
  overflow-x: auto;
  min-height: 100px;
}
.mermaid-container-none {
}

.mermaid-error {
  color: var(--affine-error-color);
  border: 1px solid var(--affine-error-color);
  padding: 8px;
  border-radius: 4px;
  font-family: var(--affine-font-family);
}

.mermaid-source pre {
  margin: 8px 0;
  padding: 8px;
  background: var(--affine-background-code-block);
  border-radius: 4px;
  font-size: var(--affine-font-sm);
}


  affine-code {
    position: relative;
  }

  .affine-code-block-container {
    font-size: var(--affine-font-xs);
    line-height: var(--affine-line-height);
    position: relative;
    padding: 12px;
    background: var(--affine-background-code-block);
    border-radius: 10px;
    box-sizing: border-box;
  }

  .affine-code-block-container .inline-editor {
    font-family: var(--affine-font-code-family);
    font-variant-ligatures: none;
  }

  .affine-code-block-container v-line {
    position: relative;
    display: inline-grid !important;
    grid-template-columns: auto minmax(0, 1fr);
  }

  .affine-code-block-container div:has(> v-line) {
    display: grid;
  }

  .affine-code-block-container .line-number {
    position: sticky;
    text-align: left;
    padding-right: 4px;
    width: 24px;
    word-break: break-word;
    white-space: nowrap;
    left: -0.5px;
    z-index: 1;
    background: var(--affine-background-code-block);
    font-size: var(--affine-font-xs);
    line-height: var(--affine-line-height);
    color: var(--affine-text-secondary);
    box-sizing: border-box;
    user-select: none;
  }
`;
