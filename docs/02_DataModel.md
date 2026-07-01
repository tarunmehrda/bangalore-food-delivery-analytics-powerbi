# 02 — Data Model & Relationships

**Project:** SaffronMetrics — Bangalore Food-Delivery Analytics
**Component:** Star-schema data model, relationships, date-table configuration, and Row-Level Security
**Model type:** Single fact table (`Orders`) surrounded by three conformed dimensions (`Restaurants`, `Customers`, `DateTable`), plus one hidden calculation-group/measure holder (`_Measures`).

All references below use the column names that exist **after** the Power Query transforms documented in `01_PowerQuery_Transformations.md`:

- `Restaurants[rate]` -> `Restaurants[Rating]` (Decimal)
- `Restaurants[approx_cost(for two people)]` -> `Restaurants[CostForTwo]` (Whole Number)
- `Restaurants[votes]` -> `Restaurants[Votes]` (Whole Number)

Every DAX/M reference in this document points at a real column that survives those transforms.

---

## 1. Star-Schema Overview

The model is a textbook **single-fact star**. `Orders` is the only fact table (grain = one order line, 200,000 rows). Filters flow **from the dimensions into the fact** and never in reverse. There are no dimension-to-dimension relationships (`Restaurants` and `Customers` communicate only *through* `Orders`), which is what keeps the schema a clean star rather than a snowflake.

```
                         +---------------------------+
                         |        DateTable          |
                         |  (Date dimension, 1,001)  |
                         |  PK: Date                 |
                         +-------------+-------------+
                                       | 1
                                       |  DateTable[Date] -> Orders[OrderDate]  (active)
                                       |  DateTable[Date] -> Customers[SignupDate] (INACTIVE)
                                       v *
   +---------------------+        +----------------------------+        +----------------------+
   |    Customers        | 1    * |          ORDERS            | *    1 |     Restaurants      |
   | (Customer dim,      |------->|      (FACT, grain = 1      |<-------| (Restaurant dim,     |
   |  20,000 rows)       |        |       order; 200,000 rows) |        |  56,251 raw rows*)   |
   | PK: CustomerID      |        |  FK: CustomerID            |        | PK: RestaurantID     |
   +---------------------+        |  FK: RestaurantID          |        +----------------------+
       CustomerID ->              |  FK: OrderDate             |            RestaurantID ->
       Orders[CustomerID]         |  Measures: OrderValue,     |            Orders[RestaurantID]
                                  |    DeliveryTimeMins,       |
                                  |    Quantity, OrderStatus   |
                                  +----------------------------+

   +---------------------------------------------------------+
   |  _Measures  (hidden, 0 data rows — holds all measures)  |
   +---------------------------------------------------------+

   * Restaurants contains many duplicate rows per real restaurant (same name/address
     repeated across listed_in(type)/listed_in(city)). See the de-duplication note below —
     RestaurantID MUST be unique on the "1" side of its relationship or the join breaks.
```

### Grain and role of each table

| Table | Role | Grain | Rows | Primary key |
|---|---|---|---|---|
| `Orders` | Fact | One order | 200,000 | `OrderID` |
| `Restaurants` | Dimension | One restaurant | 56,251 raw (**must be de-duplicated to unique `RestaurantID`**) | `RestaurantID` |
| `Customers` | Dimension | One customer | 20,000 | `CustomerID` |
| `DateTable` | Date dimension | One calendar day | 1,001 | `Date` |
| `_Measures` | Measure holder | n/a (hidden, no rows) | 0 | none |

> **CRITICAL de-duplication dependency.** The relationship `Restaurants[RestaurantID] -> Orders[RestaurantID]` is **one-to-many** and therefore requires `RestaurantID` to be **unique** in `Restaurants`. The raw sheet repeats each real restaurant across `listed_in(type)` / `listed_in(city)` combinations, so `RestaurantID` is *not* unique as delivered. In Power Query you must reduce `Restaurants` to one row per `RestaurantID` (`Table.Distinct` on `RestaurantID`, keeping the first non-null `Rating`/`CostForTwo`). If this is skipped, Power BI will silently coerce the relationship to **many-to-many** and every restaurant-side aggregation (`Avg Rating`, `Total Restaurants`, `Revenue per Restaurant`) will be wrong. This is documented in `01_PowerQuery_Transformations.md`; it is restated here because it is a *modeling* precondition, not just a cleaning nicety.

