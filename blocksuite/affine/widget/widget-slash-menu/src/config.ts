import { addSiblingAttachmentBlocks } from '@blocksuite/affine-block-attachment';
import { insertImagesCommand } from '@blocksuite/affine-block-image';
import { insertLatexBlockCommand } from '@blocksuite/affine-block-latex';
import { getSurfaceBlock } from '@blocksuite/affine-block-surface';
import { insertSurfaceRefBlockCommand } from '@blocksuite/affine-block-surface-ref';
import { insertTableBlockCommand } from '@blocksuite/affine-block-table';
import { toggleEmbedCardCreateModal } from '@blocksuite/affine-components/embed-card-modal';
import { toast } from '@blocksuite/affine-components/toast';
import type {
  FrameBlockModel,
  ParagraphBlockModel,
} from '@blocksuite/affine-model';
import {
  getInlineEditorByModel,
  insertContent,
  insertInlineLatex,
  textConversionConfigs,
  textFormatConfigs,
} from '@blocksuite/affine-rich-text';
import {
  getSelectedModelsCommand,
  getTextSelectionCommand,
} from '@blocksuite/affine-shared/commands';
import { REFERENCE_NODE } from '@blocksuite/affine-shared/consts';
import {
  FileSizeLimitService,
  TelemetryProvider,
} from '@blocksuite/affine-shared/services';
import {
  createDefaultDoc,
  openFileOrFiles,
} from '@blocksuite/affine-shared/utils';
import {
  ArrowDownBigIcon,
  ArrowUpBigIcon,
  CopyIcon,
  DeleteIcon,
  DualLinkIcon,
  ExportToPdfIcon,
  FigmaDuotoneIcon,
  FileIcon,
  FrameIcon,
  GithubDuotoneIcon,
  GroupingIcon,
  HeadingsIcon,
  ImageIcon,
  LinkedPageIcon,
  LinkIcon,
  LoomLogoDuotoneIcon,
  NowIcon,
  PlusIcon,
  TableIcon,
  TeXIcon,
  TodayIcon,
  TomorrowIcon,
  YesterdayIcon,
  YoutubeDuotoneIcon,
} from '@blocksuite/icons/lit';
import type { DeltaInsert } from '@blocksuite/inline';
import { Slice, Text } from '@blocksuite/store';

import { slashMenuToolTips } from './tooltips';
import type { SlashMenuActionItem, SlashMenuConfig } from './types';
import {
  createConversionItem,
  createTextFormatItem,
  formatDate,
  formatTime,
  insideEdgelessText,
  tryRemoveEmptyLine,
} from './utils';

// TODO(@L-Sun): This counter temporarily added variables for refactoring.
let index = 0;

