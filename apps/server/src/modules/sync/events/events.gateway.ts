import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { applyUpdate, Doc as YDoc, encodeStateAsUpdate } from 'yjs';

import { Metrics } from '../../../metrics/metrics';
import { DocManager } from '../../doc';

function trimGuid(ws: string, guid: string) {
  if (guid.startsWith(`${ws}:space:`)) {
    return guid.substring(ws.length + 1);
  }

  return guid;
}

@WebSocketGateway({
  cors: process.env.NODE_ENV !== 'production',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private connectionCount = 0;

  constructor(
    private readonly docManager: DocManager,
    private readonly metric: Metrics
  ) {}

  @WebSocketServer()
  server!: Server;

  handleConnection() {
    this.connectionCount++;
    this.metric.socketIOConnectionGauge(this.connectionCount, {});
  }

  handleDisconnect() {
    this.connectionCount--;
    this.metric.socketIOConnectionGauge(this.connectionCount, {});
  }

  @SubscribeMessage('client-handshake')
  async handleClientHandShake(
    @MessageBody() workspaceId: string,
    @ConnectedSocket() client: Socket
  ) {
    this.metric.socketIOEventCounter(1, { event: 'client-handshake' });
    const endTimer = this.metric.socketIOEventTimer({
      event: 'client-handshake',
    });
    await client.join(workspaceId);
    endTimer();
  }

  @SubscribeMessage('client-leave')
  async handleClientLeave(
    @MessageBody() workspaceId: string,
    @ConnectedSocket() client: Socket
  ) {
    this.metric.socketIOEventCounter(1, { event: 'client-leave' });
    const endTimer = this.metric.socketIOEventTimer({
      event: 'client-leave',
    });
    await client.leave(workspaceId);
    endTimer();
  }

  @SubscribeMessage('client-update')
  async handleClientUpdate(
    @MessageBody()
    message: {
      workspaceId: string;
      guid: string;
      update: string;
    },
    @ConnectedSocket() client: Socket
  ) {
    this.metric.socketIOEventCounter(1, { event: 'client-update' });
    const endTimer = this.metric.socketIOEventTimer({ event: 'client-update' });
    const update = Buffer.from(message.update, 'base64');
    client.to(message.workspaceId).emit('server-update', message);
    const guid = trimGuid(message.workspaceId, message.guid);

    await this.docManager.push(message.workspaceId, guid, update);
    endTimer();
  }

  @SubscribeMessage('doc-load')
  async loadDoc(
    @MessageBody()
    message: {
      workspaceId: string;
      guid: string;
      stateVector?: string;
      targetClientId?: number;
    }
  ): Promise<string | false> {
    this.metric.socketIOEventCounter(1, { event: 'doc-load' });
    const endTimer = this.metric.socketIOEventTimer({ event: 'doc-load' });
    const guid = trimGuid(message.workspaceId, message.guid);
    let update = await this.docManager.getLatest(message.workspaceId, guid);

    const stateVector = message.stateVector
      ? Buffer.from(message.stateVector, 'base64')
      : null;

    if (update && stateVector) {
      const doc = new YDoc({ guid });
      applyUpdate(doc, update);
      update = Buffer.from(encodeStateAsUpdate(doc, stateVector));
      doc.destroy();
    }

    endTimer();

    return update ? update.toString('base64') : false;
  }

  @SubscribeMessage('awareness-init')
  async handleInitAwareness(
    @MessageBody() workspaceId: string,
    @ConnectedSocket() client: Socket
  ) {
    this.metric.socketIOEventCounter(1, { event: 'awareness-init' });
    const endTimer = this.metric.socketIOEventTimer({
      event: 'init-awareness',
    });
    client.to(workspaceId).emit('new-client-awareness-init');
    endTimer();
  }

  @SubscribeMessage('awareness-update')
  async handleHelpGatheringAwareness(
    @MessageBody() message: { workspaceId: string; awarenessUpdate: string },
    @ConnectedSocket() client: Socket
  ) {
    this.metric.socketIOEventCounter(1, { event: 'awareness-update' });
    const endTimer = this.metric.socketIOEventTimer({
      event: 'awareness-update',
    });
    client.to(message.workspaceId).emit('server-awareness-broadcast', {
      ...message,
    });

    endTimer();
    return 'ack';
  }
}
