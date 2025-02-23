import type { ExtensionType } from '@blocksuite/store';

import { InlineMarkdownExtension } from '../../extension/markdown-matcher.js';

// inline markdown match rules:
// covert: ***test*** + space
// covert: ***t est*** + space
// not convert: *** test*** + space
// not convert: ***test *** + space
// not convert: *** test *** + space

export const BoldItalicMarkdown = InlineMarkdownExtension({
  name: 'bolditalic',
  pattern: /.*\*{3}([^\s][^\*]*[^\s])\*{3}$/,
  action: ({ inlineEditor, prefixText, inlineRange, pattern, undoManager }) => {
    const match = prefixText.match(pattern);
    if (!match) return;

    const targetText = match[1];
    const annotatedText = match[0].slice(-targetText.length - 3 * 2);
    const startIndex = inlineRange.index - annotatedText.length;

    inlineEditor.insertText(
      {
        index: startIndex + annotatedText.length,
        length: 0,
      },
      ' '
    );
    inlineEditor.setInlineRange({
      index: startIndex + annotatedText.length + 1,
      length: 0,
    });

    undoManager.stopCapturing();

    inlineEditor.formatText(
      {
        index: startIndex,
        length: annotatedText.length,
      },
      {
        bold: true,
        italic: true,
      }
    );

    inlineEditor.deleteText({
      index: startIndex + annotatedText.length,
      length: 1,
    });
    inlineEditor.deleteText({
      index: startIndex + annotatedText.length - 3,
      length: 3,
    });
    inlineEditor.deleteText({
      index: startIndex,
      length: 3,
    });

    inlineEditor.setInlineRange({
      index: startIndex + annotatedText.length - 6,
      length: 0,
    });
  },
});

export const BoldMarkdown = InlineMarkdownExtension({
  name: 'bold',
  pattern: /.*\*{2}([^\s][^\*]*[^\s\*])\*{2}$/,
  action: ({ inlineEditor, prefixText, inlineRange, pattern, undoManager }) => {
    const match = prefixText.match(pattern);
    if (!match) return;

    const targetText = match[1];
    const annotatedText = match[0].slice(-targetText.length - 2 * 2);
    const startIndex = inlineRange.index - annotatedText.length;

    inlineEditor.insertText(
      {
        index: startIndex + annotatedText.length,
        length: 0,
      },
      ' '
    );
    inlineEditor.setInlineRange({
      index: startIndex + annotatedText.length + 1,
      length: 0,
    });

    undoManager.stopCapturing();

    inlineEditor.formatText(
      {
        index: startIndex,
        length: annotatedText.length,
      },
      {
        bold: true,
      }
    );

    inlineEditor.deleteText({
      index: startIndex + annotatedText.length,
      length: 1,
    });
    inlineEditor.deleteText({
      index: startIndex + annotatedText.length - 2,
      length: 2,
    });
    inlineEditor.deleteText({
      index: startIndex,
      length: 2,
    });

    inlineEditor.setInlineRange({
      index: startIndex + annotatedText.length - 4,
      length: 0,
    });
  },
});

export const ItalicExtension = InlineMarkdownExtension({
  name: 'italic',
  pattern: /.*\*{1}([^\s][^\*]*[^\s\*])\*{1}$/,
  action: ({ inlineEditor, prefixText, inlineRange, pattern, undoManager }) => {
    const match = prefixText.match(pattern);
    if (!match) return;

    const targetText = match[1];
    const annotatedText = match[0].slice(-targetText.length - 1 * 2);
    const startIndex = inlineRange.index - annotatedText.length;

    inlineEditor.insertText(
      {
        index: startIndex + annotatedText.length,
        length: 0,
      },
      ' '
    );
    inlineEditor.setInlineRange({
      index: startIndex + annotatedText.length + 1,
      length: 0,
    });

    undoManager.stopCapturing();

    inlineEditor.formatText(
      {
        index: startIndex,
        length: annotatedText.length,
      },
      {
        italic: true,
      }
    );

    inlineEditor.deleteText({
      index: startIndex + annotatedText.length,
      length: 1,
    });
    inlineEditor.deleteText({
      index: startIndex + annotatedText.length - 1,
      length: 1,
    });
    inlineEditor.deleteText({
      index: startIndex,
      length: 1,
    });

    inlineEditor.setInlineRange({
      index: startIndex + annotatedText.length - 2,
      length: 0,
    });
  },
});

export const StrikethroughExtension = InlineMarkdownExtension({
  name: 'strikethrough',
  pattern: /.*\~{2}([^\s][^\~]*[^\s])\~{2}$/,
  action: ({ inlineEditor, prefixText, inlineRange, pattern, undoManager }) => {
    const match = prefixText.match(pattern);
    if (!match) return;

    const targetText = match[1];
    const annotatedText = match[0].slice(-targetText.length - 2 * 2);
    const startIndex = inlineRange.index - annotatedText.length;

    inlineEditor.insertText(
      {
        index: startIndex + annotatedText.length,
        length: 0,
      },
      ' '
    );
    inlineEditor.setInlineRange({
      index: startIndex + annotatedText.length + 1,
      length: 0,
    });

    undoManager.stopCapturing();

    inlineEditor.formatText(
      {
        index: startIndex,
        length: annotatedText.length,
      },
      {
        strike: true,
      }
    );

    inlineEditor.deleteText({
      index: startIndex + annotatedText.length,
      length: 1,
    });
    inlineEditor.deleteText({
      index: startIndex + annotatedText.length - 2,
      length: 2,
    });
    inlineEditor.deleteText({
      index: startIndex,
      length: 2,
    });

    inlineEditor.setInlineRange({
      index: startIndex + annotatedText.length - 4,
      length: 0,
    });
  },
});

