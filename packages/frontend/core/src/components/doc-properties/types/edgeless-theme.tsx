import { PropertyValue, RadioGroup, type RadioItem } from '@affine/component';
import { useI18n } from '@affine/i18n';
import { DocService, useLiveData, useService } from '@toeverything/infra';
import { useCallback, useMemo } from 'react';

import * as styles from './edgeless-theme.css';

const getThemeOptions = (t: ReturnType<typeof useI18n>) =>
  [
    {
      value: 'system',
      label: t['com.affine.themeSettings.auto'](),
    },
    {
      value: 'light',
      label: t['com.affine.themeSettings.light'](),
    },
    {
      value: 'dark',
      label: t['com.affine.themeSettings.dark'](),
    },
  ] satisfies RadioItem[];

export const EdgelessThemeValue = () => {
  const t = useI18n();
  const doc = useService(DocService).doc;
  const edgelessTheme = useLiveData(doc.properties$).edgelessColorTheme;

  const handleChange = useCallback(
    (theme: string) => {
      doc.record.setProperty('edgelessColorTheme', theme);
    },
    [doc]
  );
  const themeItems = useMemo<RadioItem[]>(() => getThemeOptions(t), [t]);

  return (
    <PropertyValue className={styles.container} hoverable={false}>
      <RadioGroup
        width={194}
        itemHeight={24}
        value={edgelessTheme || 'system'}
        onChange={handleChange}
        items={themeItems}
      />
    </PropertyValue>
  );
};
