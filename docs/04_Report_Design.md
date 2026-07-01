# 04 — Report Build & UI/UX Design Spec

**Project:** SaffronMetrics — Bangalore Food-Delivery Analytics
**Tool:** Power BI Desktop
**Theme:** Saffron Noir (dark)
**Canvas:** 1280 × 720 (16:9), 5 report pages + tooltip page(s)
**Currency:** Indian Rupees (₹)

This document is the buildable UI/UX and report specification. Every field, measure, and calculated column referenced below exists in the model **after** the documented Power Query renames (`rate → Rating`, `approx_cost(for two people) → CostForTwo`, `votes → Votes`) and the DAX in `03_DAX_Library.md`. Where a source column is still in its raw parenthesized form (e.g., `listed_in(type)`, `listed_in(city)`), the exact source name is used. All measures live on the hidden `_Measures` table (per `02_DataModel.md`); measure references use the unqualified `[Measure]` form.

---

## 1. The "Saffron Noir" Design System

### 1.1 Applying the theme
The theme file already exists in the project folder as `theme.json` (its `name` is `"Saffron Noir"`).

1. In Power BI Desktop: **View → Themes → Browse for themes**.
2. Select `theme.json` from the project root folder.
3. Confirm the active theme reads **"Saffron Noir"** under **View → Themes** (this is the `name` field in the JSON).

The theme drives the default data-color palette, page/canvas backgrounds, card border radius (12px), soft drop shadow, and text classes, so most visuals inherit correct styling with zero manual formatting. Only page-level layout, custom shapes, and the per-visual overrides described below need hand-formatting.

### 1.2 Color tokens

| Token | Hex | Usage |
|---|---|---|
| Canvas / page background | `#12141C` | Outermost page fill |
| Outspace (grey area) | `#0C0E15` | Around the canvas |
| Card surface | `#1B1E29` | All visual & container backgrounds |
| Card border | `#2A2E3D` | 1px stroke on cards, 12px radius |
| Brand accent (saffron) | `#FF5A3C` | Primary KPI values, selected nav, series 1, focus rings |
| Amber (neutral/warning) | `#FFB020` | Mid-range buckets, neutral KPI, warning states |
| Teal (good/positive) | `#2DD4BF` | Positive deltas, "On Time", "Delivered", good ratings |
| Rose (bad/negative) | `#FB7185` | Negative deltas, "Late", "Cancelled", low ratings |
| Text primary | `#E8EAF0` | Titles, headline numbers, axis labels |
| Text secondary | `#A2A8B8` | Category labels, captions, sublabels |
| Indigo / sky / lime (support) | `#6366F1` `#38BDF8` `#A3E635` | Extra categorical series only |

**Semantic rule (used everywhere):** positive = teal `#2DD4BF`, negative = rose `#FB7185`, neutral/attention = amber `#FFB020`, primary highlight = saffron `#FF5A3C`. Never use red/green from outside this palette.

### 1.3 Typography
- **Titles / headline numbers:** Segoe UI Semibold.
- **Body / labels / captions:** Segoe UI.
- Type scale (px): Callout KPI 34 · Page title 20 · Card title 12 (semibold) · Table/body 10 · Caption 9.
- Text colors: headline `#FFFFFF` or `#E8EAF0`; supporting `#A2A8B8`.

### 1.4 Spacing, grid, and cards
- **8px spacing system.** All gutters, paddings, and offsets are multiples of 8 (8 / 16 / 24 / 32).
- **Outer page margin:** 24px on all sides. **Gutter between cards:** 16px.
- **Nav rail width:** 72px (see §2). Content area ≈ 1280 − 72 (rail) − 16 (rail gap) − 24 (right margin) ≈ **1168px** usable wide.
- **Cards:** background `#1B1E29`, border `#2A2E3D` 1px, **12px corner radius**, soft outer drop shadow (spread 6, blur 18, ~60% transparency — inherited from theme).
- **KPI band cards:** height 96px, top of content zone.

