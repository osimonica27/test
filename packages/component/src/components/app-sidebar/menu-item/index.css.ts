import { style } from '@vanilla-extract/css';

export const root = style({
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: '4px',
  width: '100%',
  minHeight: '30px',
  userSelect: 'none',
  cursor: 'pointer',
  padding: '0 12px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 'var(--affine-font-sm)',
  selectors: {
    '&:hover': {
      background: 'var(--affine-hover-color)',
    },
    '&[data-active="true"]': {
      color: 'var(--affine-primary-color)',
      background: 'var(--affine-hover-color)',
    },
  },
});

export const icon = style({
  marginRight: '14px',
  color: 'var(--affine-icon-color)',
  fontSize: '18px',
});

export const spacer = style({
  flex: 1,
});

export const linkItemRoot = style({
  color: 'inherit',
  display: 'contents',
});
