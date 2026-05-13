import { NextRequest, NextResponse } from "next/server";
import { tickerToCik, getCompanyInfo, getMostRecent10K, getCompanyFacts } from "@/lib/edgar";
import { extractCashFlowData } from "@/lib/cash-flow-mapper";

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();

  if (!ticker) {
    return NextResponse.json({ error: "ticker parameter is required" }, { status: 400 });
  }

  try {
    const cik = await tickerToCik(ticker);
    const [companyInfo, filing] = await Promise.all([
      getCompanyInfo(cik),
      getMostRecent10K(cik),
    ]);
    const facts = await getCompanyFacts(cik);
    const { rows, fiscalYears } = extractCashFlowData(facts, filing.accessionNumber, filing.reportDate);

    if (!rows.length) {
      return NextResponse.json(
        { error: "No structured cash flow data found. This company may file without XBRL tagging." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ticker,
      companyName: companyInfo.name,
      filingDate: filing.filingDate,
      reportDate: filing.reportDate,
      accessionNumber: filing.accessionNumber,
      fiscalYears,
      rows,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
