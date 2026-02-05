import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/style/utils";

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, style, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      style={{ tableLayout: "fixed", ...style }}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const tableRowVariants = cva(
  "border-b transition-colors data-[state=selected]:bg-muted",
  {
    variants: {
      variant: {
        default: "hover:bg-muted/50",
        alternating: "even:bg-green-50 odd:bg-white hover:bg-green-100",
        expandable: "cursor-pointer hover:bg-muted/50",
        selected: "bg-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface TableRowProps
  extends React.HTMLAttributes<HTMLTableRowElement>,
    VariantProps<typeof tableRowVariants> {}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, variant, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(tableRowVariants({ variant }), className)}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  enableColumnResizing?: boolean;
  header?: any; // TanStack Table Header type
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, enableColumnResizing, header, children, style, ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={cn(
          "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
          enableColumnResizing && "relative",
          className
        )}
        style={style}
        {...props}
      >
        {children}
        {enableColumnResizing && header && (
          <div
            onMouseDown={header.getResizeHandler()}
            onTouchStart={header.getResizeHandler()}
            onDoubleClick={() => header.column.resetSize()}
            className={cn(
              "absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none z-10",
              "bg-border opacity-0 hover:opacity-100 hover:bg-primary/50 transition-opacity",
              header.column.getIsResizing() && "opacity-100 bg-primary"
            )}
          />
        )}
      </th>
    );
  }
);
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, children, ...props }, ref) => {
  // Extract text content for title attribute
  const textContent = React.useMemo(() => {
    if (typeof children === 'string' || typeof children === 'number') {
      return String(children);
    }
    return undefined;
  }, [children]);

  return (
    <td
      ref={ref}
      className={cn(
        "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      title={textContent}
      {...props}
    >
      <div className="truncate">{children}</div>
    </td>
  );
})
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  tableRowVariants,
};
