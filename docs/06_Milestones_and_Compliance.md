# 06 — Milestones, Interview Compliance, QA & Risks
### SaffronMetrics — Bangalore Food-Delivery Analytics (Power BI Desktop)

This document is the project-management and quality spine for SaffronMetrics. It maps the analyst's `Readme.txt` TODO to a realistic single-analyst schedule, proves technical-interview coverage against an exhaustive rubric, and defines the performance, QA, and risk controls that must be satisfied before the `.pbix` is considered "build-ready."

All references below assume the documented Power Query transforms are already in place: `rate → Rating` (Decimal, cleaned), `approx_cost(for two people) → CostForTwo` (Whole Number, separators stripped), `votes → Votes`, plus a de-duplicated `Restaurants` dimension keyed on `RestaurantID`. Currency throughout is Indian Rupees (₹).

---

## 1. Milestone & Timeline Plan

Effort is expressed in focused hours for **one analyst** and in elapsed calendar days assuming ~4 productive project-hours/day. Total build effort ≈ **44 hours ≈ 11–12 working days**. Milestones are strictly sequenced; each milestone's exit gate is the entry gate of the next.

| # | Milestone (maps to Readme TODO) | Key deliverable | Effort (hrs) | Duration | Depends on |
|---|---|---|---|---|---|
| M0 | **Project setup & source inspection** — "Import dataset", "Inspect columns" | `dataset.xlsx` connected; 4 queries loaded to preview; column profiling enabled (Column quality / distribution / profile over *entire* dataset) | 2.0 | 0.5 day | — |
| M1 | **Power Query clean & transform** — "Clean and transform in Power Query" | Typed, cleaned queries: `Rating` numeric from `"4.1/5"` (NEW/-/null → null), `CostForTwo` integer (separators stripped), trimmed/cased text, Yes/No standardized | 5.0 | 1.5 days | M0 |
| M2 | **Restaurant key & de-duplication** — "Create RestaurantID", "Finalize Restaurants table" | De-duplicated `Restaurants` dimension at one-row-per-real-restaurant grain; `RestaurantID` verified unique; `listed_in(type)`/`listed_in(city)` handled (retained on a bridge or collapsed per model decision) | 4.0 | 1 day | M1 |
| M3 | **Fact & remaining dimensions** — "Create Orders table", "Create Customers table", "Create Date table" | `Orders` (fact, grain = 1 order), `Customers`, `DateTable` finalized and typed; keys integer; unused columns removed | 3.0 | 0.75 day | M2 |
| M4 | **Data model & relationships** — "Build relationships" | Star schema wired (dimension → fact, 1:*): `Restaurants[RestaurantID] → Orders[RestaurantID]`, `Customers[CustomerID] → Orders[CustomerID]`, `DateTable[Date] → Orders[OrderDate]`; all single cross-filter direction; `DateTable` marked as date table; auto date/time disabled | 2.5 | 0.5 day | M3 |
| M5 | **Calculated columns** — "Create calculated columns" | `FilterCity` (bug-fixed), `Cost Bucket`, `Rating Bucket`, `Delivery Status`, `Order Month` validated; sort-by columns set | 2.5 | 0.5 day | M4 |
| M6 | **Base measures** — "Create base measures" | KPI + status + customer + restaurant measures in a dedicated `_Measures` table (Total Orders, Total Revenue, AOV, Avg Delivery Time, Total Customers/Restaurants, Delivered/Cancelled/Late, %s) | 3.0 | 0.75 day | M5 |
| M7 | **Advanced measures** — "Create advanced measures" | Time-intelligence & analytical measures (Revenue/Orders YTD, Prev Month, Growth %, Repeat Customer %, RANKX top-N, what-if driven) with VAR + `DIVIDE` safe division | 3.5 | 1 day | M6 |
| M8 | **Page 1 — Executive Overview** — "Build Page 1" | KPI cards, revenue trend, top locations; theme applied | 2.5 | 0.5 day | M7 |
| M9 | **Page 2 — Restaurant Performance** — "Build Page 2" | Rating/cost analysis, RANKX leaderboard, scatter | 2.5 | 0.5 day | M8 |
| M10 | **Page 3 — Delivery & Operations** — "Build Page 3" | Late-delivery %, delivery-time distribution, cancellation analysis | 2.5 | 0.5 day | M9 |
| M11 | **Page 4 — Customer Analytics** — "Build Page 4" | Repeat vs new, orders-per-customer, cohort/city view, RLS-relevant visuals | 2.5 | 0.5 day | M10 |
| M12 | **Page 5 — Geography / Details & Drill-through** — "Build Page 5" | Location map/matrix + drill-through target page | 2.5 | 0.5 day | M11 |
| M13 | **Slicers & sync** — "Add slicers" | Slicer panel (Year, MonthName, location, CostForTwo/Cost Bucket, online_order); slicers synced across pages where appropriate | 1.5 | 0.5 day | M12 |
| M14 | **Interactions & navigation** — "Add interactions" | Edit-interactions rules, drill-through, bookmarks/page nav, tooltips | 2.0 | 0.5 day | M13 |
| M15 | **Final formatting, QA & docs** — "Final formatting" | Theme polish, alignment grid, RLS roles, Performance Analyzer pass, full QA checklist, sensitivity label, published `.pbix` + docs | 4.0 | 1 day | M14 |

