# SaffronMetrics — 03. Complete DAX Library

**Project:** SaffronMetrics (Bangalore food-delivery analytics)
**Model:** Star schema — `Orders` (fact) → `Restaurants`, `Customers`, `DateTable` (dimensions), plus a hidden `_Measures` table
**Currency:** Indian Rupees (INR, ₹)
**Scope of this file:** Every calculated column, base measure, advanced measure, what-if parameter, field parameter, and calculation-group definition in the model — paste-ready and organized by display folder.

---

## Conventions used throughout

- **Post-transform column names only.** After Power Query, the model exposes `Restaurants[Rating]` (Decimal), `Restaurants[CostForTwo]` (Whole Number), and `Restaurants[Votes]` (Whole Number). The dirty source names `rate`, `approx_cost(for two people)`, and `votes` no longer exist and are never referenced here.
- **De-dup precondition.** `Restaurants` is reduced in Power Query to one row per `RestaurantID` (the raw sheet repeats each real restaurant across `listed_in(type)`/`listed_in(city)`). Every restaurant-side aggregation below (`Total Restaurants`, `Avg Rating`, `Avg Votes`, `Revenue per Restaurant`, `Restaurant Rank`) assumes that de-dup is done, so the `Orders[RestaurantID] → Restaurants[RestaurantID]` relationship is a true one-to-many. See `02_DataModel.md`.
- **Measures over calculated columns.** Anything that can be a measure is a measure (keeps the model small and filter-context-aware). Calculated columns are used only where a row-level attribute is needed for slicing/grouping.
- **`DIVIDE` for every division** to avoid divide-by-zero errors.
- **`VAR` / `RETURN`** for readability and single-evaluation performance.
- **Explicit format strings** applied to every measure (INR and % noted per folder).
- All measures live on the hidden, dedicated `_Measures` table (rating/votes measures stay conceptually with `Restaurants` but may still be housed in `_Measures`).

---

## (A) Calculated Columns

### `Restaurants` table

```dax
Cost Bucket =
SWITCH(
    TRUE(),
    ISBLANK( Restaurants[CostForTwo] ), "Unknown",
    Restaurants[CostForTwo] < 500,     "Budget",
    Restaurants[CostForTwo] < 1000,    "Mid Range",
    "Premium"
)
```

```dax
Rating Bucket =
SWITCH(
    TRUE(),
    ISBLANK( Restaurants[Rating] ), "Unrated",
    Restaurants[Rating] >= 4.5,     "Excellent",
    Restaurants[Rating] >= 4.0,     "Good",
    Restaurants[Rating] >= 3.0,     "Average",
    "Low"
)
```

> **Why the guard branches.** `Rating` is cleaned from a dirty text column that contained `"NEW"`, `"-"`, and nulls; those become `BLANK()` after the Power Query transform. `BLANK() >= 3.0` evaluates to `FALSE`, so without an explicit `ISBLANK()` branch a new/unrated restaurant would silently fall through to `"Low"` and be misclassified. The same guard is applied to `Cost Bucket` because some `approx_cost(for two people)` source values were blank.

### `Orders` table

```dax
Delivery Status =
IF( Orders[DeliveryTimeMins] > 45, "Late", "On Time" )
```

```dax
Order Month = FORMAT( Orders[OrderDate], "MMM YYYY" )
```

> `Order Month` is a **text** column. If you sort visuals by it, set its *Sort by column* to the numeric `Order Month Sort` (below) so `Jan 2024` precedes `Feb 2024` chronologically instead of alphabetically.

```dax
Order Month Sort = ( YEAR( Orders[OrderDate] ) * 100 ) + MONTH( Orders[OrderDate] )
```

### `Customers` table

```dax
-- CORRECTED: the original draft referenced 'Customer'[city].
-- The table is Customers (plural) and the column is City (capital C).
FilterCity =
VAR Val = Customers[City]
VAR WordCount = LEN( Val ) - LEN( SUBSTITUTE( Val, " ", "" ) ) + 1
RETURN
    IF(
        ISBLANK( Val ) || WordCount > 4 || LEN( Val ) > 50,
        BLANK(),
        Val
    )
```

```dax
Customer Tenure Days =
DATEDIFF( Customers[SignupDate], TODAY(), DAY )
```

> **Determinism note.** `TODAY()` makes tenure shift daily and recomputes on every refresh. For a stable, reproducible portfolio figure, anchor to the model's max order date instead:
> ```dax
> Customer Tenure Days =
> DATEDIFF(
>     Customers[SignupDate],
>     CALCULATE( MAX( Orders[OrderDate] ), ALL( Orders ) ),
>     DAY
> )
> ```

