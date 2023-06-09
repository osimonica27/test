import { join } from 'node:path';
import { Worker } from 'node:worker_threads';

import { AsyncCall } from 'async-call-rpc';
import { ipcMain } from 'electron';

import { ThreadWorkerChannel } from './utils';

export async function registerPlugin() {
  const pluginWorkerPath = join(__dirname, './workers/plugin.worker.js');
  const asyncCall = AsyncCall<
    Record<string, (...args: any) => PromiseLike<any>>
  >(
    {},
    {
      channel: new ThreadWorkerChannel(new Worker(pluginWorkerPath)),
    }
  );
  await import('@toeverything/plugin-infra/manager').then(
    ({ rootStore, affinePluginsAtom }) => {
      const bookmarkPluginPath = join(
        process.env.PLUGIN_DIR ?? '../../plugins',
        './bookmark-block/index.mjs'
      );
      import(bookmarkPluginPath);
      let dispose: () => void = () => {
        // noop
      };
      rootStore.sub(affinePluginsAtom, () => {
        dispose();
        const plugins = rootStore.get(affinePluginsAtom);
        Object.values(plugins).forEach(plugin => {
          plugin.definition.commands.forEach(command => {
            ipcMain.handle(command, (event, ...args) =>
              asyncCall[command](...args)
            );
          });
        });
        dispose = () => {
          Object.values(plugins).forEach(plugin => {
            plugin.definition.commands.forEach(command => {
              ipcMain.removeHandler(command);
            });
          });
        };
      });
    }
  );
}
