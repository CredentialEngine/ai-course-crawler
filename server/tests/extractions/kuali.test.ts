import { describe, test } from "vitest";
import { assertExtraction, EXTRACTION_TIMEOUT } from "..";

describe("Kuali", { timeout: EXTRACTION_TIMEOUT }, () => {
  test("BYU-Idaho", async () => {
    await assertExtraction(
      "https://www.byui.edu/catalog/#/courses/414Six2j-?bc=true&bcCurrent=ACCTG100%20-%20Introduction%20to%20Accounting&bcGroup=Accounting&bcItemType=courses",
      [
        {
          course_id: "ACCTG100",
          course_name: "Introduction to Accounting",
          course_description:
            "This course is the first university-level accounting course most accounting students will take.  It highlights the five major fields of accounting: the accounting cycle, business decision-making, taxation, fraud detection and prevention, and financial statement analysis.  Students gain knowledge and practice in each of these fundamental fields as part of a learning team using case studies and experiential learning." +
            "Upon completion of this course, students will have a clear understanding of the opportunities available to graduates with a degree in accounting, the different career paths available, and the effort required to successfully complete the accounting major at BYU-Idaho.",
          course_credits_min: 2,
          course_credits_max: 2,
          course_credits_type: undefined,
        },
      ]
    );
  });
});
