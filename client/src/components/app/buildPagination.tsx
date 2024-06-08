import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";

export interface PaginationOutput {
  totalItems: number;
  totalPages: number;
  results: any[];
}

export default function buildPagination(
  page: number,
  pageSetter: (i: number) => void,
  output: PaginationOutput
) {
  const firstPageItem = (page - 1) * 20 + 1;
  const lastPageItem =
    page == output.totalPages ? output.totalItems : page * 20;
  const totalItems = output.totalItems || 0;

  const decreasePage: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    e.preventDefault();
    if (page > 1) {
      pageSetter(page - 1);
    }
  };

  const increasePage: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    e.preventDefault();
    if (page + 1 <= output.totalPages) {
      pageSetter(page + 1);
    }
  };

  const PaginationButtons = (
    <div className="w-full">
      <div className="mx-auto flex w-full text-xs text-muted-foreground">
        Showing&nbsp;<strong>{firstPageItem}</strong>-
        <strong>{lastPageItem}</strong>&nbsp;of&nbsp;
        <strong>{totalItems}</strong>&nbsp;records
      </div>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" onClick={decreasePage} />
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" onClick={increasePage} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );

  return {
    firstPageItem,
    lastPageItem,
    totalItems,
    PaginationButtons,
  };
}
