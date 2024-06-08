import { createTRPCReact } from "@trpc/react-query";
import type { inferRouterOutputs } from "@trpc/server";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type {
  AppRouter,
  CourseStructuredData,
  DetectConfigurationProgress,
  RecipeConfiguration,
} from "../../server/src/appRouter";

export enum PAGE_DATA_TYPE {
  COURSE_DETAIL_PAGE = "COURSE_DETAIL_PAGE",
  CATEGORY_PAGE = "CATEGORY_PAGE",
  COURSE_LINKS_PAGE = "COURSE_LINKS_PAGE",
}

export {
  AppRouter,
  CourseStructuredData,
  DetectConfigurationProgress,
  RecipeConfiguration,
};
export const trpc = createTRPCReact<AppRouter>();
export type ItemType<T> = T extends (infer U)[] ? U : never;
export type RouterOutput = inferRouterOutputs<AppRouter>;
export type Catalogue = Exclude<
  RouterOutput["catalogues"]["detail"],
  undefined
>;
export type Recipe = Exclude<RouterOutput["recipes"]["detail"], undefined>;
export type Extraction = Exclude<
  RouterOutput["extractions"]["detail"],
  undefined
>;
export type ExtractionStep = ItemType<Extraction["extractionSteps"]>;
export type ExtractionStepItem = ItemType<
  RouterOutput["extractions"]["stepDetail"]["extractionStepItems"]["results"]
>;
export type DataItem = ItemType<
  RouterOutput["catalogueData"]["courses"]["results"]
>;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function prettyPrintDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function concisePrintDate(dateStr: string) {
  const date = new Date(dateStr);
  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0") +
    " " +
    String(date.getHours()).padStart(2, "0") +
    ":" +
    String(date.getMinutes()).padStart(2, "0")
  );
}

export function prettyPrintJson(json: Record<string, any>) {
  return JSON.stringify(json, null, "  ");
}

export async function copyToClipboard(text: string) {
  return navigator.clipboard.writeText(text);
}
