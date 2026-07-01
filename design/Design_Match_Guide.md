# Design Match Guide — Reproduce the FP20 "Dark Indigo" Look

Goal: make your food-delivery report look like the reference dashboard (dark canvas, left nav sidebar, purple accent, gradient bars, KPI cards with sparklines + vs PY, year tiles, hero image). **Content stays the same — only the design changes.**

The theme file `theme.json` (Indigo Noir) already handles colors, fonts, dark cards, gridlines. Everything below is the *structure* you build once in Power BI Desktop.

---

## 0. Apply the theme first
View → Themes → **Browse for themes** → select `theme.json`. Set each page size to **1280 × 720** (Format page → Canvas settings).

---

## 1. Left navigation sidebar (the signature element)
1. **Insert → Shapes → Rectangle**. Place it on the far left: X=0, Y=0, Width≈210, Height=720.
2. Format shape → Fill `#0A0A0C` (darker than canvas), Border off, **Rounded corners ≈ 18**.
3. **Logo:** Insert → Text box (or Image) at the top — e.g. "SAFFRON / ANALYTICS" in white bold + a small tagline.
4. **Reset button:** Insert → Buttons → **Blank**; add an eraser/refresh icon; Action = **Bookmark** → a "Clear All" bookmark (with all slicers cleared).
5. **Slicers (stacked, dropdown style):** put these 4 inside the sidebar, each as a **dropdown** slicer with its field name as the header:
   - Region → `Restaurants[location]`
   - Category → `Restaurants[cuisines]` (or `rest_type`)
   - Segment → `Customers[CustomerType]`
   - City → `Customers[City]` (cleaned `FilterCity`)
6. **Page navigation arrows:** Insert → Buttons → **Back** (`←`) and **Blank** with a `→` icon; Action = **Page navigation** to previous / next page. Place at the bottom of the sidebar.

## 2. Header bar (top)
1. **Title block (left):** Text box — line 1 "Bangalore Food Delivery" (white, 20pt semibold), line 2 "Restaurant & Delivery Analytics" (gray, 12pt).
2. **Year tiles (right):** add a **Slicer** on `DateTable[Year]`. Format → **Slicer settings → Options → Orientation = Horizontal**. It renders as tiles; the selected year picks up the purple accent automatically.
3. **Filter button:** Insert → Buttons → Blank with a **funnel icon**, fill purple `#6C4AE0`; Action = Bookmark that opens a hidden filter panel.

## 3. KPI cards with sparkline + "▲ vs PY"
Use the **new Card visual** (it supports sparklines and reference labels):
1. Insert **Card (new)** → add one measure (e.g. `[Total Revenue]`).
2. **Sparkline:** in the card's *Data* well, add a sparkline over `DateTable[Date]` using the same measure. (Card → add sparkline.)
3. **Reference label (▲ 0% vs PY):** add `[Revenue YoY %]` as a reference label; set its font conditional color — green `#3DDC84` if ≥0, red `#F43F5E` if <0 — and prefix "vs PY".
4. Duplicate for your KPIs (keep YOUR content):

| Reference card | Your card (same content) |
|---|---|
| Total Sales | Total Revenue |
| Qty Sold | Total Quantity (SUM Quantity) |
| Return_Rate | Cancellation % |
| Lost Revenue | Cancelled Orders value |
| Ave. Delivery Days | Avg Delivery Time |
| Total Orders | Total Orders |
| Total Customers | Total Customers |
| Total Profit | Revenue per Restaurant |

Arrange 4 across × 2 rows. Select all → Format → **Align → Distribute horizontally** for even spacing.

## 4. Hero image panel (top-right)
1. Insert → **Shapes → Rectangle**, fill = **Gradient** purple `#6C4AE0` → `#3A2E9E`, rounded 16.
2. Insert → **Image** — a transparent-background food-delivery rider / boxes PNG; place on top of the gradient.
3. Overlay a small **Card (new)** with `[Avg Delivery Time]` + sparkline (white text, transparent background).

## 5. Gradient bars (purple → green)
For each bar/column chart:
1. Select the chart → Format → **Bars → Color → fx** (conditional formatting).
2. Format style = **Gradient**. Minimum = `#6C4AE0` (purple), Maximum = `#3DDC84` (green), based on the value.
This reproduces the reference's purple-to-green bar fills. The donut uses the theme palette (purple / blue / tan) automatically.

## 6. Drill-through pages ("Back" + "?")
On charts that drill through (State/City, delivery-by-category), add:
- **Back button:** Insert → Buttons → **Back** (top-left of the visual).
- **"?" help:** Insert → Buttons → Blank with a "?" icon; add a **tooltip** explaining the chart.

## 7. Custom "Interact" tooltip (optional)
Create a **Tooltip page** (Page size = Tooltip), design a mini card, then set each visual → Format → **Tooltip → Report page → [your tooltip page]**.

---

## Color reference (from the theme)
| Element | Hex |
|---|---|
| Canvas / page | `#101119` |
| Sidebar | `#0A0A0C` |
| Card | `#16171F` |
| Accent purple | `#6C4AE0` |
| Gradient low → high | `#6C4AE0` → `#3DDC84` |
| Positive / up | `#3DDC84` |
| Negative / down | `#F43F5E` |
| Text / muted | `#EAECF2` / `#9AA0AE` |

## Build order (fastest)
1. Apply `theme.json`. 2. Sidebar shape + logo + slicers + nav arrows. 3. Header title + year tiles + filter button. 4. Convert KPIs to new Card + sparkline + vs-PY label. 5. Hero image panel. 6. Gradient bars. 7. Back/? buttons. 8. Save → re-check on every page.
