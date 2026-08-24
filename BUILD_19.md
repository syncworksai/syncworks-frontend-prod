# Build 19 — Customer Invoice Payment Loop UI

- Replaces the legacy endpoint-guessing invoice screen with one canonical customer Invoice Center.
- Uses the Build 19 customer invoice API and existing Stripe checkout endpoint.
- Shows outstanding balance, open invoice count, overdue count, paid history, line items, notes, provider, due date, and customer-safe activity history.
- Pay Now charges only the remaining balance returned by the backend.
- Stripe success/cancel routes return directly to `/customer/invoices` and reopen the relevant invoice.
- Keeps the existing Personal dashboard, Finance module, ticket system, and sticky mobile navigation intact.
