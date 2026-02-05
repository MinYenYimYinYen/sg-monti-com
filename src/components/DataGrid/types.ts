import { ColumnDef, Row, ColumnResizeMode } from "@tanstack/react-table";

export interface DataGridProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enablePagination?: boolean;
  enableColumnVisibility?: boolean;
  enableRowExpansion?: boolean;
  enableColumnResizing?: boolean;
  columnResizeMode?: ColumnResizeMode;
  getRowCanExpand?: (row: Row<TData>) => boolean;
  renderSubComponent?: (row: Row<TData>) => React.ReactNode;
  rowVariant?: "default" | "alternating" | "expandable";
  pageSize?: number;
  className?: string;
  globalFilterColumns?: (keyof TData & string)[];
  globalFilterPlaceholder?: string;
}
