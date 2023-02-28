import { Content } from '@affine/component';
import { assertExists } from '@blocksuite/store';
import React, { useState } from 'react';

import { usePageMeta } from '../../../hooks/use-page-meta';
import { BlockSuiteWorkspace } from '../../../shared';
import { PageNotFoundError } from '../../affine/affine-error-eoundary';
import { EditorModeSwitch } from './editor-mode-switch';
import Header from './header';
import { QuickSearchButton } from './quick-search-button';
import {
  StyledSearchArrowWrapper,
  StyledSwitchWrapper,
  StyledTitle,
  StyledTitleWrapper,
} from './styles';

export type BlockSuiteEditorHeaderProps = {
  blockSuiteWorkspace: BlockSuiteWorkspace;
  pageId: string;
};

export const BlockSuiteEditorHeader: React.FC<BlockSuiteEditorHeaderProps> = ({
  blockSuiteWorkspace,
  pageId,
}) => {
  const page = blockSuiteWorkspace.getPage(pageId);
  if (!page) {
    throw new PageNotFoundError(blockSuiteWorkspace, pageId);
  }
  const pageMeta = usePageMeta(blockSuiteWorkspace).find(
    meta => meta.id === pageId
  );
  assertExists(pageMeta);
  const title = pageMeta.title;
  const [isHover, setIsHover] = useState(false);
  const { trash: isTrash } = pageMeta;
  return (
    <Header
      rightItems={
        isTrash
          ? ['trashButtonGroup']
          : ['syncUser', 'themeModeSwitch', 'editorOptionMenu']
      }
    >
      {title && (
        <StyledTitle
          data-tauri-drag-region
          onMouseEnter={() => {
            if (isTrash) return;

            setIsHover(true);
          }}
          onMouseLeave={() => {
            if (isTrash) return;

            setIsHover(false);
          }}
        >
          <StyledTitleWrapper>
            <StyledSwitchWrapper>
              <EditorModeSwitch
                blockSuiteWorkspace={blockSuiteWorkspace}
                pageId={pageId}
                isHover={isHover}
                style={{
                  marginRight: '12px',
                }}
              />
            </StyledSwitchWrapper>
            <Content ellipsis={true}>{title}</Content>
            <StyledSearchArrowWrapper>
              <QuickSearchButton onClick={() => {}} />
            </StyledSearchArrowWrapper>
          </StyledTitleWrapper>
        </StyledTitle>
      )}
    </Header>
  );
};
