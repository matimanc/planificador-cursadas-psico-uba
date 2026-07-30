import { describe, expect, it } from "vitest";
import { layoutDayItems } from "../calendarLayout";

describe("layoutDayItems", () => {
  it("gives non-overlapping items full width (1 column)", () => {
    const items = [
      { id: "a", startMin: 60, endMin: 120 },
      { id: "b", startMin: 120, endMin: 180 },
    ];
    const laidOut = layoutDayItems(items);
    for (const { totalCols, col } of laidOut) {
      expect(totalCols).toBe(1);
      expect(col).toBe(0);
    }
  });

  it("splits two overlapping items into two side-by-side columns", () => {
    const items = [
      { id: "a", startMin: 60, endMin: 120 },
      { id: "b", startMin: 90, endMin: 150 },
    ];
    const laidOut = layoutDayItems(items);
    expect(laidOut.every((l) => l.totalCols === 2)).toBe(true);
    const cols = laidOut.map((l) => l.col).sort();
    expect(cols).toEqual([0, 1]);
  });

  it("keeps a third, later, non-overlapping item in its own single-column cluster", () => {
    const items = [
      { id: "a", startMin: 60, endMin: 120 },
      { id: "b", startMin: 90, endMin: 150 },
      { id: "c", startMin: 200, endMin: 260 },
    ];
    const laidOut = layoutDayItems(items);
    const c = laidOut.find((l) => l.item.id === "c")!;
    expect(c.totalCols).toBe(1);
    expect(c.col).toBe(0);
  });

  it("packs a long item plus two shorter non-overlapping siblings into 2 columns", () => {
    // b and c don't overlap each other (b ends exactly when c starts), so they
    // can share a column; only "a" (which overlaps both) needs a column of its own.
    const items = [
      { id: "a", startMin: 60, endMin: 180 },
      { id: "b", startMin: 70, endMin: 100 },
      { id: "c", startMin: 100, endMin: 130 },
    ];
    const laidOut = layoutDayItems(items);
    expect(laidOut.every((l) => l.totalCols === 2)).toBe(true);
    const colOf = (id: string) => laidOut.find((l) => l.item.id === id)!.col;
    expect(colOf("a")).not.toBe(colOf("b"));
    expect(colOf("b")).toBe(colOf("c"));
  });

  it("gives three fully mutually overlapping items three columns", () => {
    const items = [
      { id: "a", startMin: 60, endMin: 180 },
      { id: "b", startMin: 70, endMin: 170 },
      { id: "c", startMin: 80, endMin: 160 },
    ];
    const laidOut = layoutDayItems(items);
    expect(laidOut.every((l) => l.totalCols === 3)).toBe(true);
    const cols = laidOut.map((l) => l.col).sort();
    expect(cols).toEqual([0, 1, 2]);
  });
});
