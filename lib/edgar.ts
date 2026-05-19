const EDGAR_BASE = "https://data.sec.gov";
const HEADERS = { "User-Agent": "sec-cash-flow-tool nateagarber@gmail.com" };

export interface Filing {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  form: string;
}

export interface CashFlowFact {
  concept: string;
  label: string;
  value: number;
  unit: string;
  period: string;
  form: string;
  accn: string;
}

async function fetchJSON(url: string) {
  const res = await fetch(url, { headers: HEADERS, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`EDGAR fetch failed: ${res.status} ${url}`);
  return res.json();
}

export async function tickerToCik(ticker: string): Promise<string> {
  const data = await fetchJSON("https://www.sec.gov/files/company_tickers.json");
  const upper = ticker.toUpperCase();
  for (const entry of Object.values(data) as { cik_str: number; ticker: string; title: string }[]) {
    if (entry.ticker.toUpperCase() === upper) {
      return String(entry.cik_str).padStart(10, "0");
    }
  }
  throw new Error(`Ticker "${ticker}" not found in SEC EDGAR.`);
}

export async function getCompanyInfo(cik: string): Promise<{ name: string; tickers: string[] }> {
  const data = await fetchJSON(`${EDGAR_BASE}/submissions/CIK${cik}.json`);
  return { name: data.name, tickers: data.tickers ?? [] };
}

export async function getMostRecent10K(cik: string): Promise<Filing> {
  const data = await fetchJSON(`${EDGAR_BASE}/submissions/CIK${cik}.json`);
  const { filings } = data;
  const recent = filings.recent;

  const forms: string[] = recent.form;
  const accessions: string[] = recent.accessionNumber;
  const filingDates: string[] = recent.filingDate;
  const reportDates: string[] = recent.reportDate;

  for (let i = 0; i < forms.length; i++) {
    if (forms[i] === "10-K") {
      return {
        accessionNumber: accessions[i],
        filingDate: filingDates[i],
        reportDate: reportDates[i],
        form: forms[i],
      };
    }
  }

  // Check older filings pages if not found in recent
  if (filings.files?.length) {
    for (const file of filings.files) {
      const older = await fetchJSON(`${EDGAR_BASE}/submissions/${file.name}`);
      const oForms: string[] = older.form;
      const oAccessions: string[] = older.accessionNumber;
      const oFilingDates: string[] = older.filingDate;
      const oReportDates: string[] = older.reportDate;
      for (let i = 0; i < oForms.length; i++) {
        if (oForms[i] === "10-K") {
          return {
            accessionNumber: oAccessions[i],
            filingDate: oFilingDates[i],
            reportDate: oReportDates[i],
            form: oForms[i],
          };
        }
      }
    }
  }

  throw new Error("No 10-K filing found for this company.");
}

export async function getCompanyFacts(cik: string) {
  return fetchJSON(`${EDGAR_BASE}/api/xbrl/companyfacts/CIK${cik}.json`);
}

export async function searchCompaniesByName(query: string): Promise<{ ticker: string; name: string }[]> {
  const data = await fetchJSON("https://www.sec.gov/files/company_tickers.json");
  const entries = Object.values(data) as { cik_str: number; ticker: string; title: string }[];
  const lower = query.toLowerCase();

  const scored: { ticker: string; name: string; score: number }[] = [];
  for (const entry of entries) {
    const nameLower = entry.title.toLowerCase();
    const tickerLower = entry.ticker.toLowerCase();
    let score = 0;
    if (tickerLower === lower || nameLower === lower) score = 3;
    else if (tickerLower.startsWith(lower) || nameLower.startsWith(lower)) score = 2;
    else if (nameLower.includes(lower)) score = 1;
    if (score > 0) scored.push({ ticker: entry.ticker, name: entry.title, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ ticker, name }) => ({ ticker, name }));
}
