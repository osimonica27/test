import { style } from '@vanilla-extract/css';
export const settingWrapper = style({
  flexGrow: 1,
  display: 'flex',
  justifyContent: 'flex-end',
  minWidth: '150px',
  maxWidth: '250px',
  '@media': {
    'screen and (max-width: 768px)': {
      // margin: '10px',
      justifyContent: 'center',
    },
  },
});
