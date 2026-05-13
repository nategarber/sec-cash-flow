// Standard US-GAAP XBRL concepts that appear in the Statement of Cash Flows,
// ordered so the output sheet reads top-to-bottom as it would in a real filing.
export const CASH_FLOW_CONCEPTS: { concept: string; label: string; section: string; bold?: boolean }[] = [
  // Operating Activities
  { concept: "NetIncomeLoss", label: "Net Income (Loss)", section: "Operating", bold: false },
  { concept: "DepreciationDepletionAndAmortization", label: "Depreciation & Amortization", section: "Operating" },
  { concept: "Depreciation", label: "Depreciation", section: "Operating" },
  { concept: "AmortizationOfIntangibleAssets", label: "Amortization of Intangibles", section: "Operating" },
  { concept: "ShareBasedCompensation", label: "Stock-Based Compensation", section: "Operating" },
  { concept: "DeferredIncomeTaxExpenseBenefit", label: "Deferred Income Taxes", section: "Operating" },
  { concept: "IncreaseDecreaseInAccountsReceivable", label: "Change in Accounts Receivable", section: "Operating" },
  { concept: "IncreaseDecreaseInInventories", label: "Change in Inventories", section: "Operating" },
  { concept: "IncreaseDecreaseInAccountsPayable", label: "Change in Accounts Payable", section: "Operating" },
  { concept: "IncreaseDecreaseInAccruedLiabilities", label: "Change in Accrued Liabilities", section: "Operating" },
  { concept: "IncreaseDecreaseInOtherOperatingAssets", label: "Change in Other Operating Assets", section: "Operating" },
  { concept: "IncreaseDecreaseInOtherOperatingLiabilities", label: "Change in Other Operating Liabilities", section: "Operating" },
  { concept: "OtherNoncashIncomeExpense", label: "Other Non-Cash Items", section: "Operating" },
  { concept: "NetCashProvidedByUsedInOperatingActivities", label: "Net Cash from Operating Activities", section: "Operating", bold: true },

  // Investing Activities
  { concept: "PaymentsToAcquirePropertyPlantAndEquipment", label: "Capital Expenditures", section: "Investing" },
  { concept: "ProceedsFromSaleOfPropertyPlantAndEquipment", label: "Proceeds from Sale of PP&E", section: "Investing" },
  { concept: "PaymentsToAcquireBusinessesNetOfCashAcquired", label: "Acquisitions, net of cash", section: "Investing" },
  { concept: "PaymentsToAcquireInvestments", label: "Purchases of Investments", section: "Investing" },
  { concept: "ProceedsFromSaleAndMaturityOfMarketableSecurities", label: "Proceeds from Sale of Investments", section: "Investing" },
  { concept: "ProceedsFromSaleMaturityAndCollectionOfInvestments", label: "Proceeds from Investments", section: "Investing" },
  { concept: "PaymentsForProceedsFromOtherInvestingActivities", label: "Other Investing Activities", section: "Investing" },
  { concept: "NetCashProvidedByUsedInInvestingActivities", label: "Net Cash from Investing Activities", section: "Investing", bold: true },

  // Financing Activities
  { concept: "ProceedsFromIssuanceOfLongTermDebt", label: "Proceeds from Long-Term Debt", section: "Financing" },
  { concept: "RepaymentsOfLongTermDebt", label: "Repayments of Long-Term Debt", section: "Financing" },
  { concept: "ProceedsFromRepaymentsOfShortTermDebt", label: "Net Change in Short-Term Debt", section: "Financing" },
  { concept: "PaymentsOfDividends", label: "Dividends Paid", section: "Financing" },
  { concept: "PaymentsForRepurchaseOfCommonStock", label: "Share Repurchases", section: "Financing" },
  { concept: "ProceedsFromIssuanceOfCommonStock", label: "Proceeds from Stock Issuance", section: "Financing" },
  { concept: "ProceedsFromStockOptionsExercised", label: "Proceeds from Stock Options Exercised", section: "Financing" },
  { concept: "PaymentsRelatedToTaxWithholdingForShareBasedCompensation", label: "Tax Withholding on Stock Awards", section: "Financing" },
  { concept: "NetCashProvidedByUsedInFinancingActivities", label: "Net Cash from Financing Activities", section: "Financing", bold: true },

  // Net Change
  { concept: "EffectOfExchangeRateOnCashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents", label: "Effect of Exchange Rate Changes", section: "Summary" },
  { concept: "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalentsPeriodIncreaseDecreaseIncludingExchangeRateEffect", label: "Net Change in Cash", section: "Summary", bold: true },
  { concept: "CashAndCashEquivalentsPeriodIncreaseDecreaseExcludingExchangeRateEffect", label: "Net Change in Cash (ex. FX)", section: "Summary", bold: true },
  { concept: "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents", label: "Cash at End of Period", section: "Summary", bold: true },
  { concept: "CashAndCashEquivalentsAtCarryingValue", label: "Cash & Equivalents at End of Period", section: "Summary", bold: true },
];

