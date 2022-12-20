import { createContext, MutableRefObject, RefObject, useContext } from 'react';
import type { Workspace } from '@pathfinder/data-services';
import { AccessTokenMessage } from '@pathfinder/data-services';
import type {
  Page as StorePage,
  PageMeta,
  Workspace as StoreWorkspace,
} from '@blocksuite/store';
import type { EditorContainer } from '@blocksuite/editor';
import { QueryContent } from '@blocksuite/store/dist/workspace/search';

export type LoadWorkspaceHandler = (
  workspaceId: string
) => Promise<StoreWorkspace | null> | null;

export type CreateEditorHandler = (page: StorePage) => EditorContainer | null;

export interface AppStateValue {
  user: AccessTokenMessage | null;
  workspacesMeta: Workspace[];

  currentWorkspaceId: string;
  currentWorkspace: StoreWorkspace | null;

  currentPage: StorePage | null;

  editor: EditorContainer | null;
}

export interface AppStateContext extends AppStateValue {
  setState: (state: AppStateValue) => void;
  createEditor?: MutableRefObject<
    ((page: StorePage) => EditorContainer | null) | undefined
  >;
  setEditor?: MutableRefObject<((page: EditorContainer) => void) | undefined>;
  loadWorkspace?: MutableRefObject<
    ((workspaceId: string) => Promise<StoreWorkspace | null> | null) | undefined
  >;
  loadPage?: MutableRefObject<
    ((pageId: string) => Promise<StorePage | null> | null) | undefined
  >;
  createPage?: MutableRefObject<
    ((pageId?: string) => Promise<string | null>) | undefined
  >;
  getPageMeta: (pageId: string) => PageMeta | null;
  toggleFavoritePage: (pageId: string) => void;
  toggleDeletePage: (pageId: string) => void;
  search: (query: QueryContent) => Map<string, string | undefined>;
}

export const AppState = createContext<AppStateContext>({
  user: null,
  workspacesMeta: [],

  currentWorkspaceId: '',
  currentWorkspace: null,

  currentPage: null,

  editor: null,

  setState: () => {},
  createEditor: undefined,
  setEditor: undefined,
  loadWorkspace: undefined,
  loadPage: undefined,
  createPage: undefined,
  getPageMeta: () => null,
  toggleFavoritePage: () => {},
  toggleDeletePage: () => {},
  search: () => new Map<string, string>(),
});

export const useAppState = () => {
  return useContext(AppState);
};