### 1.5 Reusable layout zones (all analytical pages)
```
┌── Nav rail (72) ──┬──────────────── Content area (~1168 usable) ────────────────┐
│                   │  Page title + global slicers (filter bar)      [y=24 h=48]  │
│  logo             │  ── KPI BAND: 4–5 KPI cards ──                  [y=88 h=96]  │
│  ▸ Exec           │                                                             │
│  ▸ Restaurants    │  ── HERO visual (largest, left) ──  ── SUPPORTING (right)── │
│  ▸ Delivery       │                                     [y=200 h≈300]           │
│  ▸ Customers      │                                                             │
│  ▸ R360 (drill)   │  ── DETAIL TABLE / secondary charts ──         [y≈516]      │
│  ⚙ reset          │                                                             │
└───────────────────┴─────────────────────────────────────────────────────────────┘
```

---

## 2. Left Navigation Rail

A vertical rail docked flush-left, **x=0, y=0, width=72, height=720**, fill `#1B1E29`, no radius (full-bleed edge). Build it once, then copy/paste to every page so its position is pixel-identical.

**Contents (top to bottom, 8px grid):**
1. **Brand mark** — text box "SM" in saffron `#FF5A3C` Segoe UI Semibold 20px (or logo image), at y=24.
2. **Five page-navigation buttons**, one per report page, stacked with 16px gaps starting y=120. Each is a **Button** visual (Insert → Buttons → Blank) sized 56×56, using an icon glyph + a text label revealed on hover:
   - Exec Overview (grid icon), Restaurant Performance (storefront), Delivery & Operations (scooter/clock), Customer Analytics (people), **Restaurant 360 (magnifier)** — R360 is primarily the **drill-through target**; its rail button is provided so the page is directly reachable for demo/testing, but the normal path is right-click → *Drill through* from a restaurant-level visual (§4.3).
3. **Reset / filter-panel toggle** (gear icon) near bottom, y=632.

**Button action:** each nav button → **Format → Action → Type = Page navigation → Destination = <target page>**.

**Hover / selected states (button States + per-page default):**
- Use the button's built-in **Format → Style → State** dropdown to set:
  - **Default:** fill transparent, icon `#A2A8B8`.
  - **On hover:** fill `#12141C`, icon `#E8EAF0`.
- **Selected ("you are here") state** — Power BI buttons have no persistent "selected" state, so use **either** of:
  1. **Per-page default (recommended for one analyst):** on each page, set that page's own nav button's *Default* state to fill `#12141C` + saffron `#FF5A3C` icon, and place a **3px × 56px saffron rectangle** flush-left of it. Because the rail is copied per page and then edited, each page shows its own button highlighted with no bookmark overhead.
  2. **Bookmark set:** build 5 "selected" bookmarks (one accent rectangle shown per page), grouped so the correct accent shows for the current page. Only needed if you want a single shared rail object driven entirely by bookmarks.

---

## 3. Page-by-Page Specification

Global slicer/filter conventions (placed in the filter bar at y=24, right-aligned, or in the hidden filter panel §4.5):
- **Date range slicer** — `DateTable[Date]` (Between slider style).
- **Location slicer** — `Restaurants[location]` (dropdown; this is also the RLS-filtered column).
- **Cuisine / type slicer** — `Restaurants[listed_in(type)]` (dropdown).
- Sync slicers across pages via **View → Sync slicers** where noted.

---

### PAGE 1 — Executive Overview

**Purpose:** One-screen answer to "how is the business doing?" — revenue, orders, customers, delivery health, and trend, for a C-level / interviewer first impression.

**Filter bar (y=24):** Page title "Executive Overview" (20px). Right side: Date range slicer (`DateTable[Date]`), Location slicer (`Restaurants[location]`).