**Sequencing rationale:** Model correctness (M1–M4) is front-loaded because every downstream DAX reference and visual depends on cleaned/typed columns and a valid star schema. Measures (M6–M7) precede visuals (M8–M12) so pages are assembled from a stable measure library rather than ad-hoc formulas. Interactivity and formatting (M13–M15) are last because they are cheap to change but expensive to rework if the model shifts.

---

## 2. Technical-Interview Compliance Checklist

Exhaustive mapping of commonly-assessed criteria to the exact artifact/section/page that demonstrates them. "Doc" references point to the sibling planning files; page references point to report pages built in M8–M12.

| # | Assessed criterion | Where demonstrated | Concrete evidence |
|---|---|---|---|
| 1 | **Data modeling / star schema** | Data model (M4); Doc 02 | One fact (`Orders`) + 3 conformed dimensions (`Restaurants`, `Customers`, `DateTable`); no snowflaking |
| 2 | **Cardinality & filter direction** | Data model (M4); Doc 02 | Three 1:* relationships, single cross-filter direction from dimensions → fact; documented in relationship table |
| 3 | **Power Query / ETL & query folding** | M1–M3 | Applied-steps ETL; note that Excel source does **not** fold — folding discussed as a governance point for future SQL migration; `Table.Buffer` used deliberately, not accidentally |
| 4 | **Data cleaning** | M1 | `"4.1/5" → 4.1`; `NEW`/`-`/null → null Rating; thousands separators stripped from `CostForTwo`; Yes/No standardized; whitespace trimmed |
| 5 | **Calculated columns vs measures** | M5 vs M6/M7; Doc 03 | Row-context artifacts (`Cost Bucket`, `Rating Bucket`, `Delivery Status`, `Order Month`, `FilterCity`) are columns; all aggregations are measures — rationale stated |
| 6 | **CALCULATE & filter/row context** | M6 (`Delivered Orders`, `Cancelled Orders`, `Late Orders`) | Filter-context modification via `CALCULATE`; row→filter context transition explained in `Repeat Customers` |
| 7 | **Iterators (SUMX / RANKX / FILTER)** | M7 leaderboard | `RANKX` restaurant ranking; `FILTER(VALUES(...))` in `Repeat Customers`; optional `SUMX` weighted metric |
| 8 | **Time intelligence** | M7; Page 1 | `TOTALYTD`, `DATEADD` (prev month), `Revenue Growth %`; `DateTable` marked as date table |
| 9 | **Variables (VAR)** | M5 `FilterCity`; M7 growth measures | `VAR`/`RETURN` for readability and single-evaluation performance |
| 10 | **Safe division / error handling** | All ratio measures (M6/M7) | `DIVIDE()` (not `/`) for Cancellation %, Late %, AOV, Growth %, etc.; avoids div-by-zero |
| 11 | **Data-viz best practice** | Pages 1–5; Doc 04 | Correct chart-to-question mapping, no 3D/pie overload, sorted bars, consistent number formatting (₹, %) |
| 12 | **Interactivity** | M13–M14 | Slicers, cross-highlighting via edit-interactions, drill-down hierarchies |
| 13 | **Field & what-if parameters** | M7/M13 | What-if parameter (e.g., delivery-time SLA threshold or top-N) driving a measure; field parameter to swap metrics on a chart |
| 14 | **Performance / VertiPaq optimization** | M15; Section 3 below | Auto date/time off, integer keys, removed columns, measure-first design, Performance Analyzer evidence |
| 15 | **Row-Level Security (RLS)** | M15 | Role filtering `Restaurants[location]`; "View as role" test evidence |
| 16 | **AI / advanced analytics** | Page 1/4 | Key Influencers and/or Decomposition Tree on cancellation or repeat-customer driver; Smart Narrative or Q&A |
| 17 | **UX / design system** | All pages; `theme.json` | "Saffron Noir" dark theme, consistent grid, navigation, spacing tokens |
| 18 | **DAX formatting & readability** | Doc 03; all measures | Consistent indentation, `VAR`-based structure, DAX-formatter conventions, no magic numbers un-commented |
| 19 | **Storytelling & business insight** | Page flow 1→5; Doc 04 | Narrative arc: overview → restaurant → operations → customer → geography; each page answers a business question |
| 20 | **Deployment & refresh** | M15; Doc 05 | Publish to Service, scheduled refresh plan, gateway note for local Excel source |
| 21 | **Governance & sensitivity labels** | M15 | Sensitivity label applied (e.g., *General/Internal*); dataset ownership + certification note |
| 22 | **Version control** | Project repo | `.pbix` + `theme.json` + `.md` docs tracked; PBIP/source-control-friendly save format recommended; changelog |
| 23 | **Documentation** | Docs 01–06 + `PROJECT_PLAN.md` | This plan set + in-model measure descriptions/tooltips |

