import type { Document, Viewer } from '@toeverything/pdf-viewer';

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

export function renderToImageData(
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

  return new ImageData(data, width, height);
}
