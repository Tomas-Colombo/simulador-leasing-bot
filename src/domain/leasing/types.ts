export type Currency = 'USD' | 'ARS';

export type AssetCategory = 'utilitario' | 'auto_suv';

export type FinancingOptionType = '100_percent' | '10_percent_down' | '20_percent_down' | '30_percent_down';

export interface LeasingCalculationInput {
  amount: number;
  isIvaIncluded?: boolean | undefined; // Defaults to true
  inputCurrency?: Currency | undefined;
  category: AssetCategory;
  exchangeRate?: number | undefined; // Defaults to 1530
  commissionRate?: number | undefined; // Optional custom fee
  termYears?: number | undefined; // Defaults to 3
  isCommissionBonified?: boolean | undefined; // True if Liugong bonification applies
  clientName?: string | undefined;
  assetDescription?: string | undefined;
}

export interface OptionSimulationResult {
  optionType: FinancingOptionType;
  downPaymentRate: number;
  downPaymentNet: number;
  monthlyCanonNet: number;
  monthsCount: number; // 35 cuotas vencidas
  purchaseOptionNet: number;
  bankLiquidationExpenses: number;
  associatedCommission: number;
  originalAssociatedCommission: number;
  isCommissionBonified: boolean;
  totalNetOutlay: number;
  gananciasTaxSavings: number;
  bienesPersonalesTaxSavings: number;
  totalTaxSavings: number;
  netFinancialCost: number; // Ahorro / Costo neto del dinero
  nominalAnnualRate: number; // Tasa directa anual
}

export interface LeasingSimulationResult {
  currency: Currency;
  assetPriceNet: number;
  assetPriceIva: number;
  assetPriceTotal: number;
  exchangeRate: number;
  ivaRate: number; // 0.105 or 0.21
  isIvaIncludedInput: boolean;
  options: Record<FinancingOptionType, OptionSimulationResult>;
}

export interface DualLeasingSimulationResult {
  clientName?: string | undefined;
  assetDescription?: string | undefined;
  isCommissionBonified: boolean;
  usdSimulation: LeasingSimulationResult;
  arsSimulation: LeasingSimulationResult;
}
