import { FileRejection, useDropzone } from "react-dropzone";

export function CSVDropzone({
  className,
  onFileDrop,
  onFilesDrop,
  multiple = false,
}: {
  className?: string;
  onFileDrop?: (file: File) => void;
  onFilesDrop?: (files: File[]) => void;
  multiple?: boolean;
}) {
  const onDrop = (acceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      console.log(fileRejections);
    }
    if (multiple && onFilesDrop) {
      onFilesDrop(acceptedFiles);
    } else if (onFileDrop) {
      onFileDrop(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragReject } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
    },
    multiple,
  });

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={
          "w-full h-full flex flex-col gap-4 items-center justify-center border-muted-foreground/50 border-dashed border-2 p-2 rounded-md"
        }
      >
        <input {...getInputProps()} />
        {isDragReject ? (
          <p className={"text-destructive-foreground"}>
            Only CSV files are allowed.
          </p>
        ) : (
          <p className={"text-muted-foreground text-sm"}>
            {multiple
              ? "Drop CSVs here, or click to select."
              : "Drop a CSV here, or click to select."}
          </p>
        )}
      </div>
    </div>
  );
}
