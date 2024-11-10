import type { AttachmentBlockModel } from '@blocksuite/affine/blocks';
import type { Document, Viewer } from '@toeverything/pdf-viewer';

export async function downloadBlobToBuffer(model: AttachmentBlockModel) {
  const sourceId = model.sourceId;
  if (!sourceId) {
    throw new Error('Attachment not found');
  }

  const blob = await model.doc.blobSync.get(sourceId);
  if (!blob) {
    throw new Error('Attachment not found');
  }

  return await blob.arrayBuffer();
}

export function resizeImageBitmap(
  imageData: ImageData,
  options: {
    resizeWidth: number;
    resizeHeight: number;
  }
) {
  return createImageBitmap(imageData, 0, 0, imageData.width, imageData.height, {
    colorSpaceConversion: 'none',
    resizeQuality: 'pixelated',
    ...options,
  });
}

export function renderToUint8ClampedArray(
  viewer: Viewer,
  doc: Document,
  flags: number,
  index: number,
  width: number,
  height: number
) {
  const page = doc.page(index);

  if (!page) return;

  const bitmap = viewer.createBitmap(width, height, 0);
  bitmap.fill(0, 0, width, height);
  page.render(bitmap, 0, 0, width, height, 0, flags);

  const data = new Uint8ClampedArray(bitmap.toUint8Array());

  bitmap.close();
  page.close();

  return data;
}
