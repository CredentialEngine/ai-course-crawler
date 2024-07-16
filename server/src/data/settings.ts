import db from "../data";
import { encryptForDb, settings } from "../data/schema";

export async function findSettings() {
  return db.query.settings.findMany();
}

export async function createOrUpdate(
  key: string,
  value: string,
  isEncrypted: boolean = false,
  encryptedPreview: string | null
) {
  value = isEncrypted ? encryptForDb(value) : value;
  return db
    .insert(settings)
    .values({
      key,
      value,
      isEncrypted,
      encryptedPreview,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, isEncrypted, encryptedPreview },
    });
}