export const UnderthroughExtension = InlineMarkdownExtension({
  name: 'underthrough',
  pattern: /.*\~{1}([^\s][^\~]*[^\s\~])\~{1}$/,
  action: ({ inlineEditor, prefixText, inlineRange, pattern, undoManager }) => {
    const match = prefixText.match(pattern);
    if (!match) return;

    const targetText = match[1];
    const annotatedText = match[0].slice(-targetText.length - 1 * 2);
    const startIndex = inlineRange.index - annotatedText.length;

    inlineEditor.insertText(
      {
        index: startIndex + annotatedText.length,
        length: 0,
      },
      ' '
    );
    inlineEditor.setInlineRange({
      index: startIndex + annotatedText.length + 1,
      length: 0,
    });

    undoManager.stopCapturing();

    inlineEditor.formatText(
      {
        index: startIndex,
        length: annotatedText.length,
      },
      {
        underline: true,
      }
    );

    inlineEditor.deleteText({
      index: startIndex + annotatedText.length,
      length: 1,
    });
    inlineEditor.deleteText({
      index: inlineRange.index - 1,
      length: 1,
    });
    inlineEditor.deleteText({
      index: startIndex,
      length: 1,
    });

    inlineEditor.setInlineRange({
      index: startIndex + annotatedText.length - 2,
      length: 0,
    });
  },
});

export const CodeExtension = InlineMarkdownExtension({
  name: 'code',
  pattern: /.*\`([^\s][^\`]*[^\s])\`$/,
  action: ({ inlineEditor, prefixText, inlineRange, pattern, undoManager }) => {
    const match = prefixText.match(pattern);
    if (!match) return;

    const targetText = match[1];
    const annotatedText = match[0].slice(-targetText.length - 1 * 2);
    const startIndex = inlineRange.index - annotatedText.length;

    inlineEditor.insertText(
      {
        index: startIndex + annotatedText.length,
        length: 0,
      },
      ' '
    );
    inlineEditor.setInlineRange({
      index: startIndex + annotatedText.length + 1,
      length: 0,
    });

    undoManager.stopCapturing();

    inlineEditor.formatText(
      {
        index: startIndex,
        length: annotatedText.length,
      },
      {
        code: true,
      }
    );

    inlineEditor.deleteText({
      index: startIndex + annotatedText.length,
      length: 1,
    });
    inlineEditor.deleteText({
      index: startIndex + annotatedText.length - 1,
      length: 1,
    });
    inlineEditor.deleteText({
      index: startIndex,
      length: 1,
    });

    inlineEditor.setInlineRange({
      index: startIndex + annotatedText.length - 2,
      length: 0,
    });
  },
});

export const LinkExtension = InlineMarkdownExtension({
  name: 'link',
  pattern: /.*\[(.+?)\]\((.+?)\)$/,
  action: ({ inlineEditor, prefixText, inlineRange, pattern, undoManager }) => {
    const match = prefixText.match(pattern);
    if (!match) return;

    const linkText = match[1];
    const linkUrl = match[2];
    const annotatedText = match[0].slice(-linkText.length - linkUrl.length - 4);
    const startIndex = inlineRange.index - annotatedText.length;

    inlineEditor.insertText(
      {
        index: inlineRange.index,
        length: 0,
      },
      ' '
    );
    inlineEditor.setInlineRange({
      index: inlineRange.index + 1,
      length: 0,
    });

    undoManager.stopCapturing();

    // aaa[bbb](baidu.com) + space

    // delete (baidu.com) + space
    inlineEditor.deleteText({
      index: startIndex + 1 + linkText.length + 1,
      length: 1 + linkUrl.length + 1 + 1,
    });
    // delete [ and ]
    inlineEditor.deleteText({
      index: startIndex + 1 + linkText.length,
      length: 1,
    });
    inlineEditor.deleteText({
      index: startIndex,
      length: 1,
    });

    inlineEditor.formatText(
      {
        index: startIndex,
        length: linkText.length,
      },
      {
        link: linkUrl,
      }
    );

    inlineEditor.setInlineRange({
      index: startIndex + linkText.length,
      length: 0,
    });
  },
});

export const LatexExtension = InlineMarkdownExtension({
  name: 'latex',

  pattern: /.*\${2}([^\s][^\$]*[^\s])\${2}$/,
  action: ({ inlineEditor, prefixText, inlineRange, pattern, undoManager }) => {
    const match = prefixText.match(pattern);
    if (!match) return;

    const targetText = match[1];
    const annotatedText = match[0].slice(-targetText.length - 2 * 2);
    const startIndex = inlineRange.index - annotatedText.length;

    inlineEditor.insertText(
      {
        index: inlineRange.index,
        length: 0,
      },
      ' '
    );
    inlineEditor.setInlineRange({
      index: inlineRange.index + 1,
      length: 0,
    });

    undoManager.stopCapturing();

    inlineEditor.deleteText({
      index: startIndex,
      length: annotatedText.length,
    });
    inlineEditor.insertText(
      {
        index: startIndex,
        length: 0,
      },
      ' '
    );
    inlineEditor.formatText(
      {
        index: startIndex,
        length: 1,
      },
      {
        latex: String.raw`${targetText}`,
      }
    );

    inlineEditor.setInlineRange({
      index: startIndex + 1,
      length: 0,
    });
  },
});

export const MarkdownExtensions: ExtensionType[] = [
  BoldItalicMarkdown,
  BoldMarkdown,
  ItalicExtension,
  StrikethroughExtension,
  UnderthroughExtension,
  CodeExtension,
  LinkExtension,
  LatexExtension,
];
