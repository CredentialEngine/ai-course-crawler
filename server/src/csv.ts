import { format } from "fast-csv";
import { PassThrough } from "stream";
import { findDataItems } from "./data/datasets";

// csvStream.write([
//   "External Identifier",
//   "Learning Type",
//   "Learning Opportunity Name",
//   "Description",
//   "Subject Webpage",
//   "Life Cycle Status Type",
//   "Language",
//   "Available Online At",
//   "Credits (Min)",
//   "Credits (Max)",
//   "Prerequisites",
// ]);

export async function buildCsv(extractionId: number) {
  const stream = new PassThrough();
  const csvStream = format({ headers: true });
  csvStream.pipe(stream);

  (async () => {
    try {
      let offset = 0;
      let limit = 100;

      while (true) {
        const { items } = await findDataItems(
          extractionId,
          limit,
          offset,
          true
        );
        if (!items.length) {
          break;
        }
        for (const item of items) {
          csvStream.write(item.structuredData);
        }
        offset += limit;
      }

      csvStream.end();
    } catch (err) {
      stream.emit("error", err);
    } finally {
      csvStream.end();
    }
  })();

  return stream;
}
