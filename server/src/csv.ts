import { format } from "fast-csv";
import { Transform } from "stream";
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

async function buildCsv(csvStream: Transform, extractionId: number) {
  try {
    let offset = 0;
    let limit = 100;

    while (true) {
      const { items } = await findDataItems(extractionId, limit, offset, true);
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
    csvStream.emit("error", err);
  } finally {
    csvStream.end();
  }
}

export function streamCsv(extractionId: number) {
  const csvStream = format({ headers: true });
  buildCsv(csvStream, extractionId);
  return csvStream;
}