### `DateTable` table

The source `DateTable` sheet already carries `Year`, `MonthNo`, `MonthName`, `Quarter`, `Day`. Add day-of-week attributes for weekday/weekend analysis:

```dax
Day Name = FORMAT( DateTable[Date], "ddd" )        -- Mon, Tue, ...
```

```dax
Day Of Week = WEEKDAY( DateTable[Date], 2 )        -- 1 = Monday ... 7 = Sunday (Sort By for Day Name)
```

```dax
IsWeekend =
IF( WEEKDAY( DateTable[Date], 2 ) >= 6, "Weekend", "Weekday" )
```

> Set `Day Name`'s **Sort by column** to `Day Of Week`. Ensure `MonthName` is sorted by `MonthNo` (both exist in the source sheet). Then **mark `DateTable` as the date table** (Table tools → *Mark as date table* → `DateTable[Date]`) so all time-intelligence functions below resolve correctly.

---

## (B) Base + Core Measures (verified from the existing draft)

All measures below are corrected/verified versions of the analyst's drafted list. Format strings are noted per folder.

### Display Folder: `01 KPI`
*Format: INR measures → `"₹#,0"` (or `"₹#,0.00"` for AOV); counts → `"#,0"`.*

```dax
Total Orders = COUNTROWS( Orders )
```

> `COUNTROWS( Orders )` counts the fact grain (one row per order) and is marginally faster than `COUNT( Orders[OrderID] )`; both are correct because `OrderID` is non-blank. Use whichever you prefer — kept as `COUNTROWS` for clarity of intent.

```dax
Total Revenue = SUM( Orders[OrderValue] )
```

```dax
Avg Order Value = DIVIDE( [Total Revenue], [Total Orders] )
```

```dax
Avg Delivery Time = AVERAGE( Orders[DeliveryTimeMins] )
```

```dax
Total Customers = DISTINCTCOUNT( Orders[CustomerID] )
```

```dax
Total Restaurants = DISTINCTCOUNT( Restaurants[RestaurantID] )
```

```dax
Total Quantity = SUM( Orders[Quantity] )
```

### Display Folder: `02 Order Status`
*Format: counts → `"#,0"`; percentages → `"0.0%"`.*

```dax
Delivered Orders =
CALCULATE( [Total Orders], KEEPFILTERS( Orders[OrderStatus] = "Delivered" ) )
```

```dax
Cancelled Orders =
CALCULATE( [Total Orders], KEEPFILTERS( Orders[OrderStatus] = "Cancelled" ) )
```

```dax
Cancellation % =
DIVIDE( [Cancelled Orders], [Total Orders] )
```

```dax
Late Orders =
CALCULATE( [Total Orders], KEEPFILTERS( Orders[Delivery Status] = "Late" ) )
```

```dax
Late Delivery % =
DIVIDE( [Late Orders], [Total Orders] )
```

> `KEEPFILTERS` makes each status filter **intersect** with (rather than overwrite) any status the user already picked in a slicer, keeping the measure correct inside a status-sliced visual.

### Display Folder: `03 Customers`
*Format: counts → `"#,0"`; percentages → `"0.0%"`; ratios → `"0.00"`.*

```dax
Repeat Customers =
COUNTROWS(
    FILTER(
        VALUES( Orders[CustomerID] ),
        CALCULATE( COUNTROWS( Orders ) ) > 1
    )
)
```

```dax
Repeat Customer % =
DIVIDE( [Repeat Customers], [Total Customers] )
```

```dax
Orders Per Customer =
DIVIDE( [Total Orders], [Total Customers] )
```

> Attribute-based variant leveraging the `Customers[CustomerType]` dimension (Returning/New) — cheaper than the iterator when you only need the dimension split:
> ```dax
> Returning Customer Revenue =
> CALCULATE( [Total Revenue], KEEPFILTERS( Customers[CustomerType] = "Returning" ) )
> ```

### Display Folder: `04 Restaurant Performance`
*Format: INR → `"₹#,0"`; rating → `"0.00"`; votes → `"#,0"`.*

```dax
Revenue per Restaurant =
DIVIDE( [Total Revenue], [Total Restaurants] )
```

```dax
Avg Rating = AVERAGE( Restaurants[Rating] )
```

```dax
Avg Votes = AVERAGE( Restaurants[Votes] )
```

> `AVERAGE( Restaurants[Rating] )` automatically ignores the `BLANK()` ratings produced by cleaning `"NEW"`/`"-"`/nulls, so unrated restaurants do not drag the average toward zero.

