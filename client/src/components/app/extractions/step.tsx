import BreadcrumbTrail from "@/components/ui/breadcrumb-trail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import JsonPopover from "@/components/ui/jsonPopover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PAGE_DATA_TYPE, concisePrintDate, trpc } from "@/utils";
import { useState } from "react";
import { Link, useParams } from "wouter";
import buildPagination from "../buildPagination";
import { displayStepType } from "./utils";

function displayDataType(dataType: PAGE_DATA_TYPE) {
  switch (dataType) {
    case PAGE_DATA_TYPE.COURSE_DETAIL_PAGE:
      return "Course Detail";
    case PAGE_DATA_TYPE.CATEGORY_PAGE:
      return "Category Page";
    case PAGE_DATA_TYPE.COURSE_LINKS_PAGE:
      return "Course Links";
  }
}

export default function ExtractionStepDetail() {
  let { extractionId, stepId } = useParams();
  const [page, setPage] = useState(1);
  const extractionQuery = trpc.extractions.detail.useQuery(
    { id: parseInt(extractionId || "") },
    { enabled: !!extractionId }
  );
  const stepQuery = trpc.extractions.stepDetail.useQuery(
    { stepId: parseInt(stepId || ""), page },
    { enabled: !!extractionId && !!stepId }
  );

  if (!extractionQuery.data || !stepQuery.data) {
    return null;
  }

  const breadCrumbs = [
    { label: "Extractions", href: "/" },
    { label: `Extraction #${extractionId}`, href: `/${extractionId}` },
  ];

  const step = stepQuery.data.extractionStep;
  const items = stepQuery.data.extractionStepItems.results;

  const { PaginationButtons } = buildPagination(
    page,
    setPage,
    stepQuery.data.extractionStepItems
  );

  return (
    <>
      <BreadcrumbTrail items={breadCrumbs} />
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">
          Extraction Step #{step.id}
        </h1>
      </div>
      <div className="border p-4 rounded-md">
        <div className="text-sm text-muted-foreground mb-2">Step Type</div>
        <div>{displayStepType(step.step)}</div>
      </div>
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Data Type</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Metadata</TableHead>
                <TableHead>Navigation Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={`step-item-${item.id}`}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>
                    {displayDataType(item.dataType as PAGE_DATA_TYPE)}
                  </TableCell>
                  <TableCell>{concisePrintDate(item.createdAt)}</TableCell>
                  <TableCell className="max-w-40 overflow-hidden whitespace-nowrap text-ellipsis text-blue-800 underline">
                    <a href={item.url} target="_blank">
                      {item.url}
                    </a>
                  </TableCell>
                  <TableCell>
                    <Button variant={"outline"} size={"sm"} asChild>
                      <Link
                        to={`/${extractionId}/steps/${stepId}/items/${item.id}`}
                      >
                        View
                      </Link>
                    </Button>
                  </TableCell>
                  <TableCell>
                    {item.metadata ? (
                      <JsonPopover jsonData={item.metadata} />
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {item.navigationData ? (
                      <JsonPopover jsonData={item.navigationData} />
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        {items.length > 0 ? <CardFooter>{PaginationButtons}</CardFooter> : null}
      </Card>
    </>
  );
}