---

## 2. Relationships

Create these in **Model view**. All active relationships are **single-direction** `1:*` (one dimension row -> many fact rows), filter flowing **dimension -> `Orders`**.

| # | From (many side) | To (one side) | Cardinality | Cross-filter | Active? | Notes |
|---|---|---|---|---|---|---|
| R1 | `Orders[OrderDate]` | `DateTable[Date]` | Many-to-One (`*:1`) | Single (Date -> Orders) | **Active** | Primary date relationship. Powers all time-intelligence. |
| R2 | `Orders[RestaurantID]` | `Restaurants[RestaurantID]` | Many-to-One (`*:1`) | Single (Restaurants -> Orders) | **Active** | Requires unique `RestaurantID` after de-dup (Section 1). |
| R3 | `Orders[CustomerID]` | `Customers[CustomerID]` | Many-to-One (`*:1`) | Single (Customers -> Orders) | **Active** | — |
| R4 | `Customers[SignupDate]` | `DateTable[Date]` | Many-to-One (`*:1`) | Single (Date -> Customers) | **INACTIVE** | Second relationship to `DateTable`. Only one relationship to the same table can be active, so this stays inactive and is invoked on demand with `USERELATIONSHIP`. |

> In the relationship editor the "From" column is conventionally the **many** side. The arrows above read many -> one to match that dialog. Semantically the *filter* propagates one -> many (dimension filters the fact).

### 2.1 Why R4 is inactive

`DateTable` already has an active relationship to `Orders` (R1). A table can have only **one active** relationship path to another table. A signup-date analysis (e.g., "customers who signed up in Q1 2024") needs `DateTable` to filter `Customers[SignupDate]` instead of `Orders[OrderDate]`, so R4 exists but is **inactive** and is activated per-measure with `USERELATIONSHIP`.

### 2.2 USERELATIONSHIP usage for the inactive relationship

```dax
-- Count of customers whose SignupDate falls in the current DateTable filter context.
-- Uses the INACTIVE relationship R4 (Customers[SignupDate] -> DateTable[Date]).
New Signups =
CALCULATE (
    DISTINCTCOUNT ( Customers[CustomerID] ),
    USERELATIONSHIP ( Customers[SignupDate], DateTable[Date] )
)
```

```dax
-- Optional companion: signups in the selected period that are flagged "New".
New Signups (New Type) =
CALCULATE (
    DISTINCTCOUNT ( Customers[CustomerID] ),
    USERELATIONSHIP ( Customers[SignupDate], DateTable[Date] ),
    Customers[CustomerType] = "New"
)
```

Because R4 is inactive, `New Signups` sliced by `DateTable[MonthName]`/`DateTable[Year]` returns **signup** counts, while a plain `[Total Orders]` sliced by the same date fields still returns **order** counts via R1. The two coexist without ambiguity.

---

## 3. Date-Table Configuration & Model Hygiene

### 3.1 Mark `DateTable` as a date table

Model view -> right-click `DateTable` -> **Mark as date table** -> choose the `Date` column.
Requirements Power BI enforces (all satisfied by the source sheet): the marked column is a `Date`/`DateTime` type, contains **unique** values, and has **no gaps** across its full range (2023-01-01 onward, ~2.7 years, 1,001 contiguous days).

Marking the date table guarantees that `TOTALYTD`, `DATEADD`, `SAMEPERIODLASTYEAR`, etc. use `DateTable` as the canonical calendar. The already-drafted measures depend on this:

```dax
Revenue YTD          = TOTALYTD ( [Total Revenue], DateTable[Date] )
Orders YTD           = TOTALYTD ( [Total Orders],  DateTable[Date] )
Revenue Previous Month =
    CALCULATE ( [Total Revenue], DATEADD ( DateTable[Date], -1, MONTH ) )
Revenue Growth %     =
    DIVIDE ( [Total Revenue] - [Revenue Previous Month], [Revenue Previous Month] )
```

### 3.2 Disable Auto Date/Time — and why

**File -> Options -> Data Load -> Time intelligence -> uncheck "Auto date/time"** (both global and current-file).