### Display Folder: `05 Time Intelligence` (existing, verified)
*Format: INR → `"₹#,0"`; counts → `"#,0"`; percentages → `"0.0%"`.*

```dax
Revenue YTD = TOTALYTD( [Total Revenue], DateTable[Date] )
```

```dax
Orders YTD = TOTALYTD( [Total Orders], DateTable[Date] )
```

```dax
Revenue Previous Month =
CALCULATE( [Total Revenue], DATEADD( DateTable[Date], -1, MONTH ) )
```

```dax
Revenue Growth % =
DIVIDE(
    [Total Revenue] - [Revenue Previous Month],
    [Revenue Previous Month]
)
```

> These are correct **provided `DateTable` is marked as a date table** and the `Orders[OrderDate] → DateTable[Date]` relationship is active. `TOTALYTD` and `DATEADD` both require a contiguous marked date table (the source sheet is contiguous: 1,001 rows from 2023-01-01).

---

## (C) NEW Advanced Measures

### Display Folder: `05 Time Intelligence`

```dax
Revenue PY =
CALCULATE(
    [Total Revenue],
    SAMEPERIODLASTYEAR( DateTable[Date] )
)
```

```dax
Orders PY =
CALCULATE(
    [Total Orders],
    SAMEPERIODLASTYEAR( DateTable[Date] )
)
```

```dax
Revenue YoY % =
VAR Curr = [Total Revenue]
VAR Prior = [Revenue PY]
RETURN
    DIVIDE( Curr - Prior, Prior )
```

```dax
Orders YoY % =
DIVIDE( [Total Orders] - [Orders PY], [Orders PY] )
```

```dax
-- 3-month moving average of revenue (current month + prior 2), respecting the date filter
Revenue 3M Moving Avg =
VAR LastDateInContext = MAX( DateTable[Date] )
RETURN
    CALCULATE(
        DIVIDE( [Total Revenue], 3 ),
        DATESINPERIOD( DateTable[Date], LastDateInContext, -3, MONTH )
    )
```

> `DATESINPERIOD( ..., -3, MONTH )` returns the trailing three-month window ending at the last date in context; summing revenue over that window and dividing by the fixed divisor `3` yields the moving average. At the report's leading edge (first two months) fewer months exist, so the value is a lower partial average against a constant `3` — swap the divisor for a dynamic month count if you want a true partial-window mean.

### Display Folder: `06 Ranking & Share`
*Format: rank → `"#,0"`; share → `"0.0%"`.*

```dax
Restaurant Rank =
IF(
    HASONEVALUE( Restaurants[name] ),
    RANKX(
        ALL( Restaurants[name] ),
        [Total Revenue],
        ,
        DESC,
        DENSE
    )
)
```

> `ALL( Restaurants[name] )` clears only the restaurant-name filter (not other slicers like location/cuisine), so the rank is computed within whatever other context is applied. `HASONEVALUE` guards the total row so the grand total shows `BLANK()` instead of a meaningless rank. `DENSE` avoids rank gaps on ties. Note: `name` is not a business key — if two distinct restaurants share a name they collapse into one rank bucket. Rank on `Restaurants[RestaurantID]` (and display the name) if you need per-entity ranking.

```dax
% of Total Revenue =
VAR CurrentRevenue = [Total Revenue]
VAR VisibleRevenue =
    CALCULATE( [Total Revenue], ALLSELECTED( Restaurants[name] ) )
RETURN
    DIVIDE( CurrentRevenue, VisibleRevenue )
```

> `ALLSELECTED` gives the "% of the currently visible/selected set" (respects outer slicers), which is what users expect in a matrix of restaurants. Swap for `ALL( Restaurants )` if you want share of the grand total regardless of slicers.

### Display Folder: `09 Dynamic Titles`
*Format: text.*

```dax
-- Dynamic subtitle/title driven by the KPI field parameter (see section E)
KPI Title =
"Showing: "
    & SELECTEDVALUE( 'KPI Selector'[KPI Selector], "Revenue" )
    & " by month"
```

> `SELECTEDVALUE` returns the single selected field-parameter label, or the fallback `"Revenue"` when nothing / multiple are selected. Bind this measure to a card, or to the visual's *Title → conditional formatting (fx) → Field value*, to make titles react to the parameter.

---

## (D) What-If Parameters (disconnected parameter tables)

Create these via **Modeling → New parameter → Numeric range**. Power BI auto-generates the `GENERATESERIES` calculated table, the slicer, and the `SELECTEDVALUE` harvesting measure. The generated DAX is shown so it can be recreated by hand / in Tabular Editor.

### Parameter table: `Late Threshold`

