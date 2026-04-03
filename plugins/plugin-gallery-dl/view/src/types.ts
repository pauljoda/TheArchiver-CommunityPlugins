/** File entry returned by the host's fetchFiles API */
export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: string;
}

/** API provided by the plugin host */
export interface PluginViewAPI {
  currentPath: string;
  trackedDirectory: string;
  navigate: (path: string) => void;
  openFile: (path: string) => void;
  fetchFiles: (path: string) => Promise<FileEntry[]>;
  fetchFile: (path: string) => Promise<Response>;
  theme: {
    isDark: boolean;
    colors: Record<string, string>;
  };
}

/** Registration object passed to __archiver_register_view */
export interface PluginViewRegistration {
  render: (container: HTMLElement, api: PluginViewAPI) => void;
  destroy?: () => void;
  onPathChange?: (newPath: string, api: PluginViewAPI) => void;
}