Reasons:
1. **Avoids hidden per-column date hierarchies.** With Auto Date/Time on, Power BI creates a hidden auto-calendar table behind *every* date column (`OrderDate`, `SignupDate`, `DateTable[Date]`), bloating the model and RAM.
2. **Single source of truth.** We already own a purpose-built `DateTable`. Auto-generated hierarchies would compete with it and let report authors accidentally bind visuals to the wrong (hidden) calendar.
3. **Deterministic time intelligence.** `TOTALYTD`/`DATEADD` should resolve against the *marked* `DateTable`, not an auto table.

### 3.3 Hide foreign keys and raw/helper columns from Report view

Right-click -> **Hide in report view** for columns that exist only to support relationships or that were superseded by a cleaned version. This declutters the Fields pane and steers report authors to the correct, human-readable fields.

| Table | Hide these columns | Reason |
|---|---|---|
| `Orders` | `RestaurantID`, `CustomerID`, `OrderDate` | Foreign keys — filtering is done via the dimension tables, not the raw FK. Keep `OrderID` visible only if needed for drill/detail. |
| `Restaurants` | `RestaurantID`, `address` | PK used only for the join; `address` is high-cardinality free text not used in visuals. |
| `Customers` | `CustomerID`, `SignupDate` | PK used only for the join; `SignupDate` is surfaced through `DateTable` via R4. |
| `DateTable` | `Date` | Keep visible if used as an axis; otherwise expose `Year`/`MonthName`/`Quarter` and hide the raw key. (Optional.) |

> Do **not** delete foreign keys — they are needed for the relationships. **Hide**, don't remove.

### 3.4 Naming conventions

- **Tables:** singular-concept business names, PascalCase (`Orders`, `Restaurants`, `Customers`, `DateTable`). Hidden utility table prefixed with underscore: `_Measures`.
- **Columns:** friendly, spaced titles for report-facing columns (`Cost Bucket`, `Rating Bucket`, `Delivery Status`, `Order Month`); the cleaned/renamed source columns follow the plan (`Rating`, `CostForTwo`, `Votes`).
- **Measures:** Title Case with spaces, no table prefix in the name itself (`Total Revenue`, `Cancellation %`). Always **reference** measures with brackets only (`[Total Revenue]`) and columns fully qualified (`Orders[OrderValue]`) — this is the exact convention the drafted DAX uses and it must stay consistent.
- **Keys vs. attributes:** ID/FK columns keep source-style names (`RestaurantID`, `CustomerID`) and are hidden; descriptive attributes get friendly names.

### 3.5 Dedicated hidden `_Measures` table

Create an empty table to hold **all** measures so they are not scattered across data tables and don't appear to "belong" to a physical column.

Power Query (Home -> Enter Data, or a blank query):

```m
// _Measures : a single-column, single-row placeholder table.
// It holds every measure. After creation, hide the whole table in Model view
// (its lone dummy column never appears in visuals).
// Note: Table.FromRows takes an explicit list-of-lists, so no compressed
// "Enter Data" blob is needed — this is fully readable and reproducible.
let
    Source = Table.FromRows(
        { { "x" } },          // one row, one cell
        { "Placeholder" }     // one column name
    ),
    #"Typed" = Table.TransformColumnTypes( Source, { { "Placeholder", type text } } )
in
    #"Typed"
```

Alternatively (no query at all): **Home -> Enter Data**, create a table named `_Measures` with one throwaway column, load it, then in Model view **hide the entire table**. Once a measure "home table" is set to `_Measures`, drag the measures there; the leading underscore sorts it to the top of the Fields pane and the hidden flag keeps its dummy column out of sight. Report authors then see a clean *fx* measures folder rather than measures buried under `Orders`.

---

## 4. Optional — DAX Date-Table Alternative Script

If `DateTable` ever needs regenerating (e.g., the Excel sheet is dropped), create this **calculated table** in DAX. It reproduces every column the model uses (`Year`, `MonthNo`, `MonthName`, `Quarter`, `Day`) and adds two convenience columns (`Day Name`, `IsWeekend`). After creating it, re-apply **Mark as date table** on `[Date]` and rebuild relationships R1 and R4.

