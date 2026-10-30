export const APP_NAME = "Flowgio";

export function setDocumentTitle(title?: string) {
  document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
}
