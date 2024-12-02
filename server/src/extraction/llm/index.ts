import { SimplifiedMarkdown } from "../../types";

export interface DefaultLlmPageOptions {
  content: SimplifiedMarkdown;
  url: string;
  screenshot: string;
  logApiCalls?: {
    extractionId: number;
  };
  additionalContext?: {
    message: string;
    context?: string[];
  };
}

export function resolveAbsoluteUrl(base: string, relative: string): string {
  const baseUrl = new URL(base);
  const absoluteUrl = new URL(relative, baseUrl);
  return absoluteUrl.href;
}
