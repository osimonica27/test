import {
  combineLatest,
  map,
  type Observable,
  ReplaySubject,
  share,
  throttleTime,
} from 'rxjs';

import type { BlobRecord, BlobStorage, BlobSyncStorage } from '../../storage';
import { MANUALLY_STOP } from '../../utils/throw-if-aborted';
import type { PeerStorageOptions } from '../types';
import { BlobSyncPeer } from './peer';

export interface BlobSyncState {
  uploading: number;
  downloading: number;
  error: number;
  overCapacity: boolean;
}

export interface BlobSyncBlobState {
  uploading: boolean;
  downloading: boolean;
  errorMessage?: string | null;
  overSize: boolean;
}

export interface BlobSync {
  readonly state$: Observable<BlobSyncState>;
  blobState$(blobId: string): Observable<BlobSyncBlobState>;
  downloadBlob(blobId: string): Promise<void>;
  uploadBlob(blob: BlobRecord): Promise<void>;
  /**
   * Download all blobs from a peer
   * @param peerId - The peer id to download from, if not provided, all peers will be downloaded
   * @param signal - The abort signal
   * @returns A promise that resolves when the download is complete
   */
  fullDownload(peerId?: string, signal?: AbortSignal): Promise<void>;
}

export class BlobSyncImpl implements BlobSync {
  // abort all pending jobs when the sync is destroyed
  private abortController = new AbortController();
  private started = false;
  private readonly peers: BlobSyncPeer[] = Object.entries(
    this.storages.remotes
  ).map(
    ([peerId, remote]) =>
      new BlobSyncPeer(peerId, this.storages.local, remote, this.blobSync)
  );

  readonly state$ = combineLatest(this.peers.map(peer => peer.peerState$)).pipe(
    // throttle the state to 1 second to avoid spamming the UI
    throttleTime(1000),
    map(allPeers =>
      allPeers.length === 0
        ? {
            uploading: 0,
            downloading: 0,
            error: 0,
            overCapacity: false,
          }
        : {
            uploading: allPeers.reduce((acc, peer) => acc + peer.uploading, 0),
            downloading: allPeers.reduce(
              (acc, peer) => acc + peer.downloading,
              0
            ),
            error: allPeers.reduce((acc, peer) => acc + peer.error, 0),
            overCapacity: allPeers.some(p => p.overCapacity),
          }
    ),
    share({
      connector: () => new ReplaySubject(1),
    })
  ) as Observable<BlobSyncState>;

  blobState$(blobId: string) {
    return combineLatest(
      this.peers.map(peer => peer.blobPeerState$(blobId))
    ).pipe(
      throttleTime(1000),
      map(
        peers =>
          ({
            uploading: peers.some(p => p.uploading),
            downloading: peers.some(p => p.downloading),
            errorMessage: peers.find(p => p.errorMessage)?.errorMessage,
            overSize: peers.some(p => p.overSize),
          }) satisfies BlobSyncBlobState
      ),
      share({
        connector: () => new ReplaySubject(1),
      })
    );
  }

  constructor(
    readonly storages: PeerStorageOptions<BlobStorage>,
    readonly blobSync: BlobSyncStorage
  ) {}

  downloadBlob(blobId: string) {
    const signal = this.abortController.signal;
    return Promise.race(
      this.peers.map(p => p.downloadBlob(blobId, signal))
    ).catch(err => {
      if (err === MANUALLY_STOP) {
        return;
      }
      // should never reach here, `downloadBlob()` should never throw
      console.error(err);
    });
  }

  uploadBlob(blob: BlobRecord) {
    return Promise.all(
      this.peers.map(p => p.uploadBlob(blob, this.abortController.signal))
    ).catch(err => {
      if (err === MANUALLY_STOP) {
        return;
      }
      // should never reach here, `uploadBlob()` should never throw
      console.error(err);
    }) as Promise<void>;
  }

  // start the upload loop
  start() {
    if (this.started) {
      return;
    }
    this.started = true;

    const signal = this.abortController.signal;
    Promise.allSettled(this.peers.map(p => p.fullUploadLoop(signal))).catch(
      err => {
        // should never reach here
        console.error(err);
      }
    );
  }

  // download all blobs from a peer
  async fullDownload(
    peerId?: string,
    outerSignal?: AbortSignal
  ): Promise<void> {
    return Promise.race([
      Promise.all(
        peerId
          ? [this.fullDownloadPeer(peerId)]
          : this.peers.map(p => this.fullDownloadPeer(p.peerId))
      ),
      new Promise<void>((_, reject) => {
        // Reject the promise if the outer signal is aborted
        // The outer signal only controls the API promise, not the actual download process
        if (outerSignal?.aborted) {
          reject(outerSignal.reason);
        }
        outerSignal?.addEventListener('abort', reason => {
          reject(reason);
        });
      }),
    ]) as Promise<void>;
  }

  // cache the download promise for each peer
  // this is used to avoid downloading the same peer multiple times
  private readonly fullDownloadPromise = new Map<string, Promise<void>>();
  private fullDownloadPeer(peerId: string) {
    const peer = this.peers.find(p => p.peerId === peerId);
    if (!peer) {
      return;
    }
    const existing = this.fullDownloadPromise.get(peerId);
    if (existing) {
      return existing;
    }
    const promise = peer
      .fullDownload(this.abortController.signal)
      .finally(() => {
        this.fullDownloadPromise.delete(peerId);
      });
    this.fullDownloadPromise.set(peerId, promise);
    return promise;
  }

  stop() {
    this.abortController.abort();
    this.abortController = new AbortController();
    this.started = false;
  }
}
