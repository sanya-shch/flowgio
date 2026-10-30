export interface HistoryOptions<T> {
  /** Maximum number of undo steps kept (default 100). */
  maxEntries?: number;

  /**
   * Total "weight" budget across the undo and redo stacks. Together with
   * `weigh` this bounds memory for large snapshots: a diagram with thousands
   * of nodes keeps fewer steps than a small one. The most recent undo step is
   * always kept, even if it alone exceeds the budget.
   */
  maxWeight?: number;

  /** Approximate size of one snapshot, in the same unit as `maxWeight`. */
  weigh?: (snapshot: T) => number;
}

interface Entry<T> {
  snapshot: T;
  weight: number;
}

export class History<T> {
  private past: Entry<T>[] = [];
  private future: Entry<T>[] = [];
  private totalWeight = 0;

  private readonly maxEntries: number;
  private readonly maxWeight: number;
  private readonly weigh: (snapshot: T) => number;

  constructor(maxEntries = 100, options: Omit<HistoryOptions<T>, "maxEntries"> = {}) {
    this.maxEntries = maxEntries;
    this.maxWeight = options.maxWeight ?? Number.POSITIVE_INFINITY;
    this.weigh = options.weigh ?? (() => 0);
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  /** Number of undo steps currently stored (useful for tests and diagnostics). */
  get undoDepth(): number {
    return this.past.length;
  }

  push(snapshot: T): void {
    this.addToPast(this.createEntry(snapshot));

    this.dropFuture();
    this.trim();
  }

  undo(current: T): T | null {
    const previous = this.past.pop();

    if (previous === undefined) {
      return null;
    }

    this.totalWeight -= previous.weight;

    this.addToFuture(this.createEntry(current));
    this.trim();

    return previous.snapshot;
  }

  redo(current: T): T | null {
    const next = this.future.pop();

    if (next === undefined) {
      return null;
    }

    this.totalWeight -= next.weight;

    this.addToPast(this.createEntry(current));
    this.trim();

    return next.snapshot;
  }

  clear(): void {
    this.past = [];
    this.future = [];
    this.totalWeight = 0;
  }

  private createEntry(snapshot: T): Entry<T> {
    return { snapshot, weight: this.weigh(snapshot) };
  }

  private addToPast(entry: Entry<T>): void {
    this.past.push(entry);
    this.totalWeight += entry.weight;
  }

  private addToFuture(entry: Entry<T>): void {
    this.future.push(entry);
    this.totalWeight += entry.weight;
  }

  private dropFuture(): void {
    this.future = [];
    this.totalWeight = this.past.reduce((sum, entry) => sum + entry.weight, 0);
  }

  /*
   * Drops the oldest steps first: the bottom of the undo stack, then the
   * bottom (furthest) of the redo stack. Never drops the last step of a stack.
   */
  private trim(): void {
    while (this.past.length > this.maxEntries) {
      this.totalWeight -= this.past.shift()!.weight;
    }

    while (this.totalWeight > this.maxWeight) {
      if (this.past.length > 1) {
        this.totalWeight -= this.past.shift()!.weight;
      } else if (this.future.length > 1) {
        this.totalWeight -= this.future.shift()!.weight;
      } else {
        break;
      }
    }
  }
}
