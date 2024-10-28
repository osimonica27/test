import {
  ConnectOp,
  DisconnectOp,
  OpConsumer,
  type OpHandler,
  type OpSubscribableHandler,
  SubscribeConnectionStatusOp,
} from '../op';
import type { Storage } from '../storage';

export class PeerStorageBackend extends OpConsumer {
  private storages: Storage[] = [];
  private readonly storageOpts: { impl: string; opts: any }[] = [];

  constructor(port: MessagePort) {
    super(port);
    this.register(ConnectOp, this.connect);
    this.register(DisconnectOp, this.disconnect);
    this.registerSubscribable(
      SubscribeConnectionStatusOp,
      this.onStatusChanged
    );
  }

  addBackendStorage<T extends new (opts: any) => Storage>(
    impl: T,
    opts: ConstructorParameters<T>[0]
  ) {
    this.storageOpts.push({ impl: impl.name, opts });
  }

  connect: OpHandler<ConnectOp> = async () => {
    await Promise.all(
      this.storageOpts.map(async _impl => {
        // const storage = new StorageImplementations[impl.impl](impl.opts);
        // await storage.connect();
        // storage.register(this.port);
        // this.storages[impl.type] = storage;
      })
    );
  };

  disconnect: OpHandler<DisconnectOp> = async () => {
    await Promise.all(
      Object.values(this.storages).map(async storage => {
        await storage.disconnect();
      })
    );
    this.storages = [];
  };

  onStatusChanged: OpSubscribableHandler<SubscribeConnectionStatusOp> = (
    _,
    callback
  ) => {
    callback(/* { status: 'connected' } */);

    return () => {};
  };
}

export class PeerWorkerStorageBackend extends PeerStorageBackend {
  // override async connect() {
  // const worker = await getAndInitWorkerInSomewhere();
  // the worker should proxy all 'op' messages to it's true backend
  // worker.postMessage(
  //   {
  //     type: 'create-storage-worker-backend',
  //     storages: this.opts.storages,
  //     port: this.port,
  //   },
  //   [
  //     // transfer ownership of consumer port to worker,
  //     // this port is no longer usable in main thread
  //     this.port,
  //   ]
  // );
  // }
}
