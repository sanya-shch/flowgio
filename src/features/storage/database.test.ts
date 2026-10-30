import "fake-indexeddb/auto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { INDEXED_DB_UNAVAILABLE_MESSAGE } from "./storageError";
import { openDatabase } from "./database";

describe("openDatabase", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects with a clear error when IndexedDB is unavailable", async () => {
    vi.stubGlobal("indexedDB", undefined);

    await expect(openDatabase()).rejects.toThrow(INDEXED_DB_UNAVAILABLE_MESSAGE);
  });

  it("resolves with a database when IndexedDB is available", async () => {
    const database = await openDatabase();

    expect(database.name).toBe("flowgio");

    database.close();
  });
});
