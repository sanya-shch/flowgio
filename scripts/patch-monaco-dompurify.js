import { writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { URL } from "node:url";

const modulePath = fileURLToPath(
  new URL(
    "../node_modules/monaco-editor/esm/vs/base/browser/dompurify/dompurify.js",
    import.meta.url,
  ),
);

await writeFile(modulePath, "export { default } from 'dompurify';\n");

const { default: DOMPurify } = await import(pathToFileURL(modulePath).href);

if (DOMPurify.version !== "3.4.17") {
  throw new Error(`Unexpected DOMPurify version: ${DOMPurify.version}`);
}
