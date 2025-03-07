import type { SlashMenuTooltip } from '../types';
import { AttachmentTooltip } from './attachment';
import { BoldTextTooltip } from './bold-text';
import { BulletedListTooltip } from './bulleted-list';
import { CodeBlockTooltip } from './code-block';
import { CopyTooltip } from './copy';
import { DeleteTooltip } from './delete';
import { DividerTooltip } from './divider';
import { EdgelessTooltip } from './edgeless';
import { FigmaTooltip } from './figma';
import { GithubRepoTooltip } from './github-repo';
import { Heading1Tooltip } from './heading-1';
import { Heading2Tooltip } from './heading-2';
import { Heading3Tooltip } from './heading-3';
import { Heading4Tooltip } from './heading-4';
import { Heading5Tooltip } from './heading-5';
import { Heading6Tooltip } from './heading-6';
import { ItalicTooltip } from './italic';
import { LinearTooltip } from './linear';
import { LinkTooltip } from './link';
import { LinkDocTooltip } from './link-doc';
import { MoveDownTooltip } from './move-down';
import { MoveUpTooltip } from './move-up';
import { NewDocTooltip } from './new-doc';
import { NowTooltip } from './now';
import { NumberedListTooltip } from './numbered-list';
import { PDFTooltip } from './pdf';
import { PhotoTooltip } from './photo';
import { QuoteTooltip } from './quote';
import { StrikethroughTooltip } from './strikethrough';
import { TextTooltip } from './text';
import { TodayTooltip } from './today';
import { TomorrowTooltip } from './tomorrow';
import { TweetTooltip } from './tweet';
import { UnderlineTooltip } from './underline';
import { YesterdayTooltip } from './yesterday';
import { YoutubeVideoTooltip } from './youtube-video';

export const slashMenuToolTips: Record<string, SlashMenuTooltip> = {
  Text: {
    figure: TextTooltip,
    caption: 'Text',
  },

  'Heading 1': {
    figure: Heading1Tooltip,
    caption: 'Heading #1',
  },

  'Heading 2': {
    figure: Heading2Tooltip,
    caption: 'Heading #2',
  },

  'Heading 3': {
    figure: Heading3Tooltip,
    caption: 'Heading #3',
  },

  'Heading 4': {
    figure: Heading4Tooltip,
    caption: 'Heading #4',
  },

  'Heading 5': {
    figure: Heading5Tooltip,
    caption: 'Heading #5',
  },

  'Heading 6': {
    figure: Heading6Tooltip,
    caption: 'Heading #6',
  },

  'Code Block': {
    figure: CodeBlockTooltip,
    caption: 'Code Block',
  },

  Quote: {
    figure: QuoteTooltip,
    caption: 'Quote',
  },

  Divider: {
    figure: DividerTooltip,
    caption: 'Divider',
  },

  'Bulleted List': {
    figure: BulletedListTooltip,
    caption: 'Bulleted List',
  },

  'Numbered List': {
    figure: NumberedListTooltip,
    caption: 'Numbered List',
  },

  Bold: {
    figure: BoldTextTooltip,
    caption: 'Bold Text',
  },

  Italic: {
    figure: ItalicTooltip,
    caption: 'Italic',
  },

  Underline: {
    figure: UnderlineTooltip,
    caption: 'Underline',
  },

  Strikethrough: {
    figure: StrikethroughTooltip,
    caption: 'Strikethrough',
  },

  'New Doc': {
    figure: NewDocTooltip,
    caption: 'New Doc',
  },

  'Linked Doc': {
    figure: LinkDocTooltip,
    caption: 'Link Doc',
  },

  Link: {
    figure: LinkTooltip,
    caption: 'Link',
  },

  Attachment: {
    figure: AttachmentTooltip,
    caption: 'Attachment',
  },

  PDF: {
    figure: PDFTooltip,
    caption: 'PDF',
  },

  Github: {
    figure: GithubRepoTooltip,
    caption: 'GitHub Repo',
  },

  YouTube: {
    figure: YoutubeVideoTooltip,
    caption: 'YouTube Video',
  },

  Image: {
    figure: PhotoTooltip,
    caption: 'Photo',
  },

  'X (Twitter)': {
    figure: TweetTooltip,
    caption: 'Tweet',
  },

  Figma: {
    figure: FigmaTooltip,
    caption: 'Figma',
  },

  Linear: {
    figure: LinearTooltip,
    caption: 'Linear',
  },

  Today: {
    figure: TodayTooltip,
    caption: 'Today',
  },

  Tomorrow: {
    figure: TomorrowTooltip,
    caption: 'Tomorrow',
  },

  Yesterday: {
    figure: YesterdayTooltip,
    caption: 'Yesterday',
  },

  Now: {
    figure: NowTooltip,
    caption: 'Now',
  },

  'Move Up': {
    figure: MoveUpTooltip,
    caption: 'Move Up',
  },

  'Move Down': {
    figure: MoveDownTooltip,
    caption: 'Move Down',
  },

  Copy: {
    figure: CopyTooltip,
    caption: 'Copy / Duplicate',
  },

  Delete: {
    figure: DeleteTooltip,
    caption: 'Delete',
  },

  'Group & Frame': {
    figure: EdgelessTooltip,
    caption: 'Edgeless',
  },
};
