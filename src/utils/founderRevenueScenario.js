// Scenario math only. Never use these projections as booked revenue, payouts, or financial statements.
const finiteNonnegative = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(label + " must be a non-negative number");
  return number;
};
const cent = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateFounderRevenueScenario({
  businesses = 134,
  ownBusinessVolume = 1500,
  marketplaceJobsPerBusiness = 5,
  averageMarketplaceJob = 300,
  platformFeePct = 1,
  marketplaceSuccessPct = 6,
  subscriptionPerBusiness = 0,
  monthlyDirectCostsPerBusiness = 20,
  monthlyUnfundedProcessingPerBusiness = 0,
  companyFixedCosts = 40,
  taxReservePct = 25,
  targetTakeHome = 10000,
} = {}) {
  const count = Math.floor(finiteNonnegative(businesses, "Active business count"));
  const own = finiteNonnegative(ownBusinessVolume, "Own customer volume");
  const jobs = Math.floor(finiteNonnegative(marketplaceJobsPerBusiness, "Marketplace jobs"));
  const average = finiteNonnegative(averageMarketplaceJob, "Average job value");
  const platformPct = finiteNonnegative(platformFeePct, "Platform fee percentage");
  const successPct = finiteNonnegative(marketplaceSuccessPct, "Success fee percentage");
  const subscription = finiteNonnegative(subscriptionPerBusiness, "Subscription");
  const direct = finiteNonnegative(monthlyDirectCostsPerBusiness, "Direct costs");
  const processing = finiteNonnegative(monthlyUnfundedProcessingPerBusiness, "Processing costs");
  const fixed = finiteNonnegative(companyFixedCosts, "Fixed costs");
  const tax = finiteNonnegative(taxReservePct, "Tax reserve");
  const target = finiteNonnegative(targetTakeHome, "Target take-home");
  if (tax >= 100 || platformPct > 100 || successPct > 100) throw new Error("Percentages out of range");

  const marketplaceVolume = jobs * average;
  const paidVolumePerBusiness = own + marketplaceVolume;
  const platformRevenuePerBusiness = cent(paidVolumePerBusiness * platformPct / 100);
  const successRevenuePerBusiness = cent(marketplaceVolume * successPct / 100);
  const grossRevenuePerBusiness = cent(platformRevenuePerBusiness + successRevenuePerBusiness + subscription);
  const contributionPerBusiness = cent(grossRevenuePerBusiness - direct - processing);
  const totalCompanyRevenue = cent(grossRevenuePerBusiness * count);
  const totalMonthlyVariableCosts = cent((direct + processing) * count);
  const preTaxOperatingProfit = cent(totalCompanyRevenue - totalMonthlyVariableCosts - fixed);
  const taxReserve = cent(Math.max(preTaxOperatingProfit, 0) * tax / 100);
  const ownerTakeHome = cent(preTaxOperatingProfit - taxReserve);
  const profitNeededBeforeTax = target / (1 - tax / 100);
  const businessTarget = contributionPerBusiness > 0
    ? Math.ceil((profitNeededBeforeTax + fixed) / contributionPerBusiness)
    : null;

  return {
    businesses: count,
    ownBusinessVolume: own,
    marketplaceJobsPerBusiness: jobs,
    marketplaceVolumePerBusiness: cent(marketplaceVolume),
    totalMarketplaceJobs: count * jobs,
    totalPaidJobVolume: cent(paidVolumePerBusiness * count),
    platformRevenuePerBusiness,
    successRevenuePerBusiness,
    grossRevenuePerBusiness,
    contributionPerBusiness,
    totalCompanyRevenue,
    totalMonthlyVariableCosts,
    fixedCosts: fixed,
    preTaxOperatingProfit,
    taxReserve,
    ownerTakeHome,
    targetTakeHome: target,
    targetBusinesses: businessTarget,
    shortfall: cent(Math.max(0, target - Math.max(0, ownerTakeHome))),
    scenarioOnly: true,
  };
}
