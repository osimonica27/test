import { config } from '@affine/env';
import { useTranslation } from '@affine/i18n';
import { WorkspaceFlavour } from '@affine/workspace/type';
import {
  DeleteTemporarilyIcon,
  FolderIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  ShareIcon,
} from '@blocksuite/icons';
import type { Page, PageMeta } from '@blocksuite/store';
import { clsx } from 'clsx';
import type React from 'react';
import type { UIEvent } from 'react';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { usePageMeta } from '../../../hooks/use-page-meta';
import {
  useSidebarFloating,
  useSidebarResizing,
  useSidebarStatus,
  useSidebarWidth,
} from '../../../hooks/use-sidebar-status';
import type { AllWorkspace } from '../../../shared';
import { ChangeLog } from './changeLog';
import Favorite from './favorite';
import { Pinboard } from './Pinboard';
import { RouteNavigation } from './RouteNavigation';
import { StyledListItem } from './shared-styles';
import {
  StyledLink,
  StyledNewPageButton,
  StyledScrollWrapper,
  StyledSidebarHeader,
  StyledSliderBar,
  StyledSliderBarInnerWrapper,
  StyledSliderBarWrapper,
  StyledSliderModalBackground,
} from './style';
import {
  floatingStyle,
  hideStyle,
  macOSStyle,
  nonFloatingStyle,
  resizingStyle,
  showStyle,
} from './style.css';
import { WorkspaceSelector } from './WorkspaceSelector';

const SidebarSwitch = lazy(() =>
  import('../../affine/sidebar-switch').then(module => ({
    default: module.SidebarSwitch,
  }))
);

export type FavoriteListProps = {
  currentPageId: string | null;
  openPage: (pageId: string) => void;
  showList: boolean;
  pageMeta: PageMeta[];
};

export type WorkSpaceSliderBarProps = {
  onOpenQuickSearchModal: () => void;
  onOpenWorkspaceListModal: () => void;
  currentWorkspace: AllWorkspace | null;
  currentPageId: string | null;
  openPage: (pageId: string) => void;
  createPage: () => Page;
  currentPath: string;
  paths: {
    all: (workspaceId: string) => string;
    favorite: (workspaceId: string) => string;
    trash: (workspaceId: string) => string;
    setting: (workspaceId: string) => string;
    shared: (workspaceId: string) => string;
  };
};

