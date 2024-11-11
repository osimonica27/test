import type { AttachmentBlockModel } from '@blocksuite/affine/blocks';
import { filesize } from 'filesize';

import { downloadBlob } from '../../utils/resource';

export async function getAttachmentBlob(model: AttachmentBlockModel) {
  const sourceId = model.sourceId;
  if (!sourceId) {
    return null;
  }

  const doc = model.doc;
  let blob = await doc.blobSync.get(sourceId);

  if (blob) {
    blob = new Blob([blob], { type: model.type });
  }

  return blob;
}

export async function download(model: AttachmentBlockModel) {
  const blob = await getAttachmentBlob(model);
  if (!blob) return;

  await downloadBlob(blob, model.name);
}

export function buildAttachmentProps(model: AttachmentBlockModel) {
  const isPDF = model.type.endsWith('pdf');
  const pieces = model.name.split('.');
  const ext = pieces.pop() || '';
  const name = pieces.join('.');
  const size = filesize(model.size);
  return { model, name, ext, size, isPDF };
}

/**
 * Generates a set of sequences.
 *
 * 1. when `start` is `0`, returns `[0, .., 5]`
 * 2. when `end` is `total - 1`, returns `[total - 1, .., total - 5]`
 * 3. when `start > 0` and `end < total - 1`, returns `[18, 17, 19, 16, 20, 15, 21]`
 */
export function genSeq(start: number, end: number, total: number) {
  start = Math.max(start, 0);
  end = Math.min(end, Math.max(total - 1, 0));
  let diff = end - start;

  if (diff < 0) return [];

  if (diff === 0) return [start];

  if (start === 0)
    return Array.from<number>({ length: diff })
      .fill(start)
      .map((n, i) => n + i);

  if (end === total - 1)
    return Array.from<number>({ length: diff })
      .fill(end)
      .map((n, i) => n - i);

  diff = Math.ceil(diff / 2);
  const mid = start + diff;

  return Array.from<[number, number]>({ length: diff })
    .fill([mid, mid])
    .map(([s, e], i) => [s - i, e + i])
    .reduce((a, [s, e]) => {
      s = Math.max(start, s);
      e = Math.min(end, e);
      if (!a.includes(s)) a.push(s);
      if (!a.includes(e)) a.push(e);
      return a;
    }, []);
}

export function calculatePageNum(el: HTMLElement, pageCount: number) {
  const { scrollTop, scrollHeight } = el;
  const pageHeight = scrollHeight / pageCount;
  const n = scrollTop / pageHeight;
  const t = n / pageCount;
  const index = Math.floor(n + t);
  const cursor = Math.min(index, pageCount - 1);
  return cursor;
}