**KPI band (y=88, five Card visuals, 96px tall):** callout 34px, category label below.
1. **Total Revenue** → `[Total Revenue]`, format `"₹#,0"`. Saffron value.
2. **Total Orders** → `[Total Orders]`.
3. **Avg Order Value** → `[Avg Order Value]` (₹).
4. **Total Customers** → `[Total Customers]`.
5. **Cancellation %** → `[Cancellation %]`, callout font color by rules: teal if < 8%, amber 8–12%, rose > 12% (conditional formatting on the callout value using `[Cancellation %]`).

**Hero (left, y=200, ~700×300) — Revenue trend with YTD context:**
- **Line and clustered column chart.**
- X-axis: `DateTable[MonthName]` (its *Sort by column* set to `DateTable[MonthNo]`), with `DateTable[Year]` in the legend or a Year slicer so months don't collapse across years.
- Column: `[Total Revenue]` (saffron). Line: `[Revenue YTD]` on the secondary value axis (amber).
- Data labels off except on hover.

**Supporting (right, y=200, ~430×300) — metric-switcher bar:**
- **Clustered bar chart** of the **top-8 `Restaurants[location]`** by the chosen metric. Y-axis `Restaurants[location]`; Value = the field parameter **`KPI Selector`** column `'KPI Selector'[KPI Selector Fields]` (switches between `[Total Revenue]`, `[Total Orders]`, `[Avg Order Value]`, `[Avg Delivery Time]` — see §4.1). Top-N filter = Top 8 by the selected field parameter value.
- Above it, a **slicer** bound to `'KPI Selector'[KPI Selector]` (the label column) at y≈176.

**Detail / secondary row (y=516, ~168px tall):**
- **Three small cards:** `[Delivered Orders]`, `[Late Delivery %]`, `[Repeat Customer %]`.
- **Donut chart** — order-status mix: Legend `Orders[OrderStatus]`, Value `[Total Orders]`. Delivered = teal, Cancelled = rose, others amber/indigo.
- **Smart Narrative** text box (§4.7) auto-summarizing revenue, top location, and cancellation.
- **Q&A** button/visual (§4.6).

**Interactions:** Clicking a month column cross-filters the KPI band and donut. Location slicer cross-filters all. Drill-through to Restaurant 360 is **not** offered here because these visuals are grouped by location/month, not restaurant; R360 drill-through is launched from restaurant-level visuals (Page 2 table).

---

### PAGE 2 — Restaurant Performance

**Purpose:** Rank and compare restaurants and cuisines by revenue, rating, votes, and cost tier; the entry point to the Restaurant 360 drill-through.

> **Grain note:** The Restaurants sheet has many duplicate rows per real restaurant. `[Total Restaurants]` is `DISTINCTCOUNT(Restaurants[RestaurantID])`, so it counts keys, not rows. Revenue/order measures come from the `Orders` fact and relate to `Restaurants` once via `RestaurantID`, so grouping a fact measure by `Restaurants[name]` does **not** double-count orders even though the dimension has duplicate rows.

**Filter bar (y=24):** Title "Restaurant Performance". Slicers: `Restaurants[listed_in(type)]`, `Restaurants[location]`, `Rating Bucket` (calculated column), `Cost Bucket` (calculated column).

**KPI band (y=88):**
1. **Total Restaurants** → `[Total Restaurants]`.
2. **Avg Rating** → `[Avg Rating]` (format `"0.00"`).
3. **Avg Votes** → `[Avg Votes]`.
4. **Revenue per Restaurant** → `[Revenue per Restaurant]` (₹).
5. **Total Revenue** → `[Total Revenue]` (₹).

**Hero (left, y=200, ~640×300) — Top restaurants table (drill-through source):**
- **Table visual:** columns `Restaurants[name]`, `Restaurants[rest_type]`, `[Total Revenue]`, `[Total Orders]`, `[Avg Rating]`, `[Avg Votes]`, `[Revenue per Restaurant]`, and `Cost Bucket`.
- Sort by `[Total Revenue]` desc. **Conditional formatting:** data bars on `[Total Revenue]` (saffron); background color scale on `[Avg Rating]` (rose→amber→teal); icon column driven by `Rating Bucket`.
- This table is the primary **drill-through launch point** (right-click a row → *Drill through* → Restaurant 360).

