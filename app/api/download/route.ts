import { NextRequest, NextResponse } from "next/server";
import { buildCashFlowWorkbook } from "@/lib/excel-builder";
import type { CashFlowRow } from "@/lib/cash-flow-mapper";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      ticker: string;
      companyName: string;
      filingDate: string;
      fiscalYears: string[];
      rows: CashFlowRow[];
    };

    const { ticker, companyName, filingDate, fiscalYears, rows } = body;

    if (!ticker || !rows?.length) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const buffer = buildCashFlowWorkbook(rows, fiscalYears, companyName, ticker, filingDate);
    const filename = `${ticker}_cash_flow_${filingDate}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
