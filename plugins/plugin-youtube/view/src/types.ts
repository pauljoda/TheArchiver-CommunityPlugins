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

/** Parsed yt-dlp .info.json metadata */
export interface YtDlpInfo {
  id: string;
  title: string;
  description?: string;
  upload_date?: string;
  duration?: number;
  view_count?: number;
  like_count?: number;
  channel?: string;
  channel_url?: string;
  uploader?: string;
  thumbnail?: string;
  tags?: string[];
  categories?: string[];
  chapters?: Array<{
    title: string;
    start_time: number;
    end_time: number;
  }>;
  playlist_title?: string;
  series?: string;
  season_number?: number;
  episode_number?: number;
  resolution?: string;
  fps?: number;
  ext?: string;
  format?: string;
  webpage_url?: string;
  channel_follower_count?: number;
}

/** Video entry for channel/playlist view */
export interface VideoInfo {
  /** Directory path containing the video */
  path: string;
  /** Filename stem (no extension) */
  stem: string;
  /** Relative path to the video file */
  videoFile: string;
  /** Relative path to thumbnail image */
  thumbnail?: string;
  /** Parsed .info.json metadata (may be null) */
  info?: YtDlpInfo;
}

/** Channel/playlist card for library view */
export interface ChannelInfo {
  name: string;
  path: string;
  videoCount: number;
  previewThumb?: string;
}

/** View modes for the router */
export type ViewMode = "library" | "channel" | "video";