**Supporting (right, y=200, ~490×300):**
- **Scatter chart** — X `Restaurants[CostForTwo]` (average), Y `[Avg Rating]`, Size `[Total Orders]`, Legend `Cost Bucket`, Details `Restaurants[name]`. Reveals price-vs-quality positioning. Play axis off.

**Detail (y=516):**
- **Clustered bar** — top cuisines/types: Axis `Restaurants[listed_in(type)]`, Value `[Total Revenue]`.
- **Matrix** — Rows `Restaurants[location]`, Columns `Rating Bucket`, Values `[Total Restaurants]`, with conditional heat shading.

**Interactions:** Selecting a `Cost Bucket` cross-filters the scatter + table. Table row → drill-through to Restaurant 360. Cross-highlighting enabled between bar/scatter/matrix.

---

### PAGE 3 — Delivery & Operations

**Purpose:** Operational health — delivery speed, late-delivery drivers, and cancellations, by time and location.

**Filter bar (y=24):** Title "Delivery & Operations". Slicers: `DateTable[Date]`, `Restaurants[location]`, `Delivery Status` (calculated column: Late / On Time), `Orders[OrderStatus]`. **`Late Threshold (mins)` what-if slider** at top-right (§4.2).

**KPI band (y=88):**
1. **Avg Delivery Time** → `[Avg Delivery Time]` (mins) — callout color: teal ≤ 35, amber 36–45, rose > 45.
2. **Late Orders** → `[Late Orders]`.
3. **Late Delivery %** → `[Late Delivery %]` (teal < 15%, amber 15–25%, rose > 25%).
4. **Cancelled Orders** → `[Cancelled Orders]`.
5. **Cancellation %** → `[Cancellation %]`.

**Hero (left, y=200, ~640×300) — Delivery-time trend:**
- **Line chart** — X `DateTable[MonthName]` (sorted by `MonthNo`), Y `[Avg Delivery Time]`, plus a **constant reference line at 45** (the static Late threshold) in rose (Analytics pane → Constant line). Optional second line `[Late Delivery %]` on the secondary axis.

**Supporting (right, y=200, ~490×300) — AI: Key Influencers:**
- **Key Influencers** visual (§4.6): **Analyze** `Orders[Delivery Status]`, examining value **"Late"**; **Explain by** `Restaurants[location]`, `Restaurants[listed_in(type)]`, `Orders[Quantity]`, `Restaurants[CostForTwo]`, `DateTable[MonthName]`. Surfaces what drives late deliveries.

**Detail (y=516):**
- **Clustered column chart** — late vs on-time by location: Axis `Restaurants[location]`, Legend `Orders[Delivery Status]`, Value `[Total Orders]` (teal/rose).
- **Gauge** — `[Late Delivery %]` vs target 0.20 (Max 1), rose over target.
- **Table** — Rows `Restaurants[location]`; values `[Avg Delivery Time]`, `[Late Delivery %]`, `[Cancellation %]`, with data bars.
- **Optional card:** `[Late Orders (Sim)]` beside `[Late Orders]` to demo the what-if slider (§4.2).

**Interactions:** Selecting a location column cross-filters the trend and gauge. `Delivery Status` slicer cross-filters all. Key Influencers respects page filters.

---

### PAGE 4 — Customer Analytics

**Purpose:** Who orders, retention, new vs returning, customer value, and geographic distribution.

**Filter bar (y=24):** Title "Customer Analytics". Slicers: `DateTable[Date]`, `Customers[City]`, `Customers[CustomerType]`.

