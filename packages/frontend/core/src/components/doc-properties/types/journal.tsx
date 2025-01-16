import { Checkbox, DatePicker, Menu, PropertyValue } from '@affine/component';
import { MobileJournalConflictList } from '@affine/core/mobile/pages/workspace/detail/menu/journal-conflicts';
import { DocService } from '@affine/core/modules/doc';
import { JournalService } from '@affine/core/modules/journal';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { ViewService } from '@affine/core/modules/workbench/services/view';
import { i18nTime, useI18n } from '@affine/i18n';
import {
  useLiveData,
  useService,
  useServiceOptional,
} from '@toeverything/infra';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAsyncCallback } from '../../hooks/affine-async-hooks';
import * as styles from './journal.css';
import { useCheckTemplateJournalConflict } from './template';
import type { PropertyValueProps } from './types';

const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();
export const JournalValue = ({ onChange }: PropertyValueProps) => {
  const t = useI18n();

  const check = useCheckTemplateJournalConflict('journal');
  const journalService = useService(JournalService);
  const doc = useService(DocService).doc;
  const journalDate = useLiveData(journalService.journalDate$(doc.id));
  const checked = !!journalDate;

  const [selectedDate, setSelectedDate] = useState(
    dayjs().format('YYYY-MM-DD')
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const displayDate = useMemo(
    () =>
      i18nTime(selectedDate, {
        absolute: { accuracy: 'day' },
      }),
    [selectedDate]
  );
  const docs = useLiveData(
    useMemo(
      () => journalService.journalsByDate$(selectedDate),
      [journalService, selectedDate]
    )
  );
  const conflict = docs.length > 1;

  useEffect(() => {
    if (journalDate) setSelectedDate(journalDate);
  }, [journalDate]);

  const handleDateSelect = useCallback(
    (day: string) => {
      const date = dayjs(day).format('YYYY-MM-DD');
      setSelectedDate(date);
      journalService.setJournalDate(doc.id, date);
      onChange?.(date, true);
    },
    [journalService, doc.id, onChange]
  );

  const handleCheck = useAsyncCallback(
    async (_: unknown, v: boolean) => {
      if (!(await check(v))) return;
      if (!v) {
        journalService.removeJournalDate(doc.id);
        setShowDatePicker(false);
        onChange?.(null, true);
      } else {
        handleDateSelect(selectedDate);
      }
    },
    [check, journalService, doc.id, handleDateSelect, selectedDate, onChange]
  );

  const workbench = useService(WorkbenchService).workbench;
  const activeView = useLiveData(workbench.activeView$);
  const view = useServiceOptional(ViewService)?.view ?? activeView;

  const handleOpenDuplicate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      workbench.openSidebar();
      view.activeSidebarTab('journal');
    },
    [view, workbench]
  );

  const propertyRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(
    (e: React.MouseEvent) => {
      if (propertyRef.current?.contains(e.target as Node)) {
        handleCheck(null, !checked);
      }
    },
    [checked, handleCheck]
  );

  return (
    <PropertyValue
      ref={propertyRef}
      className={styles.property}
      onClick={toggle}
    >
      <div className={styles.root}>
        <Checkbox className={styles.checkbox} checked={checked} />
        {checked ? (
          <Menu
            contentOptions={{
              onClick: e => e.stopPropagation(),
              sideOffset: 10,
              alignOffset: -30,
              style: { padding: '15px 20px' },
            }}
            rootOptions={{
              modal: true,
              open: showDatePicker,
              onOpenChange: setShowDatePicker,
            }}
            items={
              <DatePicker
                weekDays={t['com.affine.calendar-date-picker.week-days']()}
                monthNames={t['com.affine.calendar-date-picker.month-names']()}
                todayLabel={t['com.affine.calendar-date-picker.today']()}
                value={selectedDate}
                onChange={handleDateSelect}
              />
            }
          >
            <div
              data-testid="date-selector"
              className={styles.date}
              onClick={e => {
                e.stopPropagation();
              }}
            >
              {displayDate}
            </div>
          </Menu>
        ) : null}

        {checked && conflict ? (
          BUILD_CONFIG.isMobileEdition ? (
            <Menu items={<MobileJournalConflictList date={selectedDate} />}>
              <div
                data-testid="conflict-tag"
                className={styles.duplicateTag}
                onClick={stopPropagation}
              >
                {t['com.affine.page-properties.property.journal-duplicated']()}
              </div>
            </Menu>
          ) : (
            <div
              data-testid="conflict-tag"
              className={styles.duplicateTag}
              onClick={handleOpenDuplicate}
            >
              {t['com.affine.page-properties.property.journal-duplicated']()}
            </div>
          )
        ) : null}
      </div>
    </PropertyValue>
  );
};