```dax
-- Calculated table
Late Threshold = GENERATESERIES( 15, 90, 5 )   -- minutes, 15 → 90 in steps of 5
```

The single column is `'Late Threshold'[Late Threshold]`. Auto-generated harvesting measure:

```dax
Late Threshold Value =
SELECTEDVALUE( 'Late Threshold'[Late Threshold], 45 )   -- default 45 mins
```

Measures that **consume** it (dynamic late %, recomputed against the user-chosen threshold instead of the hard-coded 45):

```dax
Dynamic Late Orders =
VAR Threshold = [Late Threshold Value]
RETURN
    CALCULATE(
        [Total Orders],
        KEEPFILTERS( Orders[DeliveryTimeMins] > Threshold )
    )
```

```dax
Dynamic Late % =
DIVIDE( [Dynamic Late Orders], [Total Orders] )
```

> This filters on the base column `Orders[DeliveryTimeMins]` (not the static `Delivery Status` column), so the "late" definition genuinely moves with the slider.

### Parameter table: `Discount %`

```dax
-- Calculated table
Discount % = GENERATESERIES( 0, 0.30, 0.01 )   -- 0% → 30% in 1-point steps
```

The single column is `'Discount %'[Discount %]`. Auto-generated harvesting measure:

```dax
Discount Value =
SELECTEDVALUE( 'Discount %'[Discount %], 0 )
```

Measures that **consume** it (simulated discounted revenue and the rupee value given away):

```dax
Simulated Discounted Revenue =
[Total Revenue] * ( 1 - [Discount Value] )
```

```dax
Discount Impact (INR) =
[Total Revenue] - [Simulated Discounted Revenue]   -- = Total Revenue * Discount Value
```

> Set the `'Discount %'[Discount %]` column format to `"0%"` so the slicer shows `0% … 30%`. Format `Simulated Discounted Revenue` and `Discount Impact (INR)` as `"₹#,0"`. (The harvesting measure is named `Discount Value` rather than `Discount % Value` to avoid a `%` inside a measure name that must be quoted downstream.)

---

## (E) Field Parameter — KPI Metric Switcher

Create via **Modeling → New parameter → Fields**, adding the four base measures. Power BI generates a calculated table named `KPI Selector`. Generated DAX (edit display labels / order freely):

```dax
KPI Selector =
{
    ( "Revenue",       NAMEOF( [Total Revenue] ),     0 ),
    ( "Orders",        NAMEOF( [Total Orders] ),      1 ),
    ( "AOV",           NAMEOF( [Avg Order Value] ),   2 ),
    ( "Avg Delivery",  NAMEOF( [Avg Delivery Time] ), 3 )
}
```

This yields a 3-column table:
- `KPI Selector[KPI Selector]` — the display label (`Revenue`, `Orders`, `AOV`, `Avg Delivery`).
- `KPI Selector[KPI Selector Fields]` — the underlying measure reference (Power BI stores this as text like `'_Measures'[Total Revenue]`).
- `KPI Selector[KPI Selector Order]` — sort order (set as the *Sort by column* for the label).

**Usage:** drop `KPI Selector[KPI Selector Fields]` onto the Values well of a chart and `KPI Selector[KPI Selector]` into a slicer. The visual then plots whichever KPI the user picks. Pair with the `KPI Title` measure (section C) for a reactive title.

> Because AOV and Avg Delivery Time are ratios/averages while Revenue and Orders are additive, keep this parameter on visuals where mixed aggregation is acceptable (a single-value card, or a by-month line where each metric is independently valid). The field parameter honors each measure's **own** format string, so set INR/count/decimal formats on the base measures individually.

---

## (F) Time-Intelligence Calculation Group (Tabular Editor)

Build in **Tabular Editor 2 (free) or 3** → right-click *Tables* → *Create → Calculation Group*. This replaces authoring PY/YTD/YoY/MoM variants for every base measure — one group services all measures via `SELECTEDMEASURE()`.

**Calculation group name:** `Time Calc`
**Precedence:** `10` (only relevant if you add more calc groups later)
**Column name:** `Time Calc[Time Calculation]`

### Calculation Items (in order)

**1. Current**
```dax
SELECTEDMEASURE()
```

**2. YTD**
```dax
CALCULATE(
    SELECTEDMEASURE(),
    DATESYTD( DateTable[Date] )
)
```

**3. PY**
```dax
CALCULATE(
    SELECTEDMEASURE(),
    SAMEPERIODLASTYEAR( DateTable[Date] )
)
```