```dax
DateTable =
VAR _MinDate = DATE ( 2023, 1, 1 )
-- CALENDARAUTO() would auto-derive the range from the model instead;
-- here we pin the start to match the source (2023-01-01) and extend ~3 years.
VAR _MaxDate = DATE ( 2025, 12, 31 )
RETURN
ADDCOLUMNS (
    CALENDAR ( _MinDate, _MaxDate ),
    "Year",      YEAR ( [Date] ),
    "MonthNo",   MONTH ( [Date] ),
    "MonthName", FORMAT ( [Date], "MMM" ),           -- "Jan".."Dec"
    "Quarter",   "Q" & QUARTER ( [Date] ),            -- "Q1".."Q4"  (DAX FORMAT has NO "Q" token; use QUARTER())
    "Day",       DAY ( [Date] ),
    "Day Name",  FORMAT ( [Date], "dddd" ),           -- "Monday".."Sunday"
    "IsWeekend", IF ( WEEKDAY ( [Date], 2 ) >= 6, TRUE (), FALSE () )
)
```

CALENDARAUTO variant (auto-sizes to the min/max of all date columns in the model):

```dax
DateTable =
ADDCOLUMNS (
    CALENDARAUTO (),   -- fiscal year end = December by default
    "Year",      YEAR ( [Date] ),
    "MonthNo",   MONTH ( [Date] ),
    "MonthName", FORMAT ( [Date], "MMM" ),
    "Quarter",   "Q" & QUARTER ( [Date] ),            -- DAX FORMAT has NO "Q" token; use QUARTER()
    "Day",       DAY ( [Date] ),
    "Day Name",  FORMAT ( [Date], "dddd" ),
    "IsWeekend", IF ( WEEKDAY ( [Date], 2 ) >= 6, TRUE (), FALSE () )
)
```

> **Sort hygiene after regeneration:** set `MonthName` **Sort by column -> `MonthNo`** so months order Jan..Dec rather than alphabetically. If you keep a text `Order Month` axis (`FORMAT(OrderDate,"MMM YYYY")` on `Orders`), sort it by a numeric key such as `Year*100 + MonthNo` to avoid "Apr 2023" sorting before "Jan 2023".

---

## 5. Row-Level Security (RLS)

RLS filters `Restaurants[location]` (a real column, e.g., *Banashankari*, *Koramangala*). Because filters flow `Restaurants -> Orders` through active relationship R2, restricting `Restaurants` automatically restricts the visible `Orders` rows — no filter needs to be written on the fact table itself.

### 5.1 Static role — "City Manager"

**Modeling -> Manage roles -> Create**, role name `City Manager`, table `Restaurants`:

```dax
-- Static filter: this role only ever sees Banashankari restaurants (and their orders).
[location] = "Banashankari"
```

This is the simplest, most defensible pattern for a portfolio build: one hard-coded region per role. To demonstrate multiple regions, clone the role (`City Manager - Koramangala`, etc.), each with its own literal. Validate with **Modeling -> View as -> City Manager**: every visual should collapse to that single location, and `[Total Orders]` / `[Total Revenue]` should drop accordingly because R2 cascades the restriction into `Orders`.

> **Why filter the dimension, not the fact:** `Restaurants` has ~one row per restaurant after de-dup, so the security predicate is evaluated over a small table and then propagates via the relationship. Filtering `Orders` directly (200k rows) would be slower and would not restrict restaurant-level visuals such as `Avg Rating`.

### 5.2 Optional — Dynamic RLS with a mapping table + USERPRINCIPALNAME()

Instead of one role per location, use a **single** role whose filter is data-driven by the signed-in user. This scales to hundreds of managers without new roles.

**Step 1 — add a security mapping table** (`SecurityUserLocation`) via Enter Data or a query. One row per (user email, allowed location):

| UserEmail | location |
|---|---|
| ravi@saffron.in | Banashankari |
| ravi@saffron.in | Basavanagudi |
| meena@saffron.in | Koramangala |

```m
// SecurityUserLocation : email -> allowed location map (one row per grant).
let
    Source = Table.FromRecords ( {
        [ UserEmail = "ravi@saffron.in",  location = "Banashankari" ],
        [ UserEmail = "ravi@saffron.in",  location = "Basavanagudi" ],
        [ UserEmail = "meena@saffron.in", location = "Koramangala"  ]
    } ),
    #"Typed" = Table.TransformColumnTypes(
        Source,
        { { "UserEmail", type text }, { "location", type text } }
    )
in
    #"Typed"
```

**Step 2 — relate or lookup.** Two equivalent implementations:

*Option A (recommended, no extra relationship): filter `Restaurants` directly against the map for the current user.*