No criterion from the required list is omitted.

---

## 3. Performance-Optimization Checklist

| ✔ | Action | How / where | Why |
|---|---|---|---|
| ☐ | **Disable auto date/time** | File → Options → Data Load (global + current file) | Removes hidden per-date-column date tables that bloat the model |
| ☐ | **Enforce star schema** | M4 | Fastest VertiPaq storage/eval pattern; avoids ambiguous paths |
| ☐ | **Remove unused columns** | M2–M3 Power Query | Drop `dish_liked`, raw address noise, and any staging columns not surfaced in visuals; fewer columns = smaller model |
| ☐ | **Integer keys** | M2–M4 | `RestaurantID`, `CustomerID`, `OrderID` kept as integers; text keys avoided for relationships |
| ☐ | **Avoid bidirectional filtering** | M4 | All relationships single-direction dimension→fact; no bidi unless a justified bridge requires it |
| ☐ | **Measures over calculated columns** | M6/M7 | Aggregations computed at query time, not materialized per row; only true row-context logic stays as columns |
| ☐ | **Reduce cardinality** | M1–M3 | Split high-cardinality datetime if ever present; round `CostForTwo`; de-dupe `Restaurants` to cut row count dramatically |
| ☐ | **Performance Analyzer pass** | M15 | Record each page; capture DAX/visual/other timings; fix visuals > ~200 ms |
| ☐ | **DAX Studio / VertiPaq Analyzer** | M15 | Inspect table/column sizes, cardinality, encoding; confirm no runaway column dominates model size |
| ☐ | **Aggregations (only if needed)** | M15 (conditional) | 200k-row fact is modest; add pre-aggregation table only if Performance Analyzer shows a bottleneck — do not pre-optimize |

---

## 4. QA / Testing Checklist

| ✔ | Test | Pass criterion |
|---|---|---|
| ☐ | **Revenue reconciles to source** | `[Total Revenue]` at grand total = `SUM(OrderValue)` computed directly in Excel on the Orders sheet |
| ☐ | **Order count reconciles** | `[Total Orders]` (= `COUNT(Orders[OrderID])`, all statuses) equals the Orders sheet data-row count (~200,000, i.e. 200,001 sheet rows minus the header); `[Delivered Orders]` + `[Cancelled Orders]` + any other status subtotals sum back to `[Total Orders]` |
| ☐ | **No blank/duplicate keys** | `RestaurantID`, `CustomerID`, `OrderID` have zero blanks; dimension keys are unique (verify in Power Query column profile / DAX `COUNTROWS` vs `DISTINCTCOUNT`) |
| ☐ | **Relationship validity** | Model view shows no inactive/limited relationships unintentionally; no fact rows land in a blank member (check for unmatched FKs) |
| ☐ | **Referential integrity** | Every `Orders[RestaurantID]`/`[CustomerID]` exists in its dimension; orphan FKs quantified and explained |
| ☐ | **Rating cleaning correctness** | Rows that were `NEW`/`-`/null show blank `Rating`, not 0; `Avg Rating` ignores blanks; spot-check 10 known values |
| ☐ | **CostForTwo parsing** | Values with thousands separators (e.g., `1,200`) parse to `1200`; no text-to-number errors remain |
| ☐ | **Slicer sync** | Synced slicers move together across intended pages; independent slicers stay independent |
| ☐ | **Drill-through works** | Right-click → drill-through carries context to detail page and back-button returns |
| ☐ | **Cross-filter interactions** | Clicking a bar filters companion visuals per the edit-interactions design; no unintended filtering |
| ☐ | **Time intelligence sanity** | `Revenue YTD` resets at year boundary; `Revenue Previous Month` aligns to prior period; Growth % blank/handled for first month |
| ☐ | **RLS tested** | "View as" a `location` role shows only that location's restaurants and their related orders; totals shrink correctly |
| ☐ | **Number formatting** | ₹ currency and % formats consistent on all cards/tooltips; no raw decimals leaking |
| ☐ | **Full refresh clean** | Refresh completes with no errors/step warnings; timings recorded |

