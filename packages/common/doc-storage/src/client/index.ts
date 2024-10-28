import {
  ConnectOp,
  DisconnectOp,
  OpProducer,
  SubscribeConnectionStatusOp,
} from '../op';
import { PeerStorageBackend, PeerWorkerStorageBackend } from './backend';

class PeerStorageClient extends OpProducer {
  constructor(
    port: MessagePort,
    protected readonly backend: PeerStorageBackend
  ) {
    super(port);
  }

  addStorage = this.backend.addBackendStorage.bind(this.backend);

  async connect() {
    this.listen();
    await this.send(new ConnectOp());
  }

  async disconnect() {
    this.close();
    await this.send(new DisconnectOp());
  }

  onConnectionStatusChanged() {
    this.subscribe(new SubscribeConnectionStatusOp(), (/* storage */) => {});
  }
}

export function createPeerStorageClient() {
  const channel = new MessageChannel();
  const producerPort = channel.port1;
  const consumerPort = channel.port2;

  const backend = new PeerStorageBackend(consumerPort);

  const client = new PeerStorageClient(producerPort, backend);

  return client;
}

export function createPeerWorkerStorageClient() {
  const channel = new MessageChannel();
  const producerPort = channel.port1;
  const consumerPort = channel.port2;

  const backend = new PeerWorkerStorageBackend(consumerPort);

  const client = new PeerStorageClient(producerPort, backend);
  return client;
}
