interface Window {
  /**
   * After analyzing the `exposeInMainWorld` calls,
   * `packages/preload/exposedInMainWorld.d.ts` file will be generated.
   * It contains all interfaces.
   * `packages/preload/exposedInMainWorld.d.ts` file is required for TS is `renderer`
   *
   * @see https://github.com/cawa-93/dts-for-context-bridge
   */
  readonly apis: {
    workspaceSync: (id: string) => Promise<any>;
    changeTheme: (theme: string) => Promise<any>;
  };
  readonly appInfo: { electron: boolean; isMacOS: boolean };
}
