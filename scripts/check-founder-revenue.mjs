import assert from "node:assert/strict";
import test from "node:test";
import { calculateFounderRevenueScenario as scenario } from "../src/utils/founderRevenueScenario.js";

test("businesses and owner cash goal use contributions rather than gross fees", () => {
  const m = scenario();
  assert.equal(m.platformRevenuePerBusiness, 30);
  assert.equal(m.successRevenuePerBusiness, 90);
  assert.equal(m.grossRevenuePerBusiness, 120);
  assert.equal(m.contributionPerBusiness, 100);
  assert.equal(m.totalCompanyRevenue, 16080);
  assert.equal(m.preTaxOperatingProfit, 13360);
  assert.equal(m.ownerTakeHome, 10020);
  assert.equal(m.targetBusinesses, 134);
  assert.equal(m.scenarioOnly, true);
});

test("free accounts with no transactions are not profitable", () => {
  const m = scenario({businesses: 300, ownBusinessVolume: 0, marketplaceJobsPerBusiness: 0, monthlyDirectCostsPerBusiness: 0});
  assert.equal(m.grossRevenuePerBusiness, 0);
  assert.equal(m.ownerTakeHome, -40);
  assert.equal(m.targetBusinesses, null);
});

test("processing costs are paid by somebody and reduce our margin if unfunded", () => {
  const m = scenario({monthlyUnfundedProcessingPerBusiness: 120});
  assert.equal(m.contributionPerBusiness, -20);
  assert.equal(m.targetBusinesses, null);
  assert.ok(m.ownerTakeHome < 0);
});

test("subscription-free and zero marketplace jobs require sufficient paid GMV", () => {
  const m = scenario({businesses: 1, ownBusinessVolume: 9000, marketplaceJobsPerBusiness: 0, monthlyDirectCostsPerBusiness: 0, monthlyUnfundedProcessingPerBusiness: 0, taxReservePct: 0});
  assert.equal(m.grossRevenuePerBusiness, 90);
  assert.equal(m.preTaxOperatingProfit, 50);
  assert.equal(m.ownerTakeHome, 50);
});

test("invalid percentages, negatives and non-finite amounts are rejected", () => {
  assert.throws(() => scenario({taxReservePct: 100}));
  assert.throws(() => scenario({ownBusinessVolume: -1}));
  assert.throws(() => scenario({averageMarketplaceJob: Infinity}));
});
