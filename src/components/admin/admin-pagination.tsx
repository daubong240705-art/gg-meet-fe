import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

type AdminPaginationProps = {
  page: number;
  totalPages: number;
  totalElements: number;
  isFetching?: boolean;
  onPageChange: (page: number) => void;
};

export function AdminPagination({
  page,
  totalPages,
  totalElements,
  isFetching = false,
  onPageChange,
}: AdminPaginationProps) {
  const safeTotalPages = Math.max(totalPages, 1);
  const isFirstPage = page <= 0;
  const isLastPage = page >= safeTotalPages - 1;

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        {totalElements.toLocaleString()} total · Page {Math.min(page + 1, safeTotalPages)} of {safeTotalPages}
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(page - 1, 0))}
          disabled={isFirstPage || isFetching}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={isLastPage || isFetching}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
