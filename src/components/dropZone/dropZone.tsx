import { FileRejection, useDropzone } from "react-dropzone";

export function CSVDropzone({
  className,
  onFileDrop,
}: {
  className?: string;
  onFileDrop: (file: File) => void;
}) {
  const onDrop = (acceptedFiles: File[], fileRejections: FileRejection[]) => {
    console.log(acceptedFiles);
    onFileDrop(acceptedFiles[0]);
    if (fileRejections.length > 0) {
      console.log(fileRejections);
    }
  };

  const { getRootProps, getInputProps, isDragReject } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
    },
    multiple: false,
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
            Drop a CSV here, or click to select.
          </p>
        )}
      </div>
    </div>
  );
}
