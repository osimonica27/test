import { Op } from './types';

export class ConnectOp extends Op<void, void> {}
export class DisconnectOp extends Op<void, void> {}
export class SubscribeConnectionStatusOp extends Op<void, void> {}
