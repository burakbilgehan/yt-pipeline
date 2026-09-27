/**
 * matrix: a small table, 2 to 5 rows by 2 to 4 columns. Row labels are captions at the left,
 * column heads are captions, numbers are value type and right-aligned in their column (tabular),
 * text values are body. Rows snap in from the left, one after another, separated by grid rules.
 * On cue "highlight" (default: after the last row) the highlighted row gets a surface plate and
 * highlight label, or the highlighted cell a highlight plate with bg ink.
 */
import React from "react";
import { useCurrentFrame } from "remotion";
import { COLOR, DUR, EASE, LAYOUT, MOTION, SHAPE, body, caption, value as valueStyle } from "../tokens";
import { progress } from "../motion";
import { Layer, Snap } from "../ui";

export interface MatrixProps {
  columns: string[];
  rows: Array<{ label: string; values: Array<number | string> }>;
  highlightCell?: [number, number];
  highlightRow?: number;
  highlightAt?: number;
}

const { content } = LAYOUT;
const LABEL_W = 460;
/** Value columns are at most this wide and sit against the right margin, so short tables do not spread thin. */
const COL_MAX = 380;
const HEAD_H = 64;
const PAD = 24;

function show(v: number | string): string {
  return typeof v === "number" ? v.toLocaleString("en-US", { maximumFractionDigits: 2 }) : v;
}

export const Matrix: React.FC<MatrixProps> = ({ columns, rows, highlightCell, highlightRow, highlightAt }) => {
  const frame = useCurrentFrame();
  const rowH = Math.min(120, Math.floor((content.bottom - content.top - HEAD_H - 80) / rows.length));
  const tableH = HEAD_H + rows.length * rowH;
  const top = Math.round(content.top + (content.bottom - content.top - tableH) / 2);
  const colW = Math.min(COL_MAX, (content.right - content.left - LABEL_W) / columns.length);
  const colsLeft = content.right - columns.length * colW;
  const rowAt = (r: number) => 6 + r * 5;
  const lightAt = Math.max(highlightAt ?? rowAt(rows.length - 1) + 24, rowAt(rows.length - 1) + DUR.snap);
  const light = progress(frame, lightAt, DUR.snap, EASE.hard);
  // Numbers and short strings ("29%") are right-aligned in their column; longer text is left-aligned.
  const numeric = (c: number) => rows.every((r) => typeof r.values[c] === "number" || String(r.values[c]).length <= 8);

  return (
    <Layer frame={frame} z={MOTION.z.measure} flat>
      {/* highlight plate behind the row or cell */}
      {highlightRow !== undefined && light > 0 && (
        <div
          style={{
            position: "absolute",
            left: content.left - PAD,
            top: top + HEAD_H + highlightRow * rowH + 6,
            width: (content.right - content.left + 2 * PAD) * light,
            height: rowH - 12,
            borderRadius: SHAPE.radius,
            background: COLOR.surface2,
          }}
        />
      )}
      {highlightCell && light > 0 && (
        <div
          style={{
            position: "absolute",
            left: colsLeft + highlightCell[1] * colW + 8,
            top: top + HEAD_H + highlightCell[0] * rowH + 6,
            width: colW - 16,
            height: rowH - 12,
            borderRadius: SHAPE.radius,
            background: COLOR.highlight,
            transform: `scale(${(0.9 + 0.1 * light).toFixed(3)})`,
            opacity: light,
          }}
        />
      )}

      {/* column heads */}
      {columns.map((c, i) => (
        <div
          key={c}
          style={{
            position: "absolute",
            left: colsLeft + i * colW,
            width: colW - PAD,
            top,
            height: HEAD_H,
            display: "flex",
            alignItems: "center",
            justifyContent: numeric(i) ? "flex-end" : "flex-start",
            paddingLeft: numeric(i) ? 0 : 8,
            opacity: progress(frame, 0, 8, EASE.settle),
            ...caption("xs", COLOR.textTertiary),
          }}
        >
          {c}
        </div>
      ))}
      <div style={{ position: "absolute", left: content.left, top: top + HEAD_H - 1, width: (content.right - content.left) * progress(frame, 0, 16, EASE.move), height: 2, background: COLOR.textTertiary, opacity: 0.6 }} />

      {rows.map((row, r) => {
        const y = top + HEAD_H + r * rowH;
        const hotRow = highlightRow === r && light > 0;
        return (
          <Snap key={row.label} frame={frame} at={rowAt(r)} from={{ x: -MOTION.itemIn }}>
            <div style={{ position: "absolute", left: content.left, width: LABEL_W - PAD, top: y, height: rowH, display: "flex", alignItems: "center", ...caption("l", hotRow ? COLOR.highlight : COLOR.textSecondary), whiteSpace: "normal", lineHeight: 1.2 }}>
              {row.label}
            </div>
            {row.values.map((v, c) => {
              const hotCell = !!highlightCell && highlightCell[0] === r && highlightCell[1] === c && light > 0.5;
              const ink = hotCell ? COLOR.bg : hotRow ? COLOR.textPrimary : typeof v === "number" ? COLOR.textPrimary : COLOR.textSecondary;
              return (
                <div
                  key={c}
                  style={{
                    position: "absolute",
                    left: colsLeft + c * colW + 8,
                    width: colW - PAD - 8,
                    top: y,
                    height: rowH,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: numeric(c) ? "flex-end" : "flex-start",
                    ...(typeof v === "number" ? valueStyle("l", ink) : { ...body("l", ink, 500), whiteSpace: "normal" as const }),
                  }}
                >
                  {show(v)}
                </div>
              );
            })}
            {r < rows.length - 1 && <div style={{ position: "absolute", left: content.left, top: y + rowH, width: content.right - content.left, height: 1, background: COLOR.grid }} />}
          </Snap>
        );
      })}
    </Layer>
  );
};
