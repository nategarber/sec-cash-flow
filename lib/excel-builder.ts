import * as XLSX from "xlsx";
import type { CashFlowRow } from "./cash-flow-mapper";

const SECTION_ORDER = ["Operating", "Investing", "Financing", "Summary"];
const SECTION_LABELS: { [k: string]: string } = {
  Operating: "OPERATING ACTIVITIES",
  Investing: "INVESTING ACTIVITIES",
  Financing: "FINANCING ACTIVITIES",
  Summary: "NET CHANGE IN CASH",
};

function formatMillions(val: number | null): string | number {
  if (val === null || val === undefined) return "";
  return val;
}

export function buildCashFlowWorkbook(
  rows: CashFlowRow[],
  fiscalYears: string[],
  companyName: string,
  ticker: string,
  filingDate: string
): Uint8Array {
  const wb = XLSX.utils.book_new();
  const wsData: (string | number | null)[][] = [];

  // Title rows
  wsData.push([`${companyName} (${ticker.toUpperCase()})`]);
  wsData.push([`Statement of Cash Flows — From 10-K filed ${filingDate}`]);
  wsData.push(["Values in USD (as reported)"]);
  wsData.push([]);

  // Header row
  wsData.push(["", ...fiscalYears.map((fy) => `FY ${fy}`)]);

  // Group rows by section
  const rowsBySection: { [section: string]: CashFlowRow[] } = {};
  for (const row of rows) {
    if (!rowsBySection[row.section]) rowsBySection[row.section] = [];
    rowsBySection[row.section].push(row);
  }

  for (const section of SECTION_ORDER) {
    const sectionRows = rowsBySection[section];
    if (!sectionRows?.length) continue;

    wsData.push([]);
    wsData.push([SECTION_LABELS[section] ?? section]);

    for (const row of sectionRows) {
      wsData.push([
        row.label,
        ...fiscalYears.map((fy) => formatMillions(row.values[fy] ?? null)),
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws["!cols"] = [{ wch: 52 }, ...fiscalYears.map(() => ({ wch: 18 }))];

  // Apply basic styles via cell-level formatting
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");

  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddr]) continue;
      const cell = ws[cellAddr];

      // Number formatting for value columns
      if (C > 0 && typeof cell.v === "number") {
        cell.z = '#,##0;(#,##0)';
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "Cash Flow Statement");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
}
