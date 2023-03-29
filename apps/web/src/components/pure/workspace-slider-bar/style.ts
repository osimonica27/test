import { displayFlex, styled } from '@affine/component';
import Link from 'next/link';
export const StyledSliderBar = styled('div')<{
  resizing: boolean;
  show: boolean;
  floating: boolean;
}>(({ theme, show, floating, resizing }) => {
  return {
    whiteSpace: 'nowrap',
    height: '100%',
    background: theme.colors.hubBackground,
    boxShadow: theme.shadow.popover,
    zIndex: theme.zIndex.modal,
    transition: !resizing ? 'width .15s, padding .15s' : '',
    padding: show ? '0 4px' : '0',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: floating ? 'absolute' : 'relative',
  };
});
export const StyledSidebarSwitchWrapper = styled('div')(() => {
  return {
    height: '48px',
    flexShrink: 0,
    padding: '0 16px',
    ...displayFlex('flex-start', 'center'),
  };
});
export const StyledSlidebarWrapper = styled('div')(() => {
  return {
    flexGrow: 1,
    overflowX: 'hidden',
    overflowY: 'auto',
    position: 'relative',
  };
});

export const StyledLink = styled(Link)(() => {
  return {
    flexGrow: 1,
    textAlign: 'left',
    color: 'inherit',
    ...displayFlex('flex-start', 'center'),
    ':visited': {
      color: 'inherit',
    },
  };
});
export const StyledNewPageButton = styled('button')(({ theme }) => {
  return {
    height: '48px',
    ...displayFlex('flex-start', 'center'),
    borderTop: '1px solid',
    borderColor: theme.colors.borderColor,
    padding: '0 8px',
    svg: {
      fontSize: '20px',
      color: theme.colors.iconColor,
      marginRight: '8px',
    },
    ':hover': {
      color: theme.colors.primaryColor,
      svg: {
        color: theme.colors.primaryColor,
      },
    },
  };
});
export const StyledSliderModalBackground = styled('div')(({ theme }) => {
  return {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: theme.zIndex.modal - 1,
    // ?: add background?
  };
});
export const StyledSliderResizer = styled('div')<{ isResizing: boolean }>(
  ({ theme, isResizing }) => {
    return {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: '4px',
      cursor: 'ew-resize',
      zIndex: theme.zIndex.modal + 1,
      userSelect: 'none',
      transition: 'background .15s .1s',
      ':hover': {
        background: theme.colors.primaryColor,
      },
      background: isResizing ? theme.colors.primaryColor : 'transparent',
    };
  }
);
