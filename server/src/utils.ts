import * as cheerio from "cheerio";

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

if (!process.env.ENCRYPTION_KEY)
  throw new Error("Please define an encryption key.");
export const ENCRYPTION_KEY: string = process.env.ENCRYPTION_KEY;

export async function exponentialRetry<T>(
  fn: () => Promise<T>,
  retries: number,
  delay: number = 1000
) {
  let attempt = 0;
  let retryErr: unknown;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      console.log(
        `Exponential retries fn failed with error ${error}. Retrying`
      );
      retryErr = error;
      if (attempt === retries) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, delay * Math.pow(2, attempt))
      );
      attempt++;
    }
  }
  console.log("All retries failed");
  throw retryErr;
}

export function encryptForDb(text: string) {
  const IV = randomBytes(16);
  let cipher = createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), IV);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${encrypted.toString("hex")}:${IV.toString("hex")}`;
}

export function decryptFromDb(text: string) {
  const [value, IV] = text.split(":");
  let encryptedText = Buffer.from(value, "hex");
  let decipher = createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    Buffer.from(IV, "hex")
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

export async function fetchPreview(url: string) {
  const res = await fetch(url);
  const text = await res.text();
  const $ = cheerio.load(text);
  const title = $('meta[name="og:title"]').attr("content") || $("title").text();
  const description = $('meta[name="og:description"]').attr("content");
  const thumbnailUrl =
    $('meta[name="og:image"]').attr("content") || $("img").first().attr("src");

  return { title, thumbnailUrl, description };
}
