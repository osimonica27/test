import type { AttachmentBlockModel } from '@blocksuite/affine/model';

export async function downloadBlobToBuffer(model: AttachmentBlockModel) {
  const sourceId = model.props.sourceId;
  if (!sourceId) {
    throw new Error('Attachment not found');
  }

  const blob = await model.doc.blobSync.get(sourceId);
  if (!blob) {
    throw new Error('Attachment not found');
  }

  return await blob.arrayBuffer();
}
