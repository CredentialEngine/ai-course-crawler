import { hash } from "argon2";
import { eq } from "drizzle-orm";
import db from "../data";
import { users } from "./schema";

export function generateStrongPassword(length: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}|;:,.<>?";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars[randomIndex];
  }
  return password;
}

export async function findUserById(
  id: number,
  includePassword: boolean = false
) {
  const columns = includePassword
    ? undefined
    : {
        password: false,
      };
  return db.query.users.findFirst({
    columns,
    where: (users, { eq }) => eq(users.id, id),
  });
}

export async function findUserByEmail(
  email: string,
  includePassword: boolean = false
) {
  const columns = includePassword
    ? undefined
    : {
        password: false,
      };
  return db.query.users.findFirst({
    columns,
    where: (users, { eq }) => eq(users.email, email),
  });
}

export async function findAllUsers() {
  return db.query.users.findMany({
    columns: {
      password: false,
    },
    orderBy: (u) => u.createdAt,
  });
}

export async function getAllEmailAddresses() {
  const emails = await db.query.users.findMany({
    columns: {
      email: true,
    },
    orderBy: (u) => u.createdAt,
  });
  return emails.map((e) => e.email);
}

export async function createUser(
  email: string,
  password: string,
  name: string
) {
  const encryptedPassword = await hash(password);
  const result = await db
    .insert(users)
    .values({ email, password: encryptedPassword, name })
    .returning();
  return { ...result[0], password: undefined };
}

export async function deleteUser(id: number) {
  return db.delete(users).where(eq(users.id, id));
}

export async function resetUserPassword(id: number, password: string) {
  const encryptedPassword = await hash(password);
  const result = await db
    .update(users)
    .set({ password: encryptedPassword })
    .where(eq(users.id, id))
    .returning();
  return { ...result[0], password: undefined };
}
