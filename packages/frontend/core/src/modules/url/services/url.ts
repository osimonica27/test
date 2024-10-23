import { Service } from '@toeverything/infra';

import type { ClientSchemaProvider } from '../providers/client-schema';
import type { PopupWindowProvider } from '../providers/popup-window';

export class UrlService extends Service {
  // those providers are optional, because they are not always available in some environments

  private readonly popupWindowProvider: PopupWindowProvider | undefined;
  private readonly clientSchemaProvider: ClientSchemaProvider | undefined;
  constructor(
    popupWindowProvider: PopupWindowProvider[],
    clientSchemaProvider: ClientSchemaProvider[]
  ) {
    super();
    this.popupWindowProvider = popupWindowProvider.at(0);
    this.clientSchemaProvider = clientSchemaProvider.at(0);
  }

  getClientSchema() {
    return this.clientSchemaProvider?.getClientSchema();
  }

  /**
   * open a popup window, provide different implementations in different environments.
   * e.g. in electron, use system default browser to open a popup window.
   *
   * @param url only full url with http/https protocol is supported
   */
  openPopupWindow(url: string) {
    if (!url.startsWith('http')) {
      throw new Error('only full url with http/https protocol is supported');
    }
    this.popupWindowProvider?.open(url);
  }
}