```dax
-- Role "Dynamic Location" -> table Restaurants:
-- keep a restaurant only if its location is granted to the signed-in user.
Restaurants[location] IN
    SELECTCOLUMNS (
        FILTER (
            SecurityUserLocation,
            SecurityUserLocation[UserEmail] = USERPRINCIPALNAME ()
        ),
        "loc", SecurityUserLocation[location]
    )
```

*Option B (relationship-driven): create an inactive/active relationship `SecurityUserLocation[location] -> Restaurants[location]` and apply the filter on the mapping table:*

```dax
-- Role "Dynamic Location" -> table SecurityUserLocation:
[UserEmail] = USERPRINCIPALNAME ()
```

Option B requires the mapping-table relationship to have **cross-filter direction: Both** (bidirectional) so the restriction reaches `Restaurants`; because of that bidirectional cost (Section 6), **Option A is preferred** for this model — it needs no relationship and no bidirectional flag.

> `USERPRINCIPALNAME()` returns the published-service user's UPN/email; test in Desktop with **View as -> Other user** (type an email from the map). Keep `SecurityUserLocation` and `UserEmail` **hidden** from report view.

---

## 6. Model Performance Implications

| Decision in this model | Performance / correctness rationale |
|---|---|
| **All relationships single-direction (`Single`)** | The VertiPaq engine can push dimension filters into the fact table along one predictable path. Single-direction filtering is cheaper to evaluate and eliminates ambiguity when a table is reachable by more than one route. |
| **Avoid bidirectional cross-filter** | Bidirectional relationships force the engine to expand filters in both directions, can create ambiguous filter paths (especially with `Restaurants` and `Customers` both joined to `Orders`), and risk circular dependencies with RLS. None are used in the base star; the only candidate (dynamic-RLS Option B) is deliberately avoided in favor of the `IN`/`SELECTCOLUMNS` predicate (Option A). |
| **Integer keys on both sides of every join** (`RestaurantID`, `CustomerID` are `int`; date join is on a `Date` key) | Integer/date columns compress far better in VertiPaq and produce smaller, faster relationship join indexes than text keys. Never relate on the free-text `name`/`address`. |
| **De-duplicated `Restaurants` (unique `RestaurantID`)** | Guarantees a true `1:*` relationship (fast) instead of a coerced many-to-many (slow, and semantically wrong for restaurant aggregations). |
| **Star schema, no snowflake, no dim-to-dim joins** | Fewer hops per query; `Restaurants` and `Customers` interact only through `Orders`, which the engine handles as independent filter contexts. |
| **Marked date table + Auto Date/Time OFF** | Removes N hidden auto-calendar tables (one per date column), shrinking model size and RAM, and gives time-intelligence a single, indexed calendar. |
| **Hidden FKs & high-cardinality text (`address`, raw `dish_liked`) kept out of visuals** | High-cardinality text columns are the most expensive to store and slice; hiding them discourages accidental use in visuals that would trigger large scans. |
| **`_Measures` holder table (0 rows)** | Zero storage cost; centralizes measures for maintainability without affecting the query engine. |

**Net effect:** a compact star with three narrow integer/date join paths, one clean calendar, and dimension-side security. Every drafted measure in `CALCULATED COLUMNS AND MEASURES.txt` resolves against this model, and the `FilterCity` calculated column bug (`'Customer'[city]` -> `Customers[City]`) must be fixed in `03_DAX_Library.md` before it will validate against these table/column names.

---

### Build checklist for this section

- [ ] De-duplicate `Restaurants` to unique `RestaurantID` in Power Query.
- [ ] Create relationships R1–R3 (active, single-direction, `*:1`).
- [ ] Create R4 (`Customers[SignupDate] -> DateTable[Date]`) as **inactive**.
- [ ] Mark `DateTable` as date table on `[Date]`.
- [ ] Turn off Auto Date/Time (global + file).
- [ ] Hide FKs and raw text columns per Section 3.3.
- [ ] Create hidden `_Measures` table and set it as measure home.
- [ ] Add static role `City Manager` on `Restaurants[location]`.
- [ ] (Optional) Add `SecurityUserLocation` + dynamic role using `USERPRINCIPALNAME()`.
- [ ] Verify with **View as** that RLS cascades from `Restaurants` into `Orders`.
