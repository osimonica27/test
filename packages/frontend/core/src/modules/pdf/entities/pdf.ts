import type { AttachmentBlockModel } from '@blocksuite/affine/blocks';
import {
  effect,
  Entity,
  LiveData,
  mapInto,
  ObjectPool,
} from '@toeverything/infra';
import { catchError, from, map, of, startWith, switchMap } from 'rxjs';

import type { PDFMeta, RenderPageOpts } from '../renderer';
import { PDFRenderer } from '../renderer';

export enum PDFStatus {
  IDLE = 0,
  Opening,
  Opened,
  Error,
}

export type PDFRendererState =
  | {
      status: PDFStatus.IDLE | PDFStatus.Opening;
    }
  | {
      status: PDFStatus.Opened;
      meta: PDFMeta;
    }
  | {
      status: PDFStatus.Error;
      error: Error;
    };

function resizeImageBitmap(
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

async function downloadBlobToBuffer(model: AttachmentBlockModel) {
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

export class PDF extends Entity<AttachmentBlockModel> {
  public readonly id: string = this.props.id;
  readonly renderer = new PDFRenderer();
  readonly pages = new ObjectPool<string, PDFPage>({
    onDelete: page => page.dispose(),
  });

  readonly state$ = LiveData.from<PDFRendererState>(
    // @ts-expect-error type alias
    from(downloadBlobToBuffer(this.props)).pipe(
      switchMap(buffer => {
        return this.renderer.ob$('open', { data: buffer });
      }),
      map(meta => ({ status: PDFStatus.Opened, meta })),
      // @ts-expect-error type alias
      startWith({ status: PDFStatus.Opening }),
      catchError((error: Error) => of({ status: PDFStatus.Error, error }))
    ),
    { status: PDFStatus.IDLE }
  );

  constructor() {
    super();
    this.renderer.listen();
    this.disposables.push(() => this.pages.clear());
  }

  page(type: string, page: number) {
    const key = `${type}:${page}`;
    let rc = this.pages.get(key);

    if (!rc) {
      rc = this.pages.put(
        key,
        this.framework.createEntity(PDFPage, { pdf: this, page })
      );
    }

    return { page: rc.obj, release: rc.release };
  }

  override dispose() {
    this.renderer.destroy();
    super.dispose();
  }
}

export class PDFPage extends Entity<{ pdf: PDF; page: number }> {
  readonly page: number = this.props.page;
  bitmap$ = new LiveData<ImageBitmap | null>(null);

  render = effect(
    switchMap((opts: Omit<RenderPageOpts, 'pageNum'>) =>
      this.props.pdf.renderer.ob$('render', {
        ...opts,
        pageNum: this.props.page,
      })
    ),
    map(data => data.bitmap),
    mapInto(this.bitmap$)
  );

  constructor() {
    super();
    this.disposables.push(() => this.render.unsubscribe);
  }
}
