import type {
  AssetCategory,
  DualLeasingSimulationResult,
  FinancingOptionType,
  LeasingCalculationInput,
  LeasingSimulationResult,
  OptionSimulationResult,
} from './types.js';

const IVA_RATES: Record<AssetCategory, number> = {
  utilitario: 0.105,
  auto_suv: 0.21,
};

const ARS_CANON_FACTORS: Record<FinancingOptionType, { downRate: number; canonFactor: number }> = {
  '100_percent': { downRate: 0.05, canonFactor: 0.0445987 },
  '10_percent_down': { downRate: 0.1, canonFactor: 0.0422549 },
  '20_percent_down': { downRate: 0.2, canonFactor: 0.03756 },
  '30_percent_down': { downRate: 0.3, canonFactor: 0.032865 },
};

const USD_CANON_FACTORS: Record<FinancingOptionType, { downRate: number; canonFactor: number }> = {
  '100_percent': { downRate: 0.05, canonFactor: 0.0321465 },
  '10_percent_down': { downRate: 0.1, canonFactor: 0.0298929 },
  '20_percent_down': { downRate: 0.2, canonFactor: 0.0265715 },
  '30_percent_down': { downRate: 0.3, canonFactor: 0.02325 },
};

export function calculateLeasingSingle(
  input: LeasingCalculationInput & { targetCurrency: 'USD' | 'ARS'; targetAmountNet: number }
): LeasingSimulationResult {
  const {
    targetAmountNet,
    targetCurrency,
    category,
    exchangeRate = 1530,
    termYears = 3,
    isIvaIncluded = true,
    isCommissionBonified = false,
  } = input;

  if (targetAmountNet <= 0) {
    throw new Error('Asset price must be greater than zero');
  }

  const ivaRate = IVA_RATES[category] ?? 0.21;
  const assetPriceNet = targetAmountNet;
  const assetPriceIva = assetPriceNet * ivaRate;
  const assetPriceTotal = assetPriceNet + assetPriceIva;

  const optionTypes: FinancingOptionType[] = [
    '100_percent',
    '10_percent_down',
    '20_percent_down',
    '30_percent_down',
  ];

  const options = {} as Record<FinancingOptionType, OptionSimulationResult>;

  for (const optionType of optionTypes) {
    if (targetCurrency === 'ARS') {
      const config = ARS_CANON_FACTORS[optionType];
      const defaultCommission = 0.025;
      const commissionRate = input.commissionRate ?? defaultCommission;

      const downPaymentRate = config.downRate;
      const downPaymentNet = assetPriceNet * downPaymentRate;
      const monthlyCanonNet = assetPriceNet * config.canonFactor;
      const monthsCount = 35;
      const purchaseOptionNet = assetPriceNet * 0.05;

      const baseOutlay = (monthlyCanonNet * monthsCount) + downPaymentNet;
      const bankLiquidationExpenses = baseOutlay * 0.03;
      const originalAssociatedCommission = baseOutlay * commissionRate;
      const associatedCommission = isCommissionBonified ? 0 : originalAssociatedCommission;

      const totalNetOutlay = downPaymentNet + (monthlyCanonNet * monthsCount) + purchaseOptionNet + bankLiquidationExpenses + associatedCommission;

      const gananciasTaxSavings = (downPaymentNet + (monthlyCanonNet * monthsCount) + bankLiquidationExpenses + associatedCommission) * 0.35;
      const bienesPersonalesTaxSavings = assetPriceNet * 0.025 * termYears;
      const totalTaxSavings = gananciasTaxSavings + bienesPersonalesTaxSavings;

      const totalPaymentsNoPurchaseOption = monthlyCanonNet * 36;
      const netFinancialCost = totalPaymentsNoPurchaseOption - assetPriceTotal - totalTaxSavings;

      const nominalAnnualRate = (((baseOutlay - assetPriceNet) / assetPriceNet) / termYears);

      options[optionType] = {
        optionType,
        downPaymentRate,
        downPaymentNet,
        monthlyCanonNet,
        monthsCount,
        purchaseOptionNet,
        bankLiquidationExpenses,
        associatedCommission,
        originalAssociatedCommission,
        isCommissionBonified,
        totalNetOutlay,
        gananciasTaxSavings,
        bienesPersonalesTaxSavings,
        totalTaxSavings,
        netFinancialCost,
        nominalAnnualRate,
      };
    } else {
      // USD Calculation
      const config = USD_CANON_FACTORS[optionType];
      const defaultCommission = 0.03;
      const commissionRate = input.commissionRate ?? defaultCommission;

      const downPaymentRate = config.downRate;
      const downPaymentNet = assetPriceNet * downPaymentRate;
      const monthlyCanonNet = assetPriceNet * config.canonFactor;
      const monthsCount = 35;
      const purchaseOptionNet = monthlyCanonNet;

      const baseOutlayUSD = (monthlyCanonNet * monthsCount) + downPaymentNet;
      const bankLiquidationExpenses = baseOutlayUSD * 0.032 * exchangeRate;
      const originalAssociatedCommission = baseOutlayUSD * commissionRate * exchangeRate;
      const associatedCommission = isCommissionBonified ? 0 : originalAssociatedCommission;

      const downPaymentNetARS = downPaymentNet * exchangeRate;
      const monthlyCanonNetARS = monthlyCanonNet * exchangeRate;
      const purchaseOptionNetARS = purchaseOptionNet * exchangeRate;

      const totalNetOutlay = downPaymentNetARS + (monthlyCanonNetARS * monthsCount) + purchaseOptionNetARS + bankLiquidationExpenses + associatedCommission;

      const gananciasTaxSavings = ((baseOutlayUSD * exchangeRate) + bankLiquidationExpenses + associatedCommission) * 0.35;
      const bienesPersonalesTaxSavings = assetPriceNet * 0.025 * termYears * exchangeRate;
      const totalTaxSavings = gananciasTaxSavings + bienesPersonalesTaxSavings;

      const totalPaymentsNoPurchaseOptionARS = monthlyCanonNetARS * 36;
      const assetPriceTotalARS = assetPriceTotal * exchangeRate;
      const netFinancialCost = totalPaymentsNoPurchaseOptionARS - assetPriceTotalARS - totalTaxSavings;

      const nominalAnnualRate = (((baseOutlayUSD - assetPriceNet) / assetPriceNet) / termYears);

      options[optionType] = {
        optionType,
        downPaymentRate,
        downPaymentNet,
        monthlyCanonNet,
        monthsCount,
        purchaseOptionNet,
        bankLiquidationExpenses,
        associatedCommission,
        originalAssociatedCommission,
        isCommissionBonified,
        totalNetOutlay,
        gananciasTaxSavings,
        bienesPersonalesTaxSavings,
        totalTaxSavings,
        netFinancialCost,
        nominalAnnualRate,
      };
    }
  }

  return {
    currency: targetCurrency,
    assetPriceNet,
    assetPriceIva,
    assetPriceTotal,
    exchangeRate,
    ivaRate,
    isIvaIncludedInput: isIvaIncluded,
    options,
  };
}

export function calculateDualLeasing(input: LeasingCalculationInput): DualLeasingSimulationResult {
  const {
    amount,
    isIvaIncluded = true,
    inputCurrency = 'USD',
    category,
    exchangeRate = 1530,
    isCommissionBonified = false,
    clientName,
    assetDescription,
  } = input;

  const ivaRate = IVA_RATES[category] ?? 0.21;
  const netAmount = isIvaIncluded ? amount / (1 + ivaRate) : amount;

  let usdAmountNet: number;
  let arsAmountNet: number;

  if (inputCurrency === 'USD') {
    usdAmountNet = netAmount;
    arsAmountNet = netAmount * exchangeRate;
  } else {
    arsAmountNet = netAmount;
    usdAmountNet = netAmount / exchangeRate;
  }

  const usdSimulation = calculateLeasingSingle({
    ...input,
    targetCurrency: 'USD',
    targetAmountNet: usdAmountNet,
  });

  const arsSimulation = calculateLeasingSingle({
    ...input,
    targetCurrency: 'ARS',
    targetAmountNet: arsAmountNet,
  });

  return {
    clientName,
    assetDescription,
    isCommissionBonified,
    usdSimulation,
    arsSimulation,
  };
}
