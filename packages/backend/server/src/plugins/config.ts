import { ModuleStartupConfigDescriptions } from '../base/config/types';

export interface PluginsConfig {
  copilot: {
    apiKey?: string;
    apiUrl?: string;
    embeddingModel?: string;
    enabled?: boolean;
  };
}

export type AvailablePlugins = keyof PluginsConfig;

declare module '../base/config' {
  interface AppConfig {
    plugins: PluginsConfig;
  }

  interface AppPluginsConfig {
    use<Plugin extends AvailablePlugins>(
      plugin: Plugin,
      config?: DeepPartial<
        ModuleStartupConfigDescriptions<PluginsConfig[Plugin]>
      >
    ): void;
    plugins: {
      /**
       * @deprecated use `AFFiNE.use` instead
       */
      use<Plugin extends AvailablePlugins>(
        plugin: Plugin,
        config?: DeepPartial<
          ModuleStartupConfigDescriptions<PluginsConfig[Plugin]>
        >
      ): void;
    };
  }
}
