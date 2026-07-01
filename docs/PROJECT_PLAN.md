# Bangalore Food-Delivery Intelligence — Power BI Project Plan

**Working title:** *SaffronMetrics — A Food-Delivery Command Center*
**Dataset:** Zomato Bangalore restaurants (56,251 rows) + synthetic Orders (200,001), Customers (20,001), DateTable (1,001).
**Goal:** An interview-grade, visually distinctive analytics product covering the full BI lifecycle — model → DAX → design → interactivity → performance → security → deployment.

---

## 1. Data Model (Star Schema)

**Fact:** `Orders` (200K rows) — grain = one delivery order.
**Dimensions:** `Restaurants`, `Customers`, `DateTable`.

| Relationship | Cardinality | Direction |
|---|---|---|
| `DateTable[Date]` → `Orders[OrderDate]` | 1 : * | Single |
| `Restaurants[RestaurantID]` → `Orders[RestaurantID]` | 1 : * | Single |
| `Customers[CustomerID]` → `Orders[CustomerID]` | 1 : * | Single |
| `DateTable[Date]` → `Customers[SignupDate]` (optional, USERELATIONSHIP) | 1 : * | Single (inactive) |

Rules: single-direction filters only; `DateTable` marked as the official Date table; Auto Date/Time **disabled** (Options → Data Load).

### Raw → clean column map (Power Query)
| Raw column | Issue | Action |
|---|---|---|
| `rate` = `"4.1/5"` | text, plus `"NEW"`, `"-"`, nulls | Split on `/`, take first part → `Rating` (Decimal); errors → null |
| `approx_cost(for two people)` | thousands like `1,200` as text | Remove `,` → `CostForTwo` (Whole Number) |
| `votes` | ok | rename → `Votes` |
| `name`/`address` | duplicate listings (same restaurant, many `listed_in` rows) | Deduplicate to one row per restaurant for the dimension |
| `online_order`,`book_table` | Yes/No text | keep; optional → boolean |
| `cuisines`,`dish_liked` | comma-delimited multi-value | keep as-is for text/word-cloud; optionally split for a bridge table |

> **Note on `RestaurantID`:** it already exists in the source, so the Readme step "Create RestaurantID" becomes "verify uniqueness + dedupe the dimension."

---

## 2. Milestones (maps to your Readme TODO)

| # | Milestone | Readme steps | Output |
|---|---|---|---|
| M1 | **Ingest & profile** | Import, inspect columns | Column quality/distribution reviewed |
| M2 | **Clean & shape (Power Query)** | Clean/transform, RestaurantID, finalize Restaurants, Orders, Customers, Date | 4 query-folded, typed tables |
| M3 | **Model** | Build relationships | Star schema, marked date table, hidden keys |
| M4 | **Calculated columns** | Calculated columns | Buckets: Cost, Rating, Delivery Status, Order Month |
| M5 | **Measures** | Base + advanced measures | KPI, status, customer, restaurant, time-intelligence |
| M6 | **Report build** | Pages 1–5 | 5 designed pages |
| M7 | **Interactivity** | Slicers, interactions | Slicers, drill-through, bookmarks, tooltips, field params |
| M8 | **Polish & governance** | Final formatting | Theme, RLS, performance pass, documentation |

Suggested effort: M1–M3 ≈ 30%, M4–M5 ≈ 25%, M6 ≈ 25%, M7–M8 ≈ 20%.

---

## 3. Advanced Features to Implement (the "wow" list)

- **Field parameters** — one KPI card set that switches between Revenue / Orders / AOV / Delivery Time via a slicer.
- **What-if parameter** — "Late-threshold (mins)" and "Discount %" sliders that recompute late-delivery % / simulated revenue.
- **Drill-through page** — click any restaurant → dedicated Restaurant 360 page.
- **Bookmarks + selection pane** — toggle chart⇄table, show/hide a filter panel, "reset filters" button.
- **Custom (report-page) tooltips** — hover a restaurant/cuisine to see a mini-dashboard.
- **Dynamic titles & narratives** — titles that echo the current slicer selection; Smart Narrative visual.
- **Calculation groups** (via Tabular Editor) — reusable time-intelligence (YTD / PY / MoM) applied to any measure.
- **AI visuals** — Key Influencers (what drives late delivery / cancellation), Decomposition Tree (revenue breakdown), Q&A.
- **Conditional formatting & KPI indicators** — data bars, up/down arrows, rating color scale.
- **Row-Level Security** — e.g. a "City Manager" role filtering `Restaurants[location]`.

---

## 4. UI/UX Design

**Concept:** a premium "command center" — dark editorial canvas, one warm signature accent, generous spacing, card-based layout. Ship the included [theme.json](theme.json).

**Palette — "Saffron Noir"**
| Role | Hex |
|---|---|
| Canvas | `#12141C` |
| Card / panel | `#1B1E29` |
| Primary accent (brand) | `#FF5A3C` (saffron-coral) |
| Secondary accent | `#FFB020` (amber) |
| Positive / good | `#2DD4BF` (teal) |
| Negative / bad | `#FB7185` (rose) |
| Text primary / secondary | `#E8EAF0` / `#A2A8B8` |

**Layout grid (1280×720):**
- Left **nav rail** (72–220px): page icons + logo; page navigator buttons with hover bookmarks.
- Top **KPI band**: 4–5 cards with big callout + delta vs prior month + sparkline.
- Center: 1–2 hero visuals. Right: supporting breakdowns. Bottom: detail table.
- **Global slicer panel** hidden behind a filter button (bookmark toggle) to keep canvas clean.

