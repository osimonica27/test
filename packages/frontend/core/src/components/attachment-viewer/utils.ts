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

export function renderItem(
  scroller: HTMLElement | null,
  className: string,
  id: number,
  imageData: ImageData
) {
  if (!scroller) return;

  const item = scroller.querySelector(
    `[data-index="${id}"] > div.${className}`
  );
  if (!item) return;
  if (item.firstElementChild) return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = imageData.width;
  canvas.height = imageData.height;
  canvas.style.width = '100%';
  canvas.style.height = '100%';

  ctx.putImageData(imageData, 0, 0);

  item.append(canvas);
}

export function buildAttachmentProps(model: AttachmentBlockModel) {
  const isPDF = model.type.endsWith('pdf');
  const pieces = model.name.split('.');
  const ext = pieces.pop() || '';
  const name = pieces.join('.');
  const size = filesize(model.size);
  return { model, name, ext, size, isPDF };
}
