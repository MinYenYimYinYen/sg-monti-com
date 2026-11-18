/** Saves `text` as a file through the browser. Client only: it needs `document` and `URL`. */
export function downloadTextFile({
  text,
  fileName,
  mimeType,
}: {
  text: string;
  fileName: string;
  mimeType: string;
}): void {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
