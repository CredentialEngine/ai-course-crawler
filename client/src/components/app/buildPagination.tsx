import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
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
    page === output.totalPages ? output.totalItems : page * 20;
  const totalItems = output.totalItems || 0;

  const changePage = (newPage: number) => {
    if (newPage >= 1 && newPage <= output.totalPages) {
      pageSetter(newPage);
    }
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;

    let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(output.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <PaginationItem key={i}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              changePage(i);
            }}
            className={i === page ? "active" : ""}
            isActive={page === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return pageNumbers;
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
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                changePage(1);
              }}
              className={page === 1 ? "disabled" : ""}
            >
              First
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                changePage(page - 1);
              }}
              className={page === 1 ? "disabled" : ""}
            />
          </PaginationItem>
          {renderPageNumbers()}
          {output.totalPages > 5 && page + 3 < output.totalPages && (
            <PaginationEllipsis />
          )}
          {output.totalPages > 5 && page + 2 < output.totalPages && (
            <PaginationItem>
              <PaginationLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  changePage(output.totalPages);
                }}
                className={page === output.totalPages ? "disabled" : ""}
              >
                {output.totalPages}
              </PaginationLink>
            </PaginationItem>
          )}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                changePage(page + 1);
              }}
              className={page === output.totalPages ? "disabled" : ""}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                changePage(output.totalPages);
              }}
              className={page === output.totalPages ? "disabled" : ""}
            >
              Last
            </PaginationLink>
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