**KPI band (y=88):**
1. **Total Customers** → `[Total Customers]`.
2. **Repeat Customers** → `[Repeat Customers]`.
3. **Repeat Customer %** → `[Repeat Customer %]` — teal if high.
4. **Orders Per Customer** → `[Orders Per Customer]`.
5. **Avg Order Value** → `[Avg Order Value]` (₹).

**Hero (left, y=200, ~640×300) — Customer growth:**
- **Line / area chart** — X `DateTable[MonthName]` (sorted by `MonthNo`), Y `[Total Customers]` and `[Repeat Customers]` as two series (teal / saffron).

**Supporting (right, y=200, ~490×300):**
- **Donut** — `Customers[CustomerType]` (New vs Returning): Legend `Customers[CustomerType]`, Value `[Total Customers]`. Returning = teal, New = amber.

**Detail (y=516):**
- **Decomposition Tree** (§4.6) — Analyze `[Total Revenue]`; Explain by `Customers[City]`, `Customers[CustomerType]`, `Restaurants[listed_in(type)]` (the analyst expands interactively during the interview).
- **Bar chart by city (recommended over a map)** — Axis `Customers[City]`, Value `[Total Revenue]` (or `[Total Customers]`). Because `Customers[City]` may contain Bangalore localities rather than distinct cities, a bar chart avoids geocoding ambiguity; if the field truly holds geocodable cities, a filled/Azure map with Location `Customers[City]` and bubble size `[Total Customers]` is an alternative.
- **Table** — Rows `Customers[City]`; values `[Total Customers]`, `[Repeat Customer %]`, `[Orders Per Customer]`, `[Total Revenue]`.

**Interactions:** CustomerType slicer cross-filters growth + decomposition tree. City selection cross-filters all.

---

### PAGE 5 — Restaurant 360 (Drill-through)

**Purpose:** Single-restaurant deep dive, reached by right-click **Drill through** from any restaurant-level visual (Page 2 table). Shows one restaurant's full profile and order performance.

**Drill-through setup (§4.3):** In the **Filters** pane for this page, add `Restaurants[name]` (and optionally `Restaurants[RestaurantID]`) to the **Drill-through** filter well. Set **"Keep all filters" = On**. A **Back button** is auto-added (top-left) so the user returns to the source page.

**Header band (y=24):**
- **Back button** (top-left).
- **Multi-row card** with restaurant identity: `Restaurants[name]`, `Restaurants[address]`, `Restaurants[location]`, `Restaurants[rest_type]`, `Restaurants[cuisines]`, `Restaurants[online_order]`, `Restaurants[book_table]`.
- **Dynamic title card** bound to a measure `Selected Restaurant = SELECTEDVALUE( Restaurants[name] )` (or the `Restaurants[name]` field on a Card visual) so the page header shows the drilled restaurant's name.

**KPI band (y=120):**
1. **Total Revenue** → `[Total Revenue]` (this restaurant, ₹).
2. **Total Orders** → `[Total Orders]`.
3. **Avg Rating** → `[Avg Rating]`.
4. **Avg Votes** → `[Avg Votes]`.
5. **Avg Delivery Time** → `[Avg Delivery Time]`.

**Body:**
- **Line chart** (left) — X `DateTable[MonthName]` (sorted by `MonthNo`), Y `[Total Revenue]` and `[Total Orders]`: this restaurant's order trend.
- **Cards** (right) — `Restaurants[Rating]` (with a `Rating Bucket` badge), `Restaurants[CostForTwo]` (with `Cost Bucket`), and `Restaurants[dish_liked]` in a text card.
- **Donut** — `Orders[OrderStatus]` for this restaurant, Value `[Total Orders]`.
- **Detail table** — Rows `Orders[OrderID]`; columns `Orders[OrderDate]`, `Orders[OrderValue]`, `Orders[Quantity]`, `Orders[DeliveryTimeMins]`, `Delivery Status`. (Use `Orders[OrderValue]` / `Orders[DeliveryTimeMins]` at row grain here rather than the `[Total Revenue]`/`[Avg Delivery Time]` aggregate measures, since each row is a single order.)

