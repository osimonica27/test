import type { I18nString } from '@affine/i18n';

import type { DocIntegrationRef } from '../db/schema/schema';

export type IntegrationType = NonNullable<DocIntegrationRef['type']>;

export type IntegrationDocPropertiesMap = {
  readwise: ReadwiseDocProperties;
  zotero: never;
};

export type IntegrationProperty<T extends IntegrationType> = {
  key: keyof IntegrationDocPropertiesMap[T];
  label?: I18nString;
  type: 'link' | 'text' | 'date' | 'source';
};

// ===============================
// Readwise
// ===============================
export interface ReadwiseResponse {
  count: number;
  nextPageCursor: number | null;
  results: ReadwiseBook[];
}
export interface ReadwiseCrawlingData {
  highlights: ReadwiseHighlight[];
  books: ReadwiseBookMap;
  complete: boolean;
  startTime?: string;
}
export interface ReadwiseBook {
  user_book_id: string | number;
  is_deleted: boolean;
  title: string;
  author: string;
  highlights: ReadwiseHighlight[];
}
export interface ReadwiseHighlight {
  id: string;
  is_deleted: boolean;
  text: string;
  location: number;
  location_type: 'page' | 'order' | 'time_offset';
  note: string | null;
  color: string;
  highlighted_at: string;
  created_at: string;
  updated_at: string;
  external_id: string;
  end_location: number | null;
  url: null;
  book_id: string | number;
  tags: string[];
  is_favorite: boolean;
  is_discard: boolean;
  readwise_url: string;
}
export type ReadwiseDocProperties = Omit<ReadwiseBook, 'highlights'> &
  ReadwiseHighlight;

export type ReadwiseBookMap = Record<
  ReadwiseBook['user_book_id'],
  Omit<ReadwiseBook, 'highlights'>
>;
export interface ReadwiseRefMeta {
  highlightId: string;
  updatedAt: string;
}
export interface ReadwiseConfig {
  /**
   * User token
   */
  token?: string;
  /**
   * The last import time
   */
  lastImportedAt?: string;
  /**
   * The update strategy
   */
  updateStrategy?: 'override' | 'append';
}
// ===============================
// Zotero
// ===============================
// TODO
