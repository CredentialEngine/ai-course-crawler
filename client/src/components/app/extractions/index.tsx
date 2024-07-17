import { Button } from "@/components/ui/button";
import { IterableElement, prettyPrintDate, RouterOutput, trpc } from "@/utils";
import { Earth } from "lucide-react";
import { Link } from "wouter";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import usePagination from "../usePagination";

type ExtractionSummary = IterableElement<
  RouterOutput["extractions"]["list"]["results"]
>;

const ExtractionListItem = (extraction: ExtractionSummary) => {
  const catalogue = extraction.recipe.catalogue;
  return (
    <TableRow>
      <TableCell colSpan={2} className="">
        <Link to={`/${extraction.id}`}>
          <div className="flex items-center gap-4">
            {catalogue.thumbnailUrl ? (
              <img src={catalogue.thumbnailUrl} style={{ maxHeight: "30px" }} />
            ) : null}
            {catalogue.name}
          </div>
        </Link>
      </TableCell>
      <TableCell className="font-medium">
        <Link to={`/${extraction.id}`}>Courses</Link>
      </TableCell>
      <TableCell className="text-xs">
        {prettyPrintDate(extraction.createdAt)}
      </TableCell>
    </TableRow>
  );
};

export default function Extractions() {
  const { page, PaginationButtons } = usePagination();
  const listQuery = trpc.extractions.list.useQuery({ page });

  if (!listQuery.data?.results.length) {
    return (
      <>
        <div className="flex items-center">
          <h1 className="text-lg font-semibold md:text-2xl">Extractions</h1>
        </div>
        <div
          className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm"
          x-chunk="dashboard-02-chunk-1"
        >
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="text-2xl font-bold tracking-tight">
              No extractions have been created yet!
            </h3>
            <p className="text-sm text-muted-foreground">
              Select a catalogue to start an extraction.
            </p>
            <Link to="~/catalogues">
              <Button className="mt-4">
                <Earth className="h-5 w-5 mr-2" />
                Catalogues
              </Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="w-full flex justify-between items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Extractions</h1>
      </div>
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead colSpan={2}>Catalogue</TableHead>
                <TableHead>Extraction Type</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQuery.data?.results.map((extraction) => (
                <ExtractionListItem key={extraction.id} {...extraction} />
              )) || (
                <TableRow>
                  <TableCell colSpan={3}>
                    <div className="flex items-center justify-center">
                      Loading extractions...
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {listQuery.data!.results.length > 0 ? (
          <CardFooter>
            <PaginationButtons
              totalItems={listQuery.data.totalItems}
              totalPages={listQuery.data.totalPages}
            />
          </CardFooter>
        ) : null}
      </Card>
    </>
  );
}