**Interactions:** All visuals inherit the single-restaurant drill-through filter. Back button returns to the source page.

---

## 4. Advanced Interactivity

### 4.1 Field-parameter metric switcher
This report reuses the **`KPI Selector`** field parameter defined in `03_DAX_Library.md` (Modeling → New parameter → Fields). Its generated calculated table:
```DAX
KPI Selector = {
    ( "Revenue",      NAMEOF( [Total Revenue] ),     0 ),
    ( "Orders",       NAMEOF( [Total Orders] ),      1 ),
    ( "AOV",          NAMEOF( [Avg Order Value] ),   2 ),
    ( "Avg Delivery", NAMEOF( [Avg Delivery Time] ), 3 )
}
```
- Measures are referenced **unqualified** inside `NAMEOF( … )` (they live on the hidden `_Measures` table; `NAMEOF` resolves them by name).
- The generated 3-column table exposes `'KPI Selector'[KPI Selector]` (label, set its *Sort by column* to `'KPI Selector'[KPI Selector Order]`), `'KPI Selector'[KPI Selector Fields]` (the measure reference), and `'KPI Selector'[KPI Selector Order]`.
- **Value well:** drop `'KPI Selector'[KPI Selector Fields]` onto the Exec Overview supporting bar chart.
- **Slicer:** bind `'KPI Selector'[KPI Selector]` (single-select, vertical list or tile style) directly above the visual (y≈176). Pair with the `KPI Title` measure for a reactive title.

> If you want the switcher to include Avg Rating instead of Avg Delivery, add `( "Avg Rating", NAMEOF( [Avg Rating] ), 4 )` to the table — but note Avg Rating is a `Restaurants`-based average, so it is only meaningful on a restaurant/location axis, not a monthly one.

### 4.2 What-if slider placement (Delivery-time target simulation)
Create **Modeling → New parameter → Numeric range**, name **`Late Threshold (mins)`**, Min 20, Max 90, Increment 5, Default 45. Power BI generates a `GENERATESERIES` table **and a harvesting measure** named `Late Threshold (mins) Value` (a **measure**, referenced as `[Late Threshold (mins) Value]` — not a table column).
- Place the generated **slider slicer** on **Page 3 (Delivery & Operations)** filter bar, top-right (x≈980, y=24, 200×48).
- Simulation measure (compares against the fixed 45-minute rule):
```DAX
Late Orders (Sim) =
VAR Threshold = [Late Threshold (mins) Value]
RETURN
    CALCULATE(
        [Total Orders],
        KEEPFILTERS( Orders[DeliveryTimeMins] > Threshold )
    )
```
- Show `[Late Orders (Sim)]` in a card beside the static `[Late Orders]` so the slider visibly recomputes. This filters the base column `Orders[DeliveryTimeMins]`, so the "late" definition genuinely moves with the slider. The `Delivery Status` calculated column stays fixed at 45 for cross-page consistency; the slider drives only the simulation measure.

> This mirrors the `Late Threshold` / `Dynamic Late Orders` pattern in `03_DAX_Library.md`; either the auto-generated `Late Threshold (mins)` parameter or the hand-authored `Late Threshold` table works — just reference the correct harvesting **measure** name.

### 4.3 Drill-through to Restaurant 360
1. On **Page 5**, add `Restaurants[name]` to the **Drill-through** filter well (Filters pane).
2. Set **Keep all filters = On**.
3. A **Back button** is auto-added; confirm it exists top-left.
4. From the Page 2 table (or any visual grouped by `Restaurants[name]`), right-click a row → **Drill through → Restaurant 360**. The target page opens filtered to that restaurant.

