import { SimplifiedMarkdown } from "../../types";

export interface DefaultLlmPageOptions {
  content: SimplifiedMarkdown;
  url: string;
  screenshot?: string;
  logApiCalls?: {
    extractionId: number;
  };
}

export function resolveAbsoluteUrl(base: string, relative: string): string {
  const baseUrl = new URL(base);
  const absoluteUrl = new URL(relative, baseUrl);
  return absoluteUrl.href;
}
