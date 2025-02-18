/* auto-generated by NAPI-RS */
/* eslint-disable */
export declare class Application {
  static tapGlobalAudio(excludedProcesses: Array<Application> | undefined | null, audioStreamCallback: ((err: Error | null, arg: Float32Array) => void)): AudioTapStream
  get processId(): number
  get bundleIdentifier(): string
  get name(): string
  get icon(): Buffer
  get isRunning(): boolean
  tapAudio(audioStreamCallback: ((err: Error | null, arg: Float32Array) => void)): AudioTapStream
}

export declare class ApplicationListChangedSubscriber {
  unsubscribe(): void
}

export declare class ApplicationStateChangedSubscriber {
  unsubscribe(): void
}

export declare class AudioTapStream {
  stop(): void
}

export declare class DocStorage {
  constructor(path: string)
  validate(): Promise<boolean>
  setSpaceId(spaceId: string): Promise<void>
}

export declare class DocStoragePool {
  constructor()
  /** Initialize the database and run migrations. */
  connect(universalId: string, path: string): Promise<void>
  disconnect(universalId: string): Promise<void>
  checkpoint(universalId: string): Promise<void>
  setSpaceId(universalId: string, spaceId: string): Promise<void>
  pushUpdate(universalId: string, docId: string, update: Uint8Array): Promise<Date>
  getDocSnapshot(universalId: string, docId: string): Promise<DocRecord | null>
  setDocSnapshot(universalId: string, snapshot: DocRecord): Promise<boolean>
  getDocUpdates(universalId: string, docId: string): Promise<Array<DocUpdate>>
  markUpdatesMerged(universalId: string, docId: string, updates: Array<Date>): Promise<number>
  deleteDoc(universalId: string, docId: string): Promise<void>
  getDocClocks(universalId: string, after?: Date | undefined | null): Promise<Array<DocClock>>
  getDocClock(universalId: string, docId: string): Promise<DocClock | null>
  getBlob(universalId: string, key: string): Promise<Blob | null>
  setBlob(universalId: string, blob: SetBlob): Promise<void>
  deleteBlob(universalId: string, key: string, permanently: boolean): Promise<void>
  releaseBlobs(universalId: string): Promise<void>
  listBlobs(universalId: string): Promise<Array<ListedBlob>>
  getPeerRemoteClocks(universalId: string, peer: string): Promise<Array<DocClock>>
  getPeerRemoteClock(universalId: string, peer: string, docId: string): Promise<DocClock | null>
  setPeerRemoteClock(universalId: string, peer: string, docId: string, clock: Date): Promise<void>
  getPeerPulledRemoteClocks(universalId: string, peer: string): Promise<Array<DocClock>>
  getPeerPulledRemoteClock(universalId: string, peer: string, docId: string): Promise<DocClock | null>
  setPeerPulledRemoteClock(universalId: string, peer: string, docId: string, clock: Date): Promise<void>
  getPeerPushedClocks(universalId: string, peer: string): Promise<Array<DocClock>>
  getPeerPushedClock(universalId: string, peer: string, docId: string): Promise<DocClock | null>
  setPeerPushedClock(universalId: string, peer: string, docId: string, clock: Date): Promise<void>
  clearClocks(universalId: string): Promise<void>
}

export declare class RecordingPermissions {
  audio: boolean
  screen: boolean
}

export declare class ShareableContent {
  static onApplicationListChanged(callback: ((err: Error | null, ) => void)): ApplicationListChangedSubscriber
  static onAppStateChanged(app: Application, callback: ((err: Error | null, ) => void)): ApplicationStateChangedSubscriber
  constructor()
  applications(): Array<Application>
  applicationWithProcessId(processId: number): Application
  checkRecordingPermissions(): RecordingPermissions
}

export declare class SqliteConnection {
  constructor(path: string)
  connect(): Promise<void>
  addBlob(key: string, blob: Uint8Array): Promise<void>
  getBlob(key: string): Promise<BlobRow | null>
  deleteBlob(key: string): Promise<void>
  getBlobKeys(): Promise<Array<string>>
  getUpdates(docId?: string | undefined | null): Promise<Array<UpdateRow>>
  getDocTimestamps(): Promise<Array<DocTimestampRow>>
  deleteUpdates(docId?: string | undefined | null): Promise<void>
  getUpdatesCount(docId?: string | undefined | null): Promise<number>
  getAllUpdates(): Promise<Array<UpdateRow>>
  insertUpdates(updates: Array<InsertRow>): Promise<void>
  replaceUpdates(docId: string | undefined | null, updates: Array<InsertRow>): Promise<void>
  getServerClock(key: string): Promise<BlobRow | null>
  setServerClock(key: string, data: Uint8Array): Promise<void>
  getServerClockKeys(): Promise<Array<string>>
  clearServerClock(): Promise<void>
  delServerClock(key: string): Promise<void>
  getSyncMetadata(key: string): Promise<BlobRow | null>
  setSyncMetadata(key: string, data: Uint8Array): Promise<void>
  getSyncMetadataKeys(): Promise<Array<string>>
  clearSyncMetadata(): Promise<void>
  delSyncMetadata(key: string): Promise<void>
  initVersion(): Promise<void>
  setVersion(version: number): Promise<void>
  getMaxVersion(): Promise<number>
  close(): Promise<void>
  get isClose(): boolean
  static validate(path: string): Promise<ValidationResult>
  migrateAddDocId(): Promise<void>
  /**
   * Flush the WAL file to the database file.
   * See https://www.sqlite.org/pragma.html#pragma_wal_checkpoint:~:text=PRAGMA%20schema.wal_checkpoint%3B
   */
  checkpoint(): Promise<void>
}

export interface Blob {
  key: string
  data: Uint8Array
  mime: string
  size: number
  createdAt: Date
}

export interface BlobRow {
  key: string
  data: Buffer
  timestamp: Date
}

export interface DocClock {
  docId: string
  timestamp: Date
}

export interface DocRecord {
  docId: string
  bin: Uint8Array
  timestamp: Date
}

export interface DocTimestampRow {
  docId?: string
  timestamp: Date
}

export interface DocUpdate {
  docId: string
  timestamp: Date
  bin: Uint8Array
}

export interface InsertRow {
  docId?: string
  data: Uint8Array
}

export interface ListedBlob {
  key: string
  size: number
  mime: string
  createdAt: Date
}

export declare function mintChallengeResponse(resource: string, bits?: number | undefined | null): Promise<string>

export interface SetBlob {
  key: string
  data: Uint8Array
  mime: string
}

export interface UpdateRow {
  id: number
  timestamp: Date
  data: Buffer
  docId?: string
}

export declare enum ValidationResult {
  MissingTables = 0,
  MissingDocIdColumn = 1,
  MissingVersionColumn = 2,
  GeneralError = 3,
  Valid = 4
}

export declare function verifyChallengeResponse(response: string, bits: number, resource: string): Promise<boolean>