export interface CashFlowRow {
  concept: string;
  label: string;
  section: string;
  bold: boolean;
  values: { [fiscalYear: string]: number | null };
}

interface XbrlFact {
  end?: string;
  val: number;
  form: string;
  accn: string;
  fy?: number;
  fp?: string;
  frame?: string;
}

export function extractCashFlowData(
  companyFacts: { facts: { "us-gaap"?: { [key: string]: { units: { USD?: XbrlFact[] } } } } },
  targetAccessionNumber: string,
  reportDate: string
): { rows: CashFlowRow[]; fiscalYears: string[]; companyName: string } {
  const gaap = companyFacts.facts["us-gaap"] ?? {};
  const targetAccn = targetAccessionNumber.replace(/-/g, "");

  // Determine the canonical fiscal year from the target accession's fy field.
  // Fall back to the year of the reportDate if no fact carries fy metadata.
  let targetFY: number | null = null;
  for (const { concept } of CASH_FLOW_CONCEPTS) {
    const factData = gaap[concept];
    if (!factData?.units?.USD) continue;
    const hit = factData.units.USD.find(
      (f) => f.accn.replace(/-/g, "") === targetAccn && f.fp === "FY" && f.form === "10-K" && f.fy !== undefined
    );
    if (hit?.fy) { targetFY = hit.fy; break; }
  }
  if (!targetFY) targetFY = parseInt(reportDate.substring(0, 4));

  const fyNums = [targetFY, targetFY - 1, targetFY - 2];
  const fiscalYears = fyNums.map(String);

  // For each concept, find the best-matching fact for each target fiscal year.
  const conceptValues: { [concept: string]: { [fy: string]: number } } = {};

  for (const { concept } of CASH_FLOW_CONCEPTS) {
    const factData = gaap[concept];
    if (!factData?.units?.USD) continue;

    const annualFacts = factData.units.USD.filter(
      (f) => f.form === "10-K" && f.fp === "FY" && f.fy !== undefined
    );

    for (const fyNum of fyNums) {
      const matches = annualFacts
        .filter((f) => f.fy === fyNum)
        .sort((a, b) => (b.end! > a.end! ? 1 : -1));
      if (matches.length) {
        if (!conceptValues[concept]) conceptValues[concept] = {};
        conceptValues[concept][String(fyNum)] = matches[0].val;
      }
    }
  }

  const rows: CashFlowRow[] = [];
  for (const def of CASH_FLOW_CONCEPTS) {
    const values = conceptValues[def.concept];
    if (!values) continue;

    // Only include row if it has data for at least the most recent year
    const hasRecentData = fiscalYears.some((fy) => values[fy] !== undefined);
    if (!hasRecentData) continue;

    rows.push({
      concept: def.concept,
      label: def.label,
      section: def.section,
      bold: def.bold ?? false,
      values: Object.fromEntries(fiscalYears.map((fy) => [fy, values[fy] ?? null])),
    });
  }

  return { rows, fiscalYears, companyName: "" };
}