### 4.4 Custom report-page tooltip
Build a dedicated tooltip page:
- **Insert → New page**, name **"TT_Restaurant"**. **Format → Page information → Allow use as tooltip = On**; **Format → Canvas settings → Type = Tooltip** (320×240).
- Style with card background `#1B1E29` (inherited from theme).
- Contents: card `Restaurants[name]`; mini KPIs `[Total Revenue]`, `[Total Orders]`, `[Avg Rating]`, `[Avg Delivery Time]`; a sparkline/column chart of `[Total Revenue]` by `DateTable[MonthName]`.
- Assign it: on any restaurant-grouped visual → **Format → Tooltips → Type = Report page → Page = TT_Restaurant**. Hovering a restaurant/bar shows the rich card.
- Optionally a second tooltip page **"TT_Location"** for location visuals using `Restaurants[location]` and delivery KPIs (`[Avg Delivery Time]`, `[Late Delivery %]`).

### 4.5 Bookmark-driven hidden filter panel + reset + chart/table toggle

**Hidden filter panel:**
1. Draw a **panel rectangle** (x=880, y=88, w=400, h=560, fill `#1B1E29`, 12px radius) holding the "advanced" slicers (`Rating Bucket`, `Cost Bucket`, `Restaurants[listed_in(type)]`, `Customers[CustomerType]`, etc.) and a close (✕) button, plus a semi-transparent scrim rectangle over the rest of the page.
2. Group panel + slicers + scrim in the **Selection** pane.
3. Bookmark **"Filters Open"** (panel + scrim visible) and **"Filters Closed"** (hidden). In each bookmark's menu, **uncheck "Data"** (keep *Display* / *Current page*) so the bookmarks toggle **visibility only**, not selections.
4. A **funnel button** (nav rail or filter bar) → Action = Bookmark → "Filters Open". The ✕ button → Action = Bookmark → "Filters Closed".

**Reset button:**
- Capture a **"Reset"** bookmark while all slicers are cleared and the page is in its default state; **keep "Data" checked** for this one so it restores cleared selections. Wire the gear/reset button in the nav rail → Action = Bookmark → "Reset".

**Chart/Table toggle:**
- On (e.g.) Page 2, stack a **chart** and an equivalent **table** in the same zone. Create two bookmarks: **"View: Chart"** (chart visible, table hidden) and **"View: Table"** (reverse), with **"Data" unchecked**. Add two small toggle buttons ("▮▮ Chart" / "▤ Table") whose Actions point to each bookmark; use button state styling so the active view is highlighted in saffron.

### 4.6 AI visuals placement
| AI visual | Page | Analyze / config |
|---|---|---|
| **Key Influencers** | Page 3 Delivery | Analyze `Orders[Delivery Status]`, examine value "Late"; Explain by `Restaurants[location]`, `Restaurants[listed_in(type)]`, `Orders[Quantity]`, `Restaurants[CostForTwo]`, `DateTable[MonthName]` |
| **Decomposition Tree** | Page 4 Customer | Analyze `[Total Revenue]`; Explain by `Customers[City]`, `Customers[CustomerType]`, `Restaurants[listed_in(type)]` |
| **Q&A** | Page 1 Exec | Insert → Q&A visual (or a button that opens it); seed synonyms in Q&A setup |
| **Smart Narrative** | Page 1 Exec detail row | Auto-generated narrative over `[Total Revenue]`, `[Total Orders]`, `[Cancellation %]`, top `Restaurants[location]` |

**Q&A synonym tuning:** in **Modeling → Q&A setup**, add synonyms so raw column names read naturally — e.g., "restaurant" → `Restaurants[name]`, "area/locality" → `Restaurants[location]`, "cost for two" → `Restaurants[CostForTwo]`, "rating" → `Restaurants[Rating]`.

### 4.7 Smart Narrative details
Insert the Smart Narrative on Page 1. Edit the auto text to pin dynamic values referencing `[Total Revenue]`, `[Revenue Growth %]`, `[Cancellation %]`, and the top `Restaurants[location]` by `[Total Revenue]`, so it reads: "Revenue was ₹X (▲Y% vs prior month); highest in <location>; cancellation at Z%." (`[Revenue Growth %]` is the drafted month-over-month growth measure.)