export const defaultSlashMenuConfig: SlashMenuConfig = {
  disableWhen: ({ model }) => {
    return model.flavour === 'affine:code';
  },
  items: [
    // TODO(@L-Sun): move this to rich-text when it has been remove from blocksuite/affine-components
    ...textConversionConfigs
      .filter(i => i.type && ['h1', 'h2', 'h3', 'text'].includes(i.type))
      .map(config => createConversionItem(config, `0_Basic@${index++}`)),
    {
      name: 'Other Headings',
      icon: HeadingsIcon(),
      group: `0_Basic@${index++}`,
      subMenu: textConversionConfigs
        .filter(i => i.type && ['h4', 'h5', 'h6'].includes(i.type))
        .map(config => createConversionItem(config)),
    },
    ...textConversionConfigs
      .filter(i => i.flavour === 'affine:code')
      .map(config => createConversionItem(config, `0_Basic@${index++}`)),

    ...textConversionConfigs
      .filter(i => i.type && ['divider', 'quote'].includes(i.type))
      .map(
        config =>
          ({
            ...createConversionItem(config, `0_Basic@${index++}`),
            when: ({ model }) =>
              model.doc.schema.flavourSchemaMap.has(config.flavour) &&
              !insideEdgelessText(model),
          }) satisfies SlashMenuActionItem
      ),

    {
      name: 'Inline equation',
      group: `0_Basic@${index++}`,
      description: 'Create a equation block.',
      icon: TeXIcon(),
      searchAlias: ['inlineMath, inlineEquation', 'inlineLatex'],
      action: ({ std }) => {
        std.command
          .chain()
          .pipe(getTextSelectionCommand)
          .pipe(insertInlineLatex)
          .run();
      },
    },

    // ---------------------------------------------------------
    // { groupName: 'List' },
    ...textConversionConfigs
      .filter(i => i.flavour === 'affine:list')
      .map(config => createConversionItem(config, `1_List@${index++}`)),

    // ---------------------------------------------------------
    // { groupName: 'Style' },
    ...textFormatConfigs
      .filter(i => !['Code', 'Link'].includes(i.name))
      .map(config => createTextFormatItem(config, `2_Style@${index++}`)),

    {
      name: 'New Doc',
      description: 'Start a new document.',
      icon: PlusIcon(),
      tooltip: slashMenuToolTips['New Doc'],
      group: `3_Page@${index++}`,
      when: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:embed-linked-doc'),
      action: ({ std, model }) => {
        const newDoc = createDefaultDoc(std.host.doc.workspace);
        insertContent(std.host, model, REFERENCE_NODE, {
          reference: {
            type: 'LinkedPage',
            pageId: newDoc.id,
          },
        });
      },
    },
    {
      name: 'Linked Doc',
      description: 'Link to another document.',
      icon: LinkedPageIcon(),
      tooltip: slashMenuToolTips['Linked Doc'],
      searchAlias: ['dual link'],
      group: `3_Page@${index++}`,
      when: ({ std, model }) => {
        const root = model.doc.root;
        if (!root) return false;
        const linkedDocWidget = std.view.getWidget(
          'affine-linked-doc-widget',
          root.id
        );
        if (!linkedDocWidget) return false;

        return model.doc.schema.flavourSchemaMap.has('affine:embed-linked-doc');
      },
      action: ({ model, std }) => {
        const root = model.doc.root;
        if (!root) return;
        const linkedDocWidget = std.view.getWidget(
          'affine-linked-doc-widget',
          root.id
        );
        if (!linkedDocWidget) return;
        // TODO(@L-Sun): make linked-doc-widget as extension
        // @ts-expect-error same as above
        const triggerKey = linkedDocWidget.config.triggerKeys[0];

        insertContent(std.host, model, triggerKey);

        const inlineEditor = getInlineEditorByModel(std.host, model);
        // Wait for range to be updated
        inlineEditor?.slots.inlineRangeSync.once(() => {
          // TODO(@L-Sun): make linked-doc-widget as extension
          // @ts-expect-error same as above
          linkedDocWidget.show({ addTriggerKey: true });
        });
      },
    },

    // ---------------------------------------------------------
    // { groupName: 'Content & Media' },
    {
      name: 'Table',
      description: 'Create a simple table.',
      icon: TableIcon(),
      tooltip: slashMenuToolTips['Table View'],
      group: `4_Content & Media@${index++}`,
      when: ({ model }) => !insideEdgelessText(model),
      action: ({ std }) => {
        std.command
          .chain()
          .pipe(getSelectedModelsCommand)
          .pipe(insertTableBlockCommand, {
            place: 'after',
            removeEmptyLine: true,
          })
          .pipe(({ insertedTableBlockId }) => {
            if (insertedTableBlockId) {
              const telemetry = std.getOptional(TelemetryProvider);
              telemetry?.track('BlockCreated', {
                blockType: 'affine:table',
              });
            }
          })
          .run();
      },
    },
    {
      name: 'Image',
      description: 'Insert an image.',
      icon: ImageIcon(),
      tooltip: slashMenuToolTips['Image'],
      group: `4_Content & Media@${index++}`,
      when: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:image'),
      action: ({ std }) => {
        const [success, ctx] = std.command
          .chain()
          .pipe(getSelectedModelsCommand)
          .pipe(insertImagesCommand, { removeEmptyLine: true })
          .run();

        if (success) ctx.insertedImageIds.catch(console.error);
      },
    },
    {
      name: 'Link',
      description: 'Add a bookmark for reference.',
      icon: LinkIcon(),
      tooltip: slashMenuToolTips['Link'],
      group: `4_Content & Media@${index++}`,
      when: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:bookmark'),
      action: ({ std, model }) => {
        const { host } = std;
        const parentModel = host.doc.getParent(model);
        if (!parentModel) {
          return;
        }
        const index = parentModel.children.indexOf(model) + 1;
        toggleEmbedCardCreateModal(
          host,
          'Links',
          'The added link will be displayed as a card view.',
          { mode: 'page', parentModel, index }
        )
          .then(() => {
            tryRemoveEmptyLine(model);
          })
          .catch(console.error);
      },
    },
    {
      name: 'Attachment',
      description: 'Attach a file to document.',
      icon: FileIcon(),
      tooltip: slashMenuToolTips['Attachment'],
      searchAlias: ['file'],
      group: `4_Content & Media@${index++}`,
      when: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:attachment'),
      action: ({ std, model }) => {
        (async () => {
          const file = await openFileOrFiles();
          if (!file) return;
          const maxFileSize = std.store.get(FileSizeLimitService).maxFileSize;
          await addSiblingAttachmentBlocks(
            std.host,
            [file],
            maxFileSize,
            model
          );
          tryRemoveEmptyLine(model);
        })().catch(console.error);
      },
    },
    {
      name: 'PDF',
      description: 'Upload a PDF to document.',
      icon: ExportToPdfIcon(),
      tooltip: slashMenuToolTips['PDF'],
      group: `4_Content & Media@${index++}`,
      when: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:attachment'),
      action: ({ std, model }) => {
        (async () => {
          const file = await openFileOrFiles();
          if (!file) return;

          const maxFileSize = std.store.get(FileSizeLimitService).maxFileSize;

          await addSiblingAttachmentBlocks(
            std.host,
            [file],
            maxFileSize,
            model,
            'after',
            true
          );
          tryRemoveEmptyLine(model);
        })().catch(console.error);
      },
    },
    {
      name: 'YouTube',
      description: 'Embed a YouTube video.',
      icon: YoutubeDuotoneIcon(),
      tooltip: slashMenuToolTips['YouTube'],
      group: `4_Content & Media@${index++}`,
      when: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:embed-youtube'),
      action: ({ std, model }) => {
        (async () => {
          const { host } = std;
          const parentModel = host.doc.getParent(model);
          if (!parentModel) {
            return;
          }
          const index = parentModel.children.indexOf(model) + 1;
          await toggleEmbedCardCreateModal(
            host,
            'YouTube',
            'The added YouTube video link will be displayed as an embed view.',
            { mode: 'page', parentModel, index }
          );
          tryRemoveEmptyLine(model);
        })().catch(console.error);
      },
    },
    {
      name: 'GitHub',
      description: 'Link to a GitHub repository.',
      icon: GithubDuotoneIcon(),
      tooltip: slashMenuToolTips['Github'],
      group: `4_Content & Media@${index++}`,
      when: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:embed-github'),
      action: ({ std, model }) => {
        (async () => {
          const { host } = std;
          const parentModel = host.doc.getParent(model);
          if (!parentModel) {
            return;
          }
          const index = parentModel.children.indexOf(model) + 1;
          await toggleEmbedCardCreateModal(
            host,
            'GitHub',
            'The added GitHub issue or pull request link will be displayed as a card view.',
            { mode: 'page', parentModel, index }
          );
          tryRemoveEmptyLine(model);
        })().catch(console.error);
      },
    },
    // TODO: X Twitter

    {
      name: 'Figma',
      description: 'Embed a Figma document.',
      icon: FigmaDuotoneIcon(),
      tooltip: slashMenuToolTips['Figma'],
      group: `4_Content & Media@${index++}`,
      when: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:embed-figma'),
      action: ({ std, model }) => {
        (async () => {
          const { host } = std;
          const parentModel = host.doc.getParent(model);
          if (!parentModel) {
            return;
          }
          const index = parentModel.children.indexOf(model) + 1;
          await toggleEmbedCardCreateModal(
            host,
            'Figma',
            'The added Figma link will be displayed as an embed view.',
            { mode: 'page', parentModel, index }
          );
          tryRemoveEmptyLine(model);
        })().catch(console.error);
      },
    },

    {
      name: 'Loom',
      icon: LoomLogoDuotoneIcon(),
      group: `4_Content & Media@${index++}`,
      when: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:embed-loom'),
      action: ({ std, model }) => {
        (async () => {
          const { host } = std;
          const parentModel = host.doc.getParent(model);
          if (!parentModel) {
            return;
          }
          const index = parentModel.children.indexOf(model) + 1;
          await toggleEmbedCardCreateModal(
            host,
            'Loom',
            'The added Loom video link will be displayed as an embed view.',
            { mode: 'page', parentModel, index }
          );
          tryRemoveEmptyLine(model);
        })().catch(console.error);
      },
    },

    {
      name: 'Equation',
      description: 'Create a equation block.',
      icon: TeXIcon(),
      searchAlias: ['mathBlock, equationBlock', 'latexBlock'],
      group: `4_Content & Media@${index++}`,
      action: ({ std }) => {
        std.command
          .chain()
          .pipe(getSelectedModelsCommand)
          .pipe(insertLatexBlockCommand, {
            place: 'after',
            removeEmptyLine: true,
          })
          .run();
      },
    },

    // TODO(@L-Sun): Linear

    // ---------------------------------------------------------
    ({ std, model }) => {
      const { host } = std;

      const surfaceModel = getSurfaceBlock(host.doc);
      if (!surfaceModel) return [];

      const parent = host.doc.getParent(model);
      if (!parent) return [];

      const frameModels = host.doc
        .getBlocksByFlavour('affine:frame')
        .map(block => block.model as FrameBlockModel);

      const frameItems = frameModels.map<SlashMenuActionItem>(frameModel => ({
        name: 'Frame: ' + frameModel.title,
        icon: FrameIcon(),
        group: `5_Document Group & Frame@${index++}`,
        action: ({ std }) => {
          std.command
            .chain()
            .pipe(getSelectedModelsCommand)
            .pipe(insertSurfaceRefBlockCommand, {
              reference: frameModel.id,
              place: 'after',
              removeEmptyLine: true,
            })
            .run();
        },
      }));

      const groupElements = surfaceModel.getElementsByType('group');
      const groupItems = groupElements.map<SlashMenuActionItem>(group => ({
        name: 'Group: ' + group.title.toString(),
        icon: GroupingIcon(),
        group: `5_Document Group & Frame@${index++}`,
        action: ({ std }) => {
          std.command
            .chain()
            .pipe(getSelectedModelsCommand)
            .pipe(insertSurfaceRefBlockCommand, {
              reference: group.id,
              place: 'after',
              removeEmptyLine: true,
            })
            .run();
        },
      }));

      return [...frameItems, ...groupItems];
    },

    // ---------------------------------------------------------
    () => {
      const now = new Date();
      const tomorrow = new Date();
      const yesterday = new Date();

      yesterday.setDate(yesterday.getDate() - 1);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return [
        {
          name: 'Today',
          icon: TodayIcon(),
          tooltip: slashMenuToolTips['Today'],
          description: formatDate(now),
          group: `6_Date@${index++}`,
          action: ({ std, model }) => {
            insertContent(std.host, model, formatDate(now));
          },
        },
        {
          name: 'Tomorrow',
          icon: TomorrowIcon(),
          tooltip: slashMenuToolTips['Tomorrow'],
          description: formatDate(tomorrow),
          group: `6_Date@${index++}`,
          action: ({ std, model }) => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            insertContent(std.host, model, formatDate(tomorrow));
          },
        },
        {
          name: 'Yesterday',
          icon: YesterdayIcon(),
          tooltip: slashMenuToolTips['Yesterday'],
          description: formatDate(yesterday),
          group: `6_Date@${index++}`,
          action: ({ std, model }) => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            insertContent(std.host, model, formatDate(yesterday));
          },
        },
        {
          name: 'Now',
          icon: NowIcon(),
          tooltip: slashMenuToolTips['Now'],
          description: formatTime(now),
          group: `6_Date@${index++}`,
          action: ({ std, model }) => {
            insertContent(std.host, model, formatTime(now));
          },
        },
      ];
    },

    // ---------------------------------------------------------
    // { groupName: 'Actions' },
    {
      name: 'Move Up',
      description: 'Shift this line up.',
      icon: ArrowUpBigIcon(),
      tooltip: slashMenuToolTips['Move Up'],
      group: `8_Actions@${index++}`,
      action: ({ std, model }) => {
        const { host } = std;
        const previousSiblingModel = host.doc.getPrev(model);
        if (!previousSiblingModel) return;

        const parentModel = host.doc.getParent(previousSiblingModel);
        if (!parentModel) return;

        host.doc.moveBlocks([model], parentModel, previousSiblingModel, true);
      },
    },
    {
      name: 'Move Down',
      description: 'Shift this line down.',
      icon: ArrowDownBigIcon(),
      tooltip: slashMenuToolTips['Move Down'],
      group: `8_Actions@${index++}`,
      action: ({ std, model }) => {
        const { host } = std;
        const nextSiblingModel = host.doc.getNext(model);
        if (!nextSiblingModel) return;

        const parentModel = host.doc.getParent(nextSiblingModel);
        if (!parentModel) return;

        host.doc.moveBlocks([model], parentModel, nextSiblingModel, false);
      },
    },
    {
      name: 'Copy',
      description: 'Copy this line to clipboard.',
      icon: CopyIcon(),
      tooltip: slashMenuToolTips['Copy'],
      group: `8_Actions@${index++}`,
      action: ({ std, model }) => {
        const slice = Slice.fromModels(std.store, [model]);

        std.clipboard
          .copy(slice)
          .then(() => {
            toast(std.host, 'Copied to clipboard');
          })
          .catch(e => {
            console.error(e);
          });
      },
    },
    {
      name: 'Duplicate',
      description: 'Create a duplicate of this line.',
      icon: DualLinkIcon(),
      tooltip: slashMenuToolTips['Copy'],
      group: `8_Actions@${index++}`,
      action: ({ std, model }) => {
        if (!model.text || !(model.text instanceof Text)) {
          console.error("Can't duplicate a block without text");
          return;
        }
        const { host } = std;
        const parent = host.doc.getParent(model);
        if (!parent) {
          console.error(
            'Failed to duplicate block! Parent not found: ' +
              model.id +
              '|' +
              model.flavour
          );
          return;
        }
        const index = parent.children.indexOf(model);

        // TODO add clone model util
        host.doc.addBlock(
          model.flavour as never,
          {
            type: (model as ParagraphBlockModel).type,
            text: new Text(model.text.toDelta() as DeltaInsert[]),
            // @ts-expect-error FIXME: ts error
            checked: model.checked,
          },
          host.doc.getParent(model),
          index
        );
      },
    },
    {
      name: 'Delete',
      description: 'Remove this line permanently.',
      searchAlias: ['remove'],
      icon: DeleteIcon(),
      tooltip: slashMenuToolTips['Delete'],
      group: `8_Actions@${index++}`,
      action: ({ std, model }) => {
        std.host.doc.deleteBlock(model);
      },
    },
  ],
};
