import { Text } from '@blocksuite/affine/store';
import type { DocProps, DocsService } from '@toeverything/infra';
import { initDocFromProps, LiveData, Service } from '@toeverything/infra';
import dayjs from 'dayjs';

import type { EditorSettingService } from '../../editor-setting';
import type { JournalStore } from '../store/journal';

export type MaybeDate = Date | string | number;

export const JOURNAL_DATE_FORMAT = 'YYYY-MM-DD';

export class JournalService extends Service {
  constructor(
    private readonly store: JournalStore,
    private readonly docsService: DocsService,
    private readonly editorSettingService: EditorSettingService
  ) {
    super();
  }

  allJournalDates$ = this.store.allJournalDates$;

  journalDate$(docId: string) {
    return LiveData.from(this.store.watchDocJournalDate(docId), undefined);
  }
  journalToday$(docId: string) {
    return LiveData.computed(get => {
      const date = get(this.journalDate$(docId));
      if (!date) return false;
      return dayjs(date).isSame(dayjs(), 'day');
    });
  }

  getJournalDate(docId: string) {
    return this.store.getDocJournalDate(docId);
  }

  setJournalDate(docId: string, date: string) {
    this.store.setDocJournalDate(docId, date);
  }

  removeJournalDate(docId: string) {
    this.store.removeDocJournalDate(docId);
  }

  getJournalsByDate(date: string) {
    return this.store.getDocsByJournalDate(date);
  }

  journalsByDate$(date: string) {
    return this.store.docsByJournalDate$(date);
  }

  private createJournal(maybeDate: MaybeDate) {
    const day = dayjs(maybeDate);
    const title = day.format(JOURNAL_DATE_FORMAT);
    const docRecord = this.docsService.createDoc();
    const { doc, release } = this.docsService.open(docRecord.id);
    this.docsService.list.setPrimaryMode(docRecord.id, 'page');
    // set created date to match the journal date
    docRecord.setMeta({
      createDate: dayjs()
        .set('year', day.year())
        .set('month', day.month())
        .set('date', day.date())
        .toDate()
        .getTime(),
    });
    const docProps: DocProps = {
      page: { title: new Text(title) },
      note: this.editorSettingService.editorSetting.get('affine:note'),
    };
    initDocFromProps(doc.blockSuiteDoc, docProps);
    release();
    this.setJournalDate(docRecord.id, title);
    return docRecord;
  }

  ensureJournalByDate(maybeDate: MaybeDate) {
    const day = dayjs(maybeDate);
    const title = day.format(JOURNAL_DATE_FORMAT);
    const docs = this.getJournalsByDate(title);
    if (docs.length) return docs[0];
    return this.createJournal(maybeDate);
  }
}