---

## 5. Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Dirty `rate` data** — `"4.1/5"`, `NEW`, `-`, nulls corrupt `Rating` and inflate/deflate `Avg Rating` | High | High | In M1 split on `"/"`, coerce to Decimal, map non-numeric tokens to `null` (not 0); QA test confirms blanks excluded from `AVERAGE`; document rule in Doc 03 |
| R2 | **Duplicate restaurant rows** — same restaurant repeated across `listed_in(type)`/`listed_in(city)` inflates `Total Restaurants` and distorts averages | High | High | M2 de-duplication to one-row-per-real-restaurant grain keyed on `RestaurantID`; decide whether `listed_in` attributes move to a separate bridge/lookup or are dropped; `DISTINCTCOUNT(RestaurantID)` validated post-dedupe |
| R3 | **Local-file refresh dependency** — dataset is a local `dataset.xlsx`; Service refresh will fail without a gateway | Medium | Medium | M15 documents on-premises data gateway requirement (or migration to OneDrive/SharePoint/SQL); interim: manual desktop refresh; note in deployment doc |
| R4 | **200k-row fact performance** — heavy iterators (`RANKX`, `FILTER(VALUES())` in `Repeat Customers`) could slow pages | Medium | Medium | Measure-first design; `DIVIDE` and `VAR` to avoid recomputation; Performance Analyzer + VertiPaq Analyzer in M15; add aggregation table only if a visual exceeds ~200 ms |
| R5 | **`FilterCity` bug** — drafted DAX references `'Customer'[city]`; correct table/column is `Customers[City]` | High (if unfixed) | Medium | Fix in M5 to `Customers[City]`; QA verifies column resolves and blanks behave; captured in Doc 04 as a corrected artifact |
| R6 | **`Order Month` sort/text ordering** — `FORMAT(...,"MMM YYYY")` sorts alphabetically, not chronologically | Medium | Low | Add a numeric `MonthKey` (Year*100+MonthNo) sort-by column, or drive visuals from `DateTable` fields instead |
| R7 | **Broken FKs / blank-member leakage** — orders referencing missing dimension keys | Low | Medium | Referential-integrity QA test (Section 4); quantify orphans and document handling |
| R8 | **Scope creep beyond one analyst** — 5 pages + AI + RLS + what-if | Medium | Medium | Milestone gates with fixed effort budget; AI visuals limited to 1–2 (Key Influencers / Decomposition Tree); defer nice-to-haves to a backlog |

---

## 6. Final Deliverables

1. **`Restaurant.pbix`** — completed Power BI Desktop file: cleaned queries, star-schema model, all calculated columns and measures, 5 report pages, slicers, drill-through, RLS roles, and applied "Saffron Noir" theme.
2. **`theme.json`** — the dark "Saffron Noir" theme file (already in repo), applied and version-controlled alongside the `.pbix`.
3. **`dataset.xlsx`** — the single source workbook (Restaurants, Customers, Orders, DateTable), retained for reproducibility/refresh.
4. **Planning document set (`.md`)** — Docs 01–06 (`01_PowerQuery_Transformations.md`, `02_DataModel.md`, `03_DAX_Library.md`, `04_Report_Design.md`, `05_Deployment_and_Governance.md`, and this file `06_Milestones_and_Compliance.md`) plus `PROJECT_PLAN.md`.
5. **Data dictionary / model documentation** — table + column definitions post-transform, relationship map, and measure catalog with descriptions (surfaced as in-model descriptions/tooltips).
6. **QA sign-off sheet** — the completed Section 4 checklist with reconciliation figures (Total Revenue and Total Orders vs source) recorded.
7. **Performance evidence** — Performance Analyzer capture and VertiPaq Analyzer summary (model size, top columns by size, cardinality).
8. **RLS test evidence** — "View as role" screenshot/notes proving `Restaurants[location]` filtering.
9. **Deployment & refresh note** — publish target, sensitivity label applied, scheduled-refresh plan, and gateway requirement for the local Excel source.
10. **README / changelog** — build instructions, TODO completion status, and version history for the repository.
