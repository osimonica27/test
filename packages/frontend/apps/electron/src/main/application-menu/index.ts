import type { MainEventRegister } from '../type';
import { applicationMenuSubjects } from './subject';

export * from './create';
export * from './subject';

/**
 * Events triggered by application menu
 */
export const applicationMenuEvents = {
  /**
   * File -> New Doc
   */
  onNewPageAction: (fn: (type: 'page' | 'edgeless') => void) => {
    const sub = applicationMenuSubjects.newPageAction$.subscribe(fn);
    return () => {
      sub.unsubscribe();
    };
  },
  openAboutPageInSettingModal: (fn: () => void) => {
    const sub =
      applicationMenuSubjects.openAboutPageInSettingModal$.subscribe(fn);
    return () => {
      sub.unsubscribe();
    };
  },
  onOpenJournal: (fn: () => void) => {
    const sub = applicationMenuSubjects.openJournal$.subscribe(fn);
    return () => {
      sub.unsubscribe();
    };
  },
} satisfies Record<string, MainEventRegister>;
