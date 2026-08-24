# Build 19 Customer Invoice Center acceptance checks

- `/customer/invoices` renders the Personal invoice command center.
- Sent, overdue, partially paid, paid, and void states are visually distinct.
- Detail view preserves invoice totals, line items, notes, provider name, ticket reference, due date, and activity history.
- Pay Now uses the remaining balance returned by the backend, not the original invoice total.
- Stripe success and cancel redirects return to `/customer/invoices` with the invoice selected.
- Mobile layout keeps invoice cards and Pay Now usable above the sticky navigation.
- Empty, loading, payment-success, cancellation, and API-error states are explicit.
