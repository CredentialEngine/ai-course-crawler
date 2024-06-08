import { z } from "zod";
import { error, publicProcedure, router } from ".";
import { AppErrors } from "../appErrors";
import {
  createUser,
  deleteUser,
  findAllUsers,
  findUserById,
  generateStrongPassword,
  resetUserPassword,
} from "../data/users";

export const usersRouter = router({
  detail: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
      })
    )
    .query(async (opts) => {
      return findUserById(opts.input.id);
    }),
  list: publicProcedure.query(async (_opts) => {
    return findAllUsers();
  }),
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(2),
        email: z.string().email().min(3).max(400),
      })
    )
    .mutation(async (opts) => {
      const { email, name } = opts.input;
      const generatedPassword = generateStrongPassword(12);
      const user = await createUser(email, generatedPassword, name);
      return {
        user,
        generatedPassword,
      };
    }),
  delete: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
      })
    )
    .mutation(async (opts) => {
      const user = await findUserById(opts.input.id);
      if (!user) {
        throw error("NOT_FOUND", AppErrors.NOT_FOUND, "User not found");
      }
      if (user.id == opts.ctx.user?.id) {
        throw error(
          "BAD_REQUEST",
          AppErrors.BAD_REQUEST,
          "User tried to delete themselves"
        );
      }
      await deleteUser(user.id);
    }),
  resetPassword: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
      })
    )
    .mutation(async (opts) => {
      const user = await findUserById(opts.input.id);
      if (!user) {
        throw error("NOT_FOUND", AppErrors.NOT_FOUND, "User not found");
      }
      const generatedPassword = generateStrongPassword(12);
      await resetUserPassword(user.id, generatedPassword);
      return {
        user,
        generatedPassword,
      };
    }),
  redefinePassword: publicProcedure
    .input(
      z.object({
        password: z.string().min(6),
      })
    )
    .mutation(async (opts) => {
      await resetUserPassword(opts.ctx.user!.id, opts.input.password);
    }),
});
