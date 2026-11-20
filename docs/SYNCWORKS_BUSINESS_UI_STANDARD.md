# SyncWorks Business Workspace Design Standard (v1)

**Status:** Established visual direction from the Sterling Private simulation and the live SBO office, with implementation varying by page. The simulated Private showcase is a design reference, **not a source of production financial data**.

## 1. One app shell
- One brand header, back control when appropriate, and global Menu. Never render multiple competing headers.
- Pin header beneath iOS status bar/safe area, and pin mobile navigation above the home indicator.
- Keep the *outer* mobile office one viewport tall with **no page scrolling**. Data tables, drawers, result lists and long forms may scroll *inside their own bounded region*.
- Theme-specific background fills viewport; use legible translucent cards and theme-aware outlines, borders and text. No elements may overlap the iOS Dynamic Island, fixed dock or assistant launcher.
- Desktop: left rail for primary business modules, central operational canvas, right intelligence rail. Mobile: compact KPI strip, essential action cards, bottom dock and slide-up detail panels.

## 2. Business hierarchy and access
- User identity is independent from business context and employee roles.
- Business owner/CEO can operate alone (without an employee seat), with full owner-level access to that business. Business membership/ownership is **server-verified**, not inferred from React state or an email.
- Staff gain only assigned modules/actions through per-business permissions. HR may manage delegated operational roles but cannot grant/transfer ownership, elevate their own authority or cross tenant boundaries.
- CEO dashboard is separate from shared SBO operations. Executive income, revenue, profit, sensitive company finance and strategic analytics belong to owner-authorized views; staff Finance must be constrained by its own permissions.
- SBO operations: tickets, dispatch, staffing, timeclock, schedule, invoicing workflow, leads, growth, team and operational KPIs.
- Dispatch sees triage/assignment/work order controls; technician sees assigned field jobs; customer sees own tickets. Never use only hidden buttons as authorization.

## 3. SBO page composition
- Reference: Sterling Private business workspace for proportions/interaction, **not simulated values**.
- Desktop SBO header: business name, status and small AI team portraits; left rail opens contextual arrow-connected flyouts beside the chosen trigger.
- Desktop central panel: operational pulse, open/at-risk/clocked KPIs, live dispatch, technician assignment and active ticket queue. Avoid repeating the same navigation as large central tiles.
- Right rail: Needs Attention first; technician leaderboard next; route conflicts and delays at bottom. Do not put owner-only cash flow or total company revenue in the shared operational rail.
- Mobile SBO: four critical action cards (Tech Board, Schedule, Invoicing, Leads), Growth/Marketing shortcut and the existing centered **New Call** dock action; keep one-screen fit.
- Every empty state states whether there is genuinely no data or whether the backend failed. No fabricated metrics.

## 4. Navigation and drawers
- Use the same shell across business routes (including Finance, HR, Tickets, Dispatch, Growth, Team). A legacy page is not compliant merely because it has a background.
- Desktop sidebar controls open a popout at their own arrow/trigger, clamped within viewport; right-rail actions open inward. ESC, close button and click-outside dismiss. Long contents scroll within the drawer.
- Mobile uses slide-up sheets, dimming backdrop and bounded internal scrolling. Keep fixed dock anchored while sheet opens.
- Content tables, invoices and customer detail actions drill down without opening a new full-height scrolling page where a drawer is usable.
- Accessible labels, keyboard focus, focus restoration and adequate hit targets are required.

## 5. Motion (SyncWorks Motion Foundation)
- Duration guidance: tactile feedback **150 ms**, short fade **180 ms**, panels **240 ms**, page transitions **250–280 ms**, stagger **30–50 ms** per sibling.
- Drill down: right-to-left directional slide/fade; back: reverse; peer tabs: cross-dissolve.
- Shared-element transitions only where source/destination are explicitly paired and browser supports view transitions, with a normal fade/scale fallback.
- Menus: staggered cascade. Headings: masked line reveal. Loading: skeleton shimmer; never block interactive updates or keep stale financial totals visible.
- Mobile sheet: spring-like upward entrance, desktop flyout: arrow-origin scale/fade. Use transform/opacity, not expensive layout animations.
- Respect both `prefers-reduced-motion` and the SyncWorks motion preference. No animations on live trading actions, real-time field submissions or actions requiring immediate feedback.

## 6. AI agents and assistant launcher
- Mount one persistent pilot-scoped AI dock in the *global shell* for business subpages; do not separately copy dock markup into every route.
- Use configured saved avatar images and names (Victoria, James, Elizabeth, William). Victoria opens her existing Chief of Staff panel; other portraits open existing Sync Assist until agent-specific launchers are verified.
- The SBO overview already has a desktop header AI group and a mobile internal AI row: exclude that route from the shared dock to prevent duplicates.
- Keep Forge and Games free of business agent docks.
- Bot appearance must not imply a working external connection or completed autonomous execution. Show real backend status and required connection steps inside an agent panel.

## 7. Production acceptance criteria
- Verify desktop at common laptop and wide screen widths, mobile iPhone Safari with Dynamic Island and browser address bar, short screens and landscape.
- Confirm no outer scroll/overlap, footer/dock never covers the last actionable item, all buttons hit valid routes, and no duplicate header or AI controls.
- Verify all role permissions and cross-business scoping on the backend. Do not merge a visual-only permission change as a security fix.
- Capture before/after desktop and mobile screenshots for each migrated page, comparing to the Sterling reference; keep real and simulated data distinctly labeled.
- Run frontend build/navigation checks plus backend tests where APIs/permissions change; production deploy only after preview checks. Review actual browser behavior after release.

## 8. Migration checklist per legacy page
1. Identify current route/data sources/actions; preserve working functionality.
2. Replace extra header/sidebars and full-page scroll with common shell layout.
3. Put summary KPIs and work queue in central canvas; detail actions in drawers.
4. Restrict sensitive metrics to backend-authorized views.
5. Reuse the globally mounted AI dock, not page-local clones.
6. Apply motion tokens, accessibility, theme and responsive layout.
7. Test every button, data state and role, then capture a screenshot.

### Known outstanding migration example
`/sbo/finance` still uses the older DashboardShell and a long page/sidebar. The requested Sterling-style layout is **not yet complete** on that route; it needs its own screen-level migration while preserving live Stripe and invoice workflows.
