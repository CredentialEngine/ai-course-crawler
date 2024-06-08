import { z } from "zod";
import { publicProcedure, router } from ".";
import {
  findCatalogueData,
  findCataloguesWithData,
  findDataItems,
} from "../data/catalogueData";

export const catalogueDataRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          page: z.number().int().positive().default(1),
        })
        .default({})
    )
    .query(async (opts) => {
      const { totalItems, items } = await findCataloguesWithData(
        20,
        opts.input.page * 20 - 20
      );
      const totalPages = Math.ceil(totalItems / 20);
      return {
        totalItems,
        totalPages,
        results: items,
      };
    }),
  detail: publicProcedure
    .input(
      z.object({
        catalogueDataId: z.number().int().positive(),
      })
    )
    .query(async (opts) => {
      return findCatalogueData(opts.input.catalogueDataId);
    }),
  courses: publicProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        catalogueDataId: z.number().int().positive(),
      })
    )
    .query(async (opts) => {
      const { totalItems, items } = await findDataItems(
        opts.input.catalogueDataId,
        20,
        opts.input.page * 20 - 20
      );
      const totalPages = Math.ceil(totalItems / 20);
      return {
        totalItems,
        totalPages,
        results: items,
      };
    }),
});