export const WorkSpaceSliderBar: React.FC<WorkSpaceSliderBarProps> = ({
  currentWorkspace,
  currentPageId,
  openPage,
  createPage,
  currentPath,
  paths,
  onOpenQuickSearchModal,
  onOpenWorkspaceListModal,
}) => {
  const currentWorkspaceId = currentWorkspace?.id || null;
  const blockSuiteWorkspace = currentWorkspace?.blockSuiteWorkspace;
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useSidebarStatus();
  const pageMeta = usePageMeta(blockSuiteWorkspace ?? null);
  const onClickNewPage = useCallback(async () => {
    const page = await createPage();
    openPage(page.id);
  }, [createPage, openPage]);
  const floatingSlider = useSidebarFloating();
  const [sliderWidth] = useSidebarWidth();
  const [isResizing] = useSidebarResizing();
  const [isScrollAtTop, setIsScrollAtTop] = useState(true);
  const [actualWidth, setActualWidth] = useState<string | number>(256);
  useEffect(() => {
    setActualWidth(floatingSlider ? 'calc(10vw + 400px)' : sliderWidth);
  }, [floatingSlider, sliderWidth]);
  useEffect(() => {
    window.apis?.onSidebarVisibilityChange(sidebarOpen);
  }, [sidebarOpen]);

  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if ((e.key === '/' && e.metaKey) || (e.key === '/' && e.ctrlKey)) {
        setSidebarOpen(!sidebarOpen);
      }
    };
    document.addEventListener('keydown', keydown, { capture: true });
    return () =>
      document.removeEventListener('keydown', keydown, { capture: true });
  }, [sidebarOpen, setSidebarOpen]);
  const sidebarRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (sidebarRef.current) {
      sidebarRef.current.style.width = `${actualWidth}px`;
    }
  }, [actualWidth]);

  return (
    <>
      <StyledSliderBarWrapper
        className={clsx(
          {
            [floatingStyle]: floatingSlider,
            [macOSStyle]: environment.isDesktop && environment.isMacOs,
            [nonFloatingStyle]: !floatingSlider,
            [resizingStyle]: isResizing,
          },
          sidebarOpen ? showStyle : hideStyle
        )}
        data-testid="sliderBar-root"
        ref={sidebarRef}
      >
        <StyledSliderBar>
          <StyledSidebarHeader>
            <RouteNavigation />
            <Suspense>
              <SidebarSwitch
                visible={sidebarOpen}
                tooltipContent={t('Collapse sidebar')}
                data-testid="sliderBar-arrowButton-collapse"
              />
            </Suspense>
          </StyledSidebarHeader>

          <StyledSliderBarInnerWrapper data-testid="sliderBar-inner">
            <WorkspaceSelector
              currentWorkspace={currentWorkspace}
              onClick={onOpenWorkspaceListModal}
            />
            {config.enableChangeLog && <ChangeLog />}
            <StyledListItem
              data-testid="slider-bar-quick-search-button"
              onClick={useCallback(() => {
                onOpenQuickSearchModal();
              }, [onOpenQuickSearchModal])}
            >
              <SearchIcon />
              {t('Quick search')}
            </StyledListItem>
            <StyledListItem
              active={
                currentPath ===
                (currentWorkspaceId && paths.setting(currentWorkspaceId))
              }
              data-testid="slider-bar-workspace-setting-button"
              style={{
                marginBottom: '16px',
              }}
            >
              <StyledLink
                href={{
                  pathname:
                    currentWorkspaceId && paths.setting(currentWorkspaceId),
                }}
              >
                <SettingsIcon />
                {t('Workspace Settings')}
              </StyledLink>
            </StyledListItem>
            <StyledListItem
              active={
                currentPath ===
                (currentWorkspaceId && paths.all(currentWorkspaceId))
              }
            >
              <StyledLink
                href={{
                  pathname: currentWorkspaceId && paths.all(currentWorkspaceId),
                }}
              >
                <FolderIcon />
                <span data-testid="all-pages">{t('All pages')}</span>
              </StyledLink>
            </StyledListItem>
            <StyledScrollWrapper
              showTopBorder={!isScrollAtTop}
              onScroll={(e: UIEvent<HTMLDivElement>) => {
                (e.target as HTMLDivElement).scrollTop === 0
                  ? setIsScrollAtTop(true)
                  : setIsScrollAtTop(false);
              }}
            >
              <Favorite
                currentPath={currentPath}
                paths={paths}
                currentPageId={currentPageId}
                openPage={openPage}
                currentWorkspace={currentWorkspace}
              />
              {!!blockSuiteWorkspace && (
                <Pinboard
                  blockSuiteWorkspace={blockSuiteWorkspace}
                  openPage={openPage}
                  allMetas={pageMeta}
                />
              )}
            </StyledScrollWrapper>
            <div style={{ height: 16 }}></div>
            {currentWorkspace?.flavour === WorkspaceFlavour.AFFINE &&
            currentWorkspace.public ? (
              <StyledListItem>
                <StyledLink
                  href={{
                    pathname:
                      currentWorkspaceId && paths.setting(currentWorkspaceId),
                  }}
                >
                  <ShareIcon />
                  <span data-testid="Published-to-web">Published to web</span>
                </StyledLink>
              </StyledListItem>
            ) : (
              <StyledListItem
                active={
                  currentPath ===
                  (currentWorkspaceId && paths.shared(currentWorkspaceId))
                }
              >
                <StyledLink
                  href={{
                    pathname:
                      currentWorkspaceId && paths.shared(currentWorkspaceId),
                  }}
                >
                  <ShareIcon />
                  <span data-testid="shared-pages">{t('Shared Pages')}</span>
                </StyledLink>
              </StyledListItem>
            )}
            <StyledListItem
              active={
                currentPath ===
                (currentWorkspaceId && paths.trash(currentWorkspaceId))
              }
            >
              <StyledLink
                href={{
                  pathname:
                    currentWorkspaceId && paths.trash(currentWorkspaceId),
                }}
              >
                <DeleteTemporarilyIcon /> {t('Trash')}
              </StyledLink>
            </StyledListItem>
          </StyledSliderBarInnerWrapper>

          <StyledNewPageButton
            data-testid="new-page-button"
            onClick={onClickNewPage}
          >
            <PlusIcon /> {t('New Page')}
          </StyledNewPageButton>
        </StyledSliderBar>
      </StyledSliderBarWrapper>
      <StyledSliderModalBackground
        data-testid="sliderBar-modalBackground"
        active={floatingSlider && sidebarOpen}
        onClick={() => setSidebarOpen(false)}
      />
    </>
  );
};
