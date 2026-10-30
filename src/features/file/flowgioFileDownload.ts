export function downloadFlowgioFile(content: string, filename = "diagram.flowgio"): void {
  const blob = new Blob([content], {
    type: "application/json;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);

  anchor.click();

  anchor.remove();

  URL.revokeObjectURL(url);
}
