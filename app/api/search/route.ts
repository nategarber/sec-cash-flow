import { NextRequest, NextResponse } from "next/server";
import { searchCompaniesByName } from "@/lib/edgar";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  const results = await searchCompaniesByName(q);
  return NextResponse.json(results);
}