### 4.8 Conditional formatting & KPI indicators
- **KPI cards** (Cancellation %, Late Delivery %, Avg Delivery Time): callout value **font color by rules** — teal `#2DD4BF` (good), amber `#FFB020` (watch), rose `#FB7185` (bad). Thresholds per §3.
- **Tables** (Pages 2, 3, 4, 5): data bars in saffron on revenue columns; background color scale rose→amber→teal on `[Avg Rating]` / `[Late Delivery %]`; **icons** driven by `Rating Bucket` / `Cost Bucket` / `Delivery Status`.
- **Revenue Growth %** wherever shown: font color via `[Revenue Growth %]` sign (teal ≥ 0, rose < 0); optionally prefix ▲/▼ with a helper measure.
- **Trend reference line:** rose constant line at the delivery-time threshold (45) on Page 3 (Analytics pane).

---

## 5. Accessibility

- **Contrast:** primary text `#E8EAF0` on `#1B1E29` ≈ 12:1 and on `#12141C` ≈ 14:1 (well above WCAG AA 4.5:1). Secondary text `#A2A8B8` on card ≈ 6:1 (passes AA for normal text). Saffron `#FF5A3C`, teal, amber, and rose are used for **large text / graphical elements** where the 3:1 non-text threshold applies; never use them for small body copy on the dark card.
- **Non-color encodings:** every status that uses color also carries a **text label or icon** — `Delivery Status` (On Time/Late text + ✓/! icon), `Orders[OrderStatus]` (labelled donut segments), `Rating Bucket` / `Cost Bucket` badges. Deltas show ▲/▼ glyphs, not color alone. Keeps the report legible for color-vision-deficient users.
- **Tab order:** in the **Selection pane → Tab order** (layer-order toggle), set a logical sequence per page: Page title → global slicers → KPI band (left→right) → hero → supporting → detail table → nav rail. Remove purely decorative shapes (accent bars, scrim, panel background) from tab order (set tab index to "hidden").
- **Alt text:** set **Format → General → Alt text** for every data visual with a concise description including the measure and dimension, e.g., "Line chart of Total Revenue by month; latest month ₹X, up Y% vs prior month." Decorative shapes → mark as not important for accessibility (blank/hidden alt text).
- **Focus / hit targets:** nav buttons are 56×56 (≥ 44px minimum touch target). Slicers use dropdown style to reduce clutter and keyboard-navigation length.
- **Font sizes:** no data-bearing text below 10px; 9px captions reserved for non-essential labels.
- **Keyboard:** all interactions (slicers, buttons, drill-through via context menu, bookmarks) are keyboard-reachable; verify with Tab / Enter in reading view.

---

## 6. Build Checklist (page order)

1. Apply `theme.json` (View → Themes → Browse for themes).
2. Set all analytical page sizes to 1280×720 (Custom); tooltip pages to Tooltip size.
3. Build the nav rail once, copy to all 5 pages; wire page-navigation actions + per-page selected states.
4. Build the 5 analytical pages per §3 (KPI band → hero → supporting → detail).
5. Confirm the `KPI Selector` field parameter and create the `Late Threshold (mins)` what-if parameter (§4.1–4.2).
6. Configure Restaurant 360 drill-through + Back button (§4.3).
7. Build tooltip page(s) and assign (§4.4).
8. Build bookmarks: filter panel open/close, reset, chart/table toggle (§4.5).
9. Place AI visuals + Smart Narrative + Q&A (§4.6–4.7).
10. Apply conditional formatting & KPI color rules (§4.8).
11. Set tab order + alt text on every page (§5).
12. Test drill-through, bookmarks, slicer sync, and RLS (`Restaurants[location]`) in view mode.
