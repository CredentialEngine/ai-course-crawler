import { Link } from "wouter";
import { Button } from "../../ui/button";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/utils";
import usePagination from "../usePagination";

const CatalogueListItem = (catalogue: {
  id: number;
  name: string;
  url: string;
  thumbnailUrl?: string | null;
}) => {
  return (
    <TableRow>
      <TableCell className="hidden sm:table-cell">
        {catalogue.thumbnailUrl ? (
          <Link to={`/catalogue/${catalogue.id}`}>
            <img src={catalogue.thumbnailUrl} style={{ maxWidth: "128px" }} />
          </Link>
        ) : null}
      </TableCell>
      <TableCell className="font-medium">
        <Link to={`/catalogue/${catalogue.id}`}>{catalogue.name}</Link>
      </TableCell>
    </TableRow>
  );
};

export default function CatalogueDataList() {
  const { page, PaginationButtons } = usePagination();
  const listQuery = trpc.catalogueData.list.useQuery({ page });

  if (!listQuery.data?.results.length) {
    return (
      <>
        <div className="flex items-center">
          <h1 className="text-lg font-semibold md:text-2xl">Data Library</h1>
        </div>
        <div
          className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm"
          x-chunk="dashboard-02-chunk-1"
        >
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="text-2xl font-bold tracking-tight">
              You haven't configured any catalogues yet!
            </h3>
            <p className="text-sm text-muted-foreground">
              You can start extracting data as soon as you configure one.
            </p>
            <Link to="/new">
              <Button className="mt-4">Add Catalogue</Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  const catalogues = listQuery.data.results;

  return (
    <>
      <div className="w-full flex justify-between items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Data Library</h1>
      </div>
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead colSpan={2}>Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQuery.data?.results.map((catalogue) => (
                <CatalogueListItem key={catalogue.url} {...catalogue} />
              )) || (
                <TableRow>
                  <TableCell colSpan={3}>
                    <div className="flex items-center justify-center">
                      <span className="text-muted-foreground">
                        Loading catalogues...
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {catalogues.length ? (
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
