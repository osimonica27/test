import type { DocCustomPropertyInfo } from '@toeverything/infra';

export interface PropertyValueProps {
  propertyInfo?: DocCustomPropertyInfo;
  value: any;
  onChange: (value: any, skipCommit?: boolean) => void; // if skipCommit is true, the change will be handled in the component itself
}

export type PageLayoutMode = 'standard' | 'fullWidth';
