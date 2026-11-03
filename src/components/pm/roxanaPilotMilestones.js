/** Roxana-only PM planning milestone. Not a sent notice or approved rent increase. */
export const ROXANA_RENT_REVIEW_DATE = "2027-01-04";
export const ROXANA_RENT_REVIEW_EVENT = Object.freeze({
  id: "pilot-roxana-rent-review-2027",
  property_id: 1,
  property_name: "Roxana",
  tenant_name: "Tonya English",
  title: "Roxana · Rent increase eligibility review",
  type: "RENT_REVIEW",
  status: "OPEN",
  due_at: "2027-01-04T09:00:00-06:00",
  link_url: "/pm/rent-increases?property=1",
  notes: "Review the month-to-month lease, MHA rent-reasonableness approval, abatement clearance and required written notice. Planning reminder only; no increase is authorized or applied.",
});
export const isRoxanaPilotProperty = (property) => Number(property?.id) === 1 &&
  String(property?.name || "").toLowerCase().includes("roxana");
