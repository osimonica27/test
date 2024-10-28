export abstract class Connection {
  protected _connected = false;

  protected doConnect() {
    return Promise.resolve();
  }
  protected doDisconnect() {
    return Promise.resolve();
  }

  get connected() {
    return this._connected;
  }

  async connect() {
    if (!this._connected) {
      await this.doConnect();
      this._connected = true;
    }
  }

  async disconnect() {
    if (!this._connected) {
      return;
    }

    await this.doDisconnect();
    this._connected = false;
  }
}
