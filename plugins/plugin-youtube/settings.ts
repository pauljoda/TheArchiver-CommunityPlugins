// Single source of truth for all plugin settings.
// Both index.ts and manifest-gen.ts reference this file.
import { siteOptions } from "./sites";

interface PluginSettingDefinition {
  key: string;
  type: "string" | "number" | "boolean" | "password" | "select" | "action" | "site-directory-map" | "file";
  label: string;
  description?: string;
  defaultValue?: string | number | boolean;
  required?: boolean;
  hidden?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: Array<{ label: string; value: string }>;
    accept?: string;
    maxSize?: number;
  };
  sortOrder?: number;
}

export const pluginSettings: PluginSettingDefinition[] = [
  {
    key: "save_directory",
    type: "string",
    label: "Default Library Folder",
    description:
      "Default folder within your downloads directory for downloaded content. " +
      "Used when no per-site override matches.",
    defaultValue: "yt-dlp",
    required: false,
    sortOrder: 0,
  },
  {
    key: "site_directories",
    type: "site-directory-map",
    label: "Per-Site Download Folders",
    description:
      "Assign sites to specific download folders. Downloads from matched sites go into that subfolder instead of the default library folder.",
    required: false,
    sortOrder: 1,
    validation: {
      options: siteOptions,
    },
  },
  {
    key: "quality",
    type: "select",
    label: "Video Quality",
    description:
      "Preferred video quality (yt-dlp will pick the best available up to this)",
    required: false,
    sortOrder: 2,
    defaultValue: "best",
    validation: {
      options: [
        { label: "Best Available", value: "best" },
        { label: "4K (2160p)", value: "2160" },
        { label: "1440p", value: "1440" },
        { label: "1080p", value: "1080" },
        { label: "720p", value: "720" },
        { label: "480p", value: "480" },
      ],
    },
  },
  {
    key: "audio_only",
    type: "boolean",
    label: "Audio Only",
    description: "Download audio only (best quality audio, saved as .m4a/.opus)",
    required: false,
    defaultValue: false,
    sortOrder: 3,
  },
  {
    key: "embed_metadata",
    type: "boolean",
    label: "Embed Metadata",
    description:
      "Embed title, description, thumbnail, and chapter markers into the file",
    required: false,
    defaultValue: true,
    sortOrder: 4,
  },
  {
    key: "embed_subtitles",
    type: "boolean",
    label: "Embed Subtitles",
    description:
      "Download and embed available subtitles into the video file",
    required: false,
    defaultValue: false,
    sortOrder: 5,
  },
  {
    key: "cookies_file",
    type: "file",
    label: "Cookies File",
    description:
      "Upload a Netscape-format cookies.txt file for authenticated downloads " +
      "(age-restricted, members-only, or private content). " +
      "To export cookies from your browser: " +
      'Chrome — use the "Get cookies.txt LOCALLY" extension. ' +
      'Firefox — use the "cookies.txt" extension. ' +
      "Visit the site you need cookies for, click the extension, and export.",
    required: false,
    sortOrder: 6,
    validation: {
      accept: ".txt",
      maxSize: 5242880,
    },
  },
  {
    key: "sponsor_block",
    type: "boolean",
    label: "SponsorBlock",
    description:
      "Mark or remove sponsored segments using SponsorBlock data (YouTube only)",
    required: false,
    defaultValue: false,
    sortOrder: 7,
  },
  {
    key: "extra_args",
    type: "string",
    label: "Extra yt-dlp Arguments",
    description:
      "Additional command-line arguments passed to yt-dlp (advanced)",
    required: false,
    sortOrder: 8,
  },
];
