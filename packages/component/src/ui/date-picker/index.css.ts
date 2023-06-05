import { globalStyle, style } from '@vanilla-extract/css';

export const inputStyle = style({
  fontSize: 'var(--affine-font-xs)',
  width: '70px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '22px',
  marginLeft: '10px',
  marginRight: '10px',
});
export const popperStyle = style({
  boxShadow: 'var(--affine-shadow-2)',
  padding: '0 10px',
  marginTop: '16px',
  background: 'var(--affine-background-overlay-panel-color)',
  borderRadius: '12px',
});

globalStyle('.react-datepicker__header', {
  background: 'var(--affine-background-overlay-panel-color)',
  border: 'none',
  marginBottom: '6px',
});
export const headerStyle = style({
  background: 'var(--affine-background-overlay-panel-color)',
  border: 'none',
  display: 'flex',
  width: '100%',
  alignItems: 'center',
  marginBottom: '12px',
  padding: '0 14px',
});
export const yearStyle = style({
  color: 'var(--affine-text-primary-color)',
  fontWeight: '600',
  fontSize: 'var(--affine-font-sm)',
});
export const mouthStyle = style({
  color: 'var(--affine-text-primary-color)',
  fontWeight: '600',
  fontSize: 'var(--affine-font-sm)',
});
export const arrowLeftStyle = style({
  width: '16px',
  height: '16px',
  flex: '1',
  textAlign: 'right',
  marginRight: '14px',
});
export const arrowRightStyle = style({
  width: '16px',
  height: '16px',
  marginRight: 'auto',
});
export const weekStyle = style({
  fontSize: 'var(--affine-font-xs)',
  color: 'var(--affine-text-secondary-color)',
  display: 'inline-block',
  width: '28px',
  height: '28px',
  lineHeight: '28px',
  padding: '0 4px',
  margin: '0px 6px',
  verticalAlign: 'middle',
});
export const calendarStyle = style({
  background: 'var(--affine-background-overlay-panel-color)',
  border: 'none',
});
export const dayStyle = style({
  fontSize: 'var(--affine-font-xs)',
  color: 'var(--affine-text-primary-color)',
  display: 'inline-block',
  width: '28px',
  height: '28px',
  lineHeight: '28px',
  padding: '0 4px',
  margin: '6px',
  verticalAlign: 'middle',

  selectors: {
    '&:hover': {
      background: 'var(--affine-hover-color)',
      borderRadius: '8px',
      transition: 'background-color 0.3s ease-in-out',
    },
    '&[aria-selected="true"]': {
      color: 'var(--affine-white)',
      background: 'var(--affine-primary-color)',
      borderRadius: '8px',
      fontWeight: '400',
    },
    '&[aria-selected="true"]:hover': {
      background: 'var(--affine-primary-color)',
      borderRadius: '8px',
    },
    '&[tabindex="0"][aria-selected="false"]': {
      background: 'var(--affine-tertiary-color)',
      borderRadius: '8px',
    },
  },
});