**Design principles:** 8px spacing system, ≤2 fonts (Segoe UI / Semibold), rounded 12px cards with soft shadow, muted gridlines, data-ink first (no 3D/pie clutter), consistent color meaning across pages, accessible contrast + non-color encodings.

**Signature interactions:** cross-highlight everywhere, drill-through to Restaurant 360, hover report-tooltips, animated bookmark view-switch, "Reset" and "Filters" buttons, dynamic subtitle text.

---

## 5. Page-by-Page Spec

1. **Executive Overview** — KPI band (Revenue, Orders, AOV, Avg Delivery, Repeat %); revenue trend (line, with PY); orders by status (donut/bar); top locations (bar); field-parameter metric switch; Smart Narrative.
2. **Restaurant Performance** — map/matrix by `location`; cuisine treemap; rating vs cost scatter (bubble = votes); Cost Bucket / Rating Bucket breakdown; online_order & book_table impact.
3. **Delivery & Operations** — Avg delivery time trend; Late % gauge with what-if threshold; late orders by location heat matrix; cancellation % KPI; Key Influencers on `Delivery Status`.
4. **Customer Analytics** — New vs Returning; repeat-customer %; orders-per-customer; signup cohort trend; top customers table; city distribution (uses cleaned `FilterCity`).
5. **Restaurant 360 (drill-through)** — single-restaurant header card; its orders trend, delivery performance, top dishes/cuisines, rating & votes vs area average; "back" button.

---

## 6. DAX Roadmap

Your existing measures are a solid base. Extensions and fixes:

- **Fix `FilterCity`:** it references `'Customer'[city]` but the table is `Customers` / column `City`. Correct to `Customers[City]`.
- **Add** `Revenue PY = CALCULATE([Total Revenue], SAMEPERIODLASTYEAR(DateTable[Date]))` and `Revenue YoY % = DIVIDE([Total Revenue]-[Revenue PY],[Revenue PY])`.
- **Dynamic title:** `Selected Metric Title = SELECTEDVALUE(...)` for field-parameter pages.
- **Rank measure:** `Restaurant Rank = RANKX(ALL(Restaurants[name]), [Total Revenue],, DESC)`.
- **What-if:** `Late % (dynamic) = DIVIDE(CALCULATE([Total Orders], Orders[DeliveryTimeMins] > [Threshold Value]), [Total Orders])`.
- **Move time-intelligence into a calculation group** (Tabular Editor) to avoid measure sprawl.

Best practice: measures grouped in display folders, formatted (%, ₹), stored in a hidden `_Measures` table.

---

## 7. Technical-Interview Compliance Checklist

| Criterion | Where demonstrated |
|---|---|
| Star schema & relationships | §1 model, single-direction filters |
| Cardinality & filter direction | §1 table |
| Power Query / ETL / query folding | §1 clean map, M2 |
| Data cleaning (dirty `rate`, cost) | §1 raw→clean |
| Calculated columns vs measures | §6 + your file |
| CALCULATE / filter context | Status & customer measures |
| Iterators (RANKX, FILTER, SUMX) | Repeat customers, ranks |
| Time intelligence | YTD, PY, MoM, YoY (§6) |
| Data-viz best practice | §4 principles |
| Interactivity (slicers, drill-through, bookmarks, tooltips) | §3, §5 |
| Field / what-if parameters | §3 |
| Performance optimization | §8 |
| Row-Level Security | §3, §8 |
| AI / advanced analytics | Key Influencers, Decomp Tree, Q&A |
| UX / design system | §4 + theme.json |
| Storytelling & business insight | §5 narratives |
| Deployment (Service, refresh, workspace/app) | §8 |
| Governance / naming / documentation | §8, this file |

---

## 8. Step-by-Step Implementation Guide

1. **Load** `dataset.xlsx` (4 sheets) via Excel connector.
2. **Power Query:** set types; clean `rate`→`Rating`, `approx_cost`→`CostForTwo`, rename `votes`→`Votes`; dedupe Restaurants; confirm keys; disable load on staging queries; keep steps folding.
3. **Disable Auto Date/Time**; mark `DateTable` as date table.
4. **Build relationships** (§1); hide foreign keys and raw date columns.
5. **Calculated columns:** Cost Bucket, Rating Bucket, Delivery Status, Order Month.
6. **Measures:** create `_Measures` table; add KPI → status → customer → restaurant → time-intelligence; add PY/YoY, ranks, what-if.
7. **Apply theme** (`theme.json`); set page size 1280×720, canvas background.
8. **Build Pages 1–5** (§5); add nav rail with page-navigation buttons.
9. **Interactivity:** slicer panel bookmark, field parameter, what-if slider, drill-through to Restaurant 360, custom tooltips, edit visual interactions.
10. **AI visuals:** Key Influencers, Decomposition Tree, Q&A.
11. **RLS:** create role (e.g. filter `Restaurants[location]`), test via "View as".
12. **Performance:** Performance Analyzer + DAX Studio/VertiPaq Analyzer; remove unused columns; check model size.
13. **Documentation:** data dictionary, measure list, assumptions (this file).
14. **Deploy:** publish to a Service workspace, set scheduled refresh (gateway if needed), package as an App, apply sensitivity label.

---

## Deliverables
- `Restaurant.pbix` — the report.
- `theme.json` — importable design system (View → Themes → Browse).
- `CALCULATED COLUMNS AND MEASURES.txt` — DAX library (+ fixes in §6).
- `PROJECT_PLAN.md` — this reference.
