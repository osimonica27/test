import { effect, Entity, LiveData, mapInto } from '@toeverything/infra';
import { map, switchMap } from 'rxjs';

import type { RenderPageOpts } from '../renderer';
import type { PDF } from './pdf';

export class PDFPage extends Entity<{ pdf: PDF; pageNum: number }> {
  readonly pageNum: number = this.props.pageNum;
  bitmap$ = new LiveData<ImageBitmap | null>(null);

  render = effect(
    switchMap((opts: Omit<RenderPageOpts, 'pageNum'>) =>
      this.props.pdf.renderer.ob$('render', {
        ...opts,
        pageNum: this.pageNum,
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