**4. YoY %**
```dax
VAR Curr = SELECTEDMEASURE()
VAR Prior =
    CALCULATE(
        SELECTEDMEASURE(),
        SAMEPERIODLASTYEAR( DateTable[Date] )
    )
RETURN
    DIVIDE( Curr - Prior, Prior )
```
*Format String Expression for this item:* `"0.0%"`

**5. MoM %**
```dax
VAR Curr = SELECTEDMEASURE()
VAR Prior =
    CALCULATE(
        SELECTEDMEASURE(),
        DATEADD( DateTable[Date], -1, MONTH )
    )
RETURN
    DIVIDE( Curr - Prior, Prior )
```
*Format String Expression for this item:* `"0.0%"`

> **Notes**
> - Items 4 and 5 return ratios, so set a **Format String Expression** on those items (`"0.0%"`) so the result overrides the base measure's INR/count format. Items 1–3 inherit the selected measure's own format (leave their format-string expression blank).
> - Use the group by putting `Time Calc[Time Calculation]` on an axis/slicer alongside any base measure — e.g., a matrix with `Total Revenue` in Values and `Time Calc` on columns instantly shows Current / YTD / PY / YoY % / MoM %.
> - Requires `DateTable` to be marked as a date table (see section A). Calculation groups are a standard Analysis Services / Power BI feature and work in the free Power BI Desktop model — no Premium capacity required to author or use them.

---

## (G) Formatting & Best-Practice Notes

**Aggregation strategy**
- Prefer **measures over calculated columns**. The only calculated columns in this model are true row-level attributes needed for slicing (`Cost Bucket`, `Rating Bucket`, `Delivery Status`, `Order Month`, `Order Month Sort`, `FilterCity`, `Customer Tenure Days`, `Day Name`, `Day Of Week`, `IsWeekend`). Everything aggregable is a measure.
- On the 200k-row `Orders` fact, avoid per-row calculated columns that could instead be measures — they inflate the model and defeat VertiPaq compression.

**Safe division & blank handling**
- Every ratio uses `DIVIDE( numerator, denominator )` (optionally a 3rd argument for an alternate result) — never the `/` operator — to prevent `Infinity`/error on a zero denominator.
- `Rating Bucket`, `Cost Bucket`, and rating measures account for `BLANK()` values produced by cleaning the dirty `rate`/`approx_cost(for two people)` columns. `AVERAGE( Restaurants[Rating] )` already ignores blanks.

**Filter-context correctness**
- `KEEPFILTERS` wraps the equality filters in status/threshold measures so a user's existing slicer selection is **intersected**, not overwritten — critical when these measures appear inside a status- or delivery-sliced visual.
- Ranking uses `ALL( Restaurants[name] )` (single column) rather than `ALL( Restaurants )` so other restaurant slicers (location, cuisine, cost bucket) still constrain the rank set.
- `% of Total Revenue` uses `ALLSELECTED` to give share of the visible selection; switch to `ALL( Restaurants )` for share of grand total.

**Format strings (apply via Measure tools → Format)**
- INR currency: `"₹#,0"` (whole rupees) or `"₹#,0.00"` (AOV). Alternatively use the built-in Currency format with the `en-IN` locale so lakh/crore grouping renders correctly.
- Percentages: `"0.0%"`.
- Counts / ranks: `"#,0"`.
- Rating: `"0.00"`.
- Text/title measures (`KPI Title`): default text.

**Readability & performance**
- Use `VAR` / `RETURN` to evaluate a sub-expression once (e.g., `Revenue YoY %`, `Restaurant Rank`, `% of Total Revenue`, `Dynamic Late Orders`) — clearer and avoids re-evaluating `[Total Revenue]` twice.
- Keep base measures thin (`Total Revenue = SUM(...)`) and build advanced measures **on top of them** (measure branching) rather than re-writing `SUM( Orders[OrderValue] )` everywhere — one place to fix, consistent results.

**Model hygiene prerequisites for this library to resolve**
1. Power Query renames complete: `rate → Rating`, `approx_cost(for two people) → CostForTwo`, `votes → Votes`.
2. `Restaurants` de-duplicated to one unique row per `RestaurantID` (see `02_DataModel.md`).
3. `DateTable` marked as the date table on `DateTable[Date]`.
4. Active single-direction relationships: `Orders[RestaurantID] → Restaurants[RestaurantID]`, `Orders[CustomerID] → Customers[CustomerID]`, `Orders[OrderDate] → DateTable[Date]`.
5. RLS filters `Restaurants[location]` (defined in the security/RLS section, not here).
6. Sort-by columns set: `MonthName` by `MonthNo`; `Order Month` by `Order Month Sort`; `Day Name` by `Day Of Week`.

---

*End of 03_DAX_Library.md*
