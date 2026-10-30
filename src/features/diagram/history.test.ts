import { describe, expect, it } from "vitest";

import { History } from "./history";

describe("History", () => {
  it("starts with empty undo and redo stacks", () => {
    const history = new History<string>();

    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
  });

  it("allows undo after pushing snapshots", () => {
    const history = new History<string>();

    history.push("A");
    history.push("B");
    history.push("C");

    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);

    expect(history.undo("D")).toBe("C");
    expect(history.undo("C")).toBe("B");
    expect(history.undo("B")).toBe("A");

    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(true);
  });

  it("allows redo after undo", () => {
    const history = new History<string>();

    history.push("A");
    history.push("B");
    history.push("C");

    expect(history.undo("D")).toBe("C");
    expect(history.undo("C")).toBe("B");

    expect(history.redo("B")).toBe("C");
    expect(history.redo("C")).toBe("D");

    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);
  });

  it("returns null when undo is not available", () => {
    const history = new History<string>();

    expect(history.undo("A")).toBeNull();
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
  });

  it("returns null when redo is not available", () => {
    const history = new History<string>();

    history.push("A");

    expect(history.redo("A")).toBeNull();
    expect(history.canRedo).toBe(false);
  });

  it("clears redo history after a new change", () => {
    const history = new History<string>();

    history.push("A");
    history.push("B");
    history.push("C");

    expect(history.undo("D")).toBe("C");
    expect(history.canRedo).toBe(true);

    history.push("C");

    expect(history.canRedo).toBe(false);
  });

  it("does not allow old redo states after a new change", () => {
    const history = new History<string>();

    history.push("A");
    history.push("B");
    history.push("C");

    expect(history.undo("D")).toBe("C");

    history.push("C");

    expect(history.redo("C")).toBeNull();
  });

  it("supports multiple undo and redo operations", () => {
    const history = new History<string>();

    history.push("A");
    history.push("B");
    history.push("C");
    history.push("D");

    expect(history.undo("E")).toBe("D");
    expect(history.undo("D")).toBe("C");

    expect(history.redo("C")).toBe("D");
    expect(history.redo("D")).toBe("E");

    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);
  });

  it("respects the maximum history size", () => {
    const history = new History<string>(3);

    history.push("A");
    history.push("B");
    history.push("C");
    history.push("D");

    expect(history.undo("D")).toBe("D");
    expect(history.undo("D")).toBe("C");
    expect(history.undo("C")).toBe("B");
    expect(history.undo("B")).toBeNull();
  });

  it("clears both undo and redo history", () => {
    const history = new History<string>();

    // States:
    // A → B → C
    // History stores previous states: [A, B]

    history.push("A");
    history.push("B");

    // Current state is C, undo should restore B.
    expect(history.undo("C")).toBe("B");

    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(true);

    history.clear();

    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
  });

  it("moves states between undo and redo stacks", () => {
    const history = new History<string>();

    history.push("A");
    history.push("B");

    expect(history.undo("C")).toBe("B");
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(true);

    expect(history.redo("B")).toBe("C");
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);
  });
});

describe("History memory budget", () => {
  const weigh = (value: string) => value.length;

  it("evicts the oldest steps once the weight budget is exceeded", () => {
    const history = new History<string>(100, { maxWeight: 10, weigh });

    history.push("aaaa");
    history.push("bbbb");
    history.push("cccc"); // 12 > 10 -> oldest dropped

    expect(history.undoDepth).toBe(2);
    expect(history.undo("current")).toBe("cccc");
    expect(history.undo("cccc")).toBe("bbbb");
    expect(history.canUndo).toBe(false);
  });

  it("always keeps the most recent step, even if it alone is over budget", () => {
    const history = new History<string>(100, { maxWeight: 3, weigh });

    history.push("a-very-large-snapshot");

    expect(history.undoDepth).toBe(1);
    expect(history.undo("now")).toBe("a-very-large-snapshot");
  });

  it("counts the redo stack against the budget", () => {
    const history = new History<string>(100, { maxWeight: 12, weigh });

    history.push("aaaa");
    history.push("bbbb");

    history.undo("cccc"); // past: aaaa, future: cccc  (8 total)
    history.undo("bbbb"); // past: -,    future: cccc, bbbb (8 total)

    expect(history.canRedo).toBe(true);
    expect(history.redo("aaaa")).toBe("bbbb");
    expect(history.redo("bbbb")).toBe("cccc");
  });

  it("drops the redo stack on a new push and recomputes the weight", () => {
    const history = new History<string>(100, { maxWeight: 8, weigh });

    history.push("aaaa");
    history.undo("bbbb");
    history.push("cccc");

    expect(history.canRedo).toBe(false);

    history.push("dddd"); // 8, still within budget

    expect(history.undoDepth).toBe(2);
  });

  it("still honours the entry count limit", () => {
    const history = new History<string>(3, { maxWeight: 1_000, weigh });

    for (const value of ["a", "b", "c", "d", "e"]) {
      history.push(value);
    }

    expect(history.undoDepth).toBe(3);
  });

  it("keeps behaving as before without options", () => {
    const history = new History<string>(2);

    history.push("a");
    history.push("b");
    history.push("c");

    expect(history.undoDepth).toBe(2);
  });
});
