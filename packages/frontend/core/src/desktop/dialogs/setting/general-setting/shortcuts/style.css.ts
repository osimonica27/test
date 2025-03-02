import { cssVar } from '@toeverything/theme';
import { style } from '@vanilla-extract/css';

export const shortcutRow = style({
  height: '32px',
  marginBottom: '12px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: cssVar('fontBase'),
  selectors: {
    '&:last-of-type': {
      marginBottom: '0',
    },
  },
});

export const shortcutKeyContainer = style({
  display: 'flex',
});

export const shortcutKey = style({
  minWidth: '24px',
  height: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 6px',
  borderRadius: '4px',
  background: cssVar('backgroundTertiaryColor'),
  fontSize: cssVar('fontXs'),
  selectors: {
    '&:not(:last-of-type)': {
      marginRight: '2px',
    },
  },
});

export const editButton = style({
  marginLeft: '8px',
  color: cssVar('primaryColor'),
  fontSize: cssVar('fontXs'),
  padding: '2px 8px',
  height: '24px',
  ':hover': {
    background: cssVar('hoverColor'),
  }
});

export const resetButton = style({
  fontSize: cssVar('fontXs'),
  height: '24px',
  padding: '0 8px',
});

export const modalContent = style({
  padding: '20px',
});

export const shortcutRecorder = style({
  border: `1px solid ${cssVar('borderColor')}`,
  padding: '10px',
  borderRadius: '4px',
  minHeight: '40px',
  display: 'flex',
  alignItems: 'center',
  marginBottom: '10px',
  cursor: 'pointer',
  ':focus': {
    outline: `2px solid ${cssVar('primaryColor')}`,
  }
});

export const recordingIndicator = style({
  backgroundColor: cssVar('hoverColor'),
  outline: `2px solid ${cssVar('primaryColor')}`,
});
