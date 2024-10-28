import type { OpHandler, OpSubscribableHandler } from '../../op';
import {
  type DocClocks,
  DocStorage,
  type DocStorageOptions,
  type GetDocSnapshotOp,
} from '../../storage';
import type {
  DeleteDocOp,
  GetDocDiffOp,
  GetDocTimestampsOp,
  PushDocUpdateOp,
  SubscribeDocUpdateOp,
} from '../../storage/ops';
import {
  base64ToUint8Array,
  type ServerEventsMap,
  type Socket,
  uint8ArrayToBase64,
} from './socket';

interface CloudDocStorageOptions extends DocStorageOptions {
  endpoint: string;
  socket: Socket;
}

export class CloudDocStorage extends DocStorage<CloudDocStorageOptions> {
  updateListeners = new Set<
    Parameters<OpSubscribableHandler<SubscribeDocUpdateOp>>[1]
  >();

  private get socket() {
    return this.options.socket;
  }

  get name() {
    return this.options.endpoint;
  }

  override async doConnect(): Promise<void> {
    const res = await this.socket.emitWithAck('space:join', {
      spaceType: this.spaceType,
      spaceId: this.spaceId,
      clientVersion: BUILD_CONFIG.appVersion,
    });

    if ('error' in res) {
      throw new Error(res.error.message);
    }
    this.socket?.on('space:broadcast-doc-update', this.onServerUpdate);
  }

  override async doDisconnect(): Promise<void> {
    this.socket.emit('space:leave', {
      spaceType: this.spaceType,
      spaceId: this.spaceId,
    });
    this.socket?.off('space:broadcast-doc-update', this.onServerUpdate);
  }

  onServerUpdate: ServerEventsMap['space:broadcast-doc-update'] = message => {
    if (
      this.spaceType === message.spaceType &&
      this.spaceId === message.spaceId
    ) {
      for (const listener of this.updateListeners) {
        listener({
          docId: message.docId,
          bin: base64ToUint8Array(message.update),
          timestamp: new Date(message.timestamp),
          editor: message.editor,
        });
      }
    }
  };

  override subscribeDocUpdate: OpSubscribableHandler<SubscribeDocUpdateOp> = (
    _,
    callback
  ) => {
    this.updateListeners.add(callback);
    return () => {
      this.updateListeners.delete(callback);
    };
  };

  override getDocSnapshot: OpHandler<GetDocSnapshotOp> = async ({ docId }) => {
    const response = await this.socket.emitWithAck('space:load-doc', {
      spaceType: this.spaceType,
      spaceId: this.spaceId,
      docId,
    });

    if ('error' in response) {
      // TODO: use [UserFriendlyError]
      throw new Error(response.error.message);
    }

    return {
      docId,
      bin: base64ToUint8Array(response.data.missing),
      timestamp: new Date(response.data.timestamp),
    };
  };

  override getDocDiff: OpHandler<GetDocDiffOp> = async ({ docId, state }) => {
    const response = await this.socket.emitWithAck('space:load-doc', {
      spaceType: this.spaceType,
      spaceId: this.spaceId,
      docId,
      stateVector: state ? await uint8ArrayToBase64(state) : void 0,
    });

    if ('error' in response) {
      // TODO: use [UserFriendlyError]
      throw new Error(response.error.message);
    }

    return {
      docId,
      missing: base64ToUint8Array(response.data.missing),
      state: base64ToUint8Array(response.data.state),
      timestamp: new Date(response.data.timestamp),
    };
  };

  override pushDocUpdate: OpHandler<PushDocUpdateOp> = async update => {
    const response = await this.socket.emitWithAck('space:push-doc-update', {
      spaceType: this.spaceType,
      spaceId: this.spaceId,
      docId: update.docId,
      updates: await uint8ArrayToBase64(update.bin),
    });

    if ('error' in response) {
      // TODO(@forehalo): use [UserFriendlyError]
      throw new Error(response.error.message);
    }

    return {
      docId: update.docId,
      timestamp: new Date(response.data.timestamp),
    };
  };

  override getDocTimestamps: OpHandler<GetDocTimestampsOp> = async ({
    after,
  }) => {
    const response = await this.socket.emitWithAck(
      'space:load-doc-timestamps',
      {
        spaceType: this.spaceType,
        spaceId: this.spaceId,
        timestamp: after ? after.getTime() : undefined,
      }
    );

    if ('error' in response) {
      // TODO(@forehalo): use [UserFriendlyError]
      throw new Error(response.error.message);
    }

    return Object.entries(response.data).reduce((ret, [docId, timestamp]) => {
      ret[docId] = new Date(timestamp);
      return ret;
    }, {} as DocClocks);
  };

  override deleteDoc: OpHandler<DeleteDocOp> = () => {};

  protected async setDocSnapshot() {
    return false;
  }
  protected async getDocUpdates() {
    return [];
  }
  protected async markUpdatesMerged() {
    return 0;
  }
}
