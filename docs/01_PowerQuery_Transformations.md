# 01 — Power Query & Data Preparation

**Project:** SaffronMetrics — Bangalore Food-Delivery Analytics
**Source:** `dataset.xlsx` (single workbook, 4 sheets)
**Tool:** Power BI Desktop — Power Query (M / "Get Data")
**Model target:** Star schema (fact = Orders; dimensions = Restaurants, Customers, DateTable)
**Currency:** Indian Rupees (₹)

This document is the authoritative recipe for turning the raw, Zomato-derived Excel workbook into four clean, correctly typed model tables. Every step below is runnable as written in the Advanced Editor and uses the **exact** source column names (including the parenthesized ones such as `approx_cost(for two people)`, `listed_in(type)`, `listed_in(city)`).

---

## 1. Connection, Query Structure & Load Strategy

### 1.1 Connecting to the workbook

1. **Home → Get Data → Excel workbook** and select `dataset.xlsx` from the project folder.
2. In the **Navigator**, tick all four sheets: `Restaurants`, `Customers`, `Orders`, `DateTable`. Do **not** click *Load*; click **Transform Data** to open the Power Query Editor first. This avoids loading 200k+ raw fact rows before typing/cleaning.
3. Power BI creates one query per selected sheet. Confirm each query's first applied step is `Source = Excel.Workbook(File.Contents(...), null, true)` followed by a `{[Item="<Sheet>",Kind="Sheet"]}[Data]` navigation and a `PromotedHeaders` step.

> **Tip — parameterize the path.** Replace the hard-coded path with a parameter so the project is portable. Create a **Text parameter** `pFilePath` (current value = the absolute path to `dataset.xlsx`) and reference it as `File.Contents(pFilePath)`. This is optional but recommended for the portfolio (shows you understand deployment).

### 1.2 Staging vs. loaded (query architecture)

Use a **two-layer** pattern so profiling/cleaning is auditable and the loaded model stays lean.

| Layer | Query name | Loaded to model? | Purpose |
|---|---|---|---|
| Staging | `Stg_Restaurants` | **No** (disabled) | Raw sheet + connection only |
| Staging | `Stg_Customers` | **No** (disabled) | Raw sheet + connection only |
| Staging | `Stg_Orders` | **No** (disabled) | Raw sheet + connection only |
| Staging | `Stg_DateTable` | **No** (disabled) | Raw sheet + connection only |
| Loaded | `Restaurants` | **Yes** | Cleaned, deduplicated dimension |
| Loaded | `Customers` | **Yes** | Cleaned dimension |
| Loaded | `Orders` | **Yes** | Cleaned fact (grain preserved) |
| Loaded | `DateTable` | **Yes** | Cleaned date dimension |

Put staging queries in a **`00_Staging`** group and loaded queries in a **`01_Model`** group (right-click in the Queries pane → **Move to Group**). Each loaded query begins with `Source = Stg_<Sheet>` so all cleaning logic lives in one place and the staging layer can be swapped (e.g., to a database) without rewriting transforms.

> For a beginner-simple alternative you may collapse staging into the loaded query (one query per sheet). The scripts in Section 3 are written so they run **either** way: if you use staging, replace the `Source`/navigation block at the top with `Source = Stg_<Sheet>`.

### 1.3 Disabling load on staging queries

For **each** `Stg_*` query: right-click the query → **untick "Enable load"** (the query name goes *italic*). Also untick **"Include in report refresh"** only if you do not want it refreshed independently — normally leave refresh on. Disabling load means the staging query exists as a reusable connection but never materializes a table in the model, keeping the model to exactly four tables.

**Do NOT disable load** on the four loaded queries (`Restaurants`, `Customers`, `Orders`, `DateTable`).

---

## 2. Data-Profiling Checklist (run BEFORE writing transforms)

Turn profiling on: **View → Data Preview** group → tick **Column quality**, **Column distribution**, **Column profile**. Then set **"Column profiling based on entire data set"** (bottom-left status bar) — the default profiles only the first 1,000 rows, which will *hide* the dirty `rate` values and duplicate restaurants in a 56k / 200k dataset.

Work through this checklist per table and record findings (they justify the transforms in Section 3):

- [ ] **Column quality** — Valid / Error / Empty % for every column. Expect non-zero **Empty** on `Restaurants[rate]`, `dish_liked`, `approx_cost(for two people)`.
- [ ] **Column distribution** — distinct vs. unique counts. On `Restaurants`, compare **row count (56,251)** to **distinct `RestaurantID`**: if distinct << 56,251, duplicates are confirmed and the dedupe in 3.1 is mandatory.
- [ ] **Value distribution on `rate`** — you should see values like `4.1/5`, plus `NEW`, `-`, and blanks. This confirms `rate` must be parsed, not just retyped.
- [ ] **Value distribution on `online_order` / `book_table`** — confirm the domain is exactly `{Yes, No}` (and possibly blanks) before converting to logical.
- [ ] **`approx_cost(for two people)`** — inspect for thousands separators (e.g., `1,200`) and text contamination; these break a naive number conversion.
- [ ] **Error detection** — after each type change, use **Home → Keep Rows → Keep Errors** on a *temporary* duplicate of the query to see exactly which rows fail conversion. Delete the temp query afterward. Never ship a query that silently drops errors you haven't inspected.
- [ ] **Key integrity** — profile `Orders[RestaurantID]` and `Orders[CustomerID]` for blanks; note any orphan FKs (handled in the model/relationships doc, not here).
- [ ] **Date coverage** — profile `DateTable[Date]` min/max (expect 2023-01-01 onward, ~1,001 days / ~2.7 years) and confirm `Orders[OrderDate]` falls inside that range.

---

## 3. Complete M Scripts (one per table)

Each script is the **full Advanced Editor contents** of the *loaded* query. Types are set explicitly at the end (and mid-stream where a later step depends on the type). Column names use the exact source spelling until an intentional rename.

> **Note on the `Source` block.** The scripts include the direct `Excel.Workbook` navigation so they are self-contained and runnable. If you adopted the staging layer (2.2), replace the three lines `Source … PromotedHeaders` at the top with a single line `PromotedHeaders = Stg_<Sheet>,` (staging already promotes headers).

### 3.1 Restaurants (dimension — cleaned + deduplicated)

**Cleaning goals:** trim/clean all text; parse `rate` → numeric `Rating` (split on `/`, map `NEW`/`-`/errors/blanks to null); strip thousands separators from `approx_cost(for two people)` → whole-number `CostForTwo`; rename `votes` → `Votes`; optionally convert `online_order`/`book_table` to logical; **deduplicate to one row per `RestaurantID`** so this is a true dimension.

**Dedupe rule (stated & justified):** The source repeats each real restaurant once per `listed_in(type)` × `listed_in(city)` combination, so `name`/`address` and even `RestaurantID` recur across many rows. For a star schema, the dimension must have **one row per `RestaurantID`** (the intended unique key). We therefore:
1. Clean/parse first (so the surviving row already carries clean `Rating`, `CostForTwo`, etc.).
2. **Sort** so the "best" representative wins deterministically — highest `Votes` first, then highest `Rating` — because those attributes are restaurant-level facts that should not vary by listing, and picking the max-votes row avoids retaining a stale/blank-rated duplicate.
3. `Table.Distinct` on **`RestaurantID` only**, which keeps the **first** row per key *after* the sort.

The listing-specific columns `listed_in(type)` and `listed_in(city)` describe the *listing context*, not the restaurant, so collapsing to one row necessarily drops the extra listings. If listing context is needed for analysis later, it belongs in a separate bridge/fact — not in this dimension. Keeping it here would force the dimension back to a non-unique key and break the star schema.

```m
let
    // ---- Source (replace this block with: Source = Stg_Restaurants, if using staging) ----
    Source = Excel.Workbook(File.Contents(pFilePath), null, true),
    Restaurants_Sheet = Source{[Item="Restaurants",Kind="Sheet"]}[Data],
    PromotedHeaders = Table.PromoteHeaders(Restaurants_Sheet, [PromoteAllScalars=true]),

    // ---- Trim + clean all text columns (remove leading/trailing spaces and control chars) ----
    TrimText = Table.TransformColumns(
        PromotedHeaders,
        {
            {"address",         each Text.Clean(Text.Trim(_)), type text},
            {"name",            each Text.Clean(Text.Trim(_)), type text},
            {"online_order",    each Text.Clean(Text.Trim(_)), type text},
            {"book_table",      each Text.Clean(Text.Trim(_)), type text},
            {"rate",            each Text.Clean(Text.Trim(_)), type text},
            {"location",        each Text.Clean(Text.Trim(_)), type text},
            {"rest_type",       each Text.Clean(Text.Trim(_)), type text},
            {"dish_liked",      each Text.Clean(Text.Trim(_)), type text},
            {"cuisines",        each Text.Clean(Text.Trim(_)), type text},
            {"listed_in(type)", each Text.Clean(Text.Trim(_)), type text},
            {"listed_in(city)", each Text.Clean(Text.Trim(_)), type text}
        }
    ),

    // ---- Parse rate ("4.1/5", "NEW", "-", null, "") -> numeric Rating on a 0..5 scale ----
    // Take the part before "/", convert "NEW"/"-"/blank/anything non-numeric to null.
    AddRatingText = Table.AddColumn(
        TrimText,
        "RatingText",
        each let raw = [rate]
             in  if raw = null or raw = "" or Text.Upper(raw) = "NEW" or raw = "-"
                 then null
                 else Text.BeforeDelimiter(raw, "/"),
        type text
    ),
    AddRating = Table.AddColumn(
        AddRatingText,
        "Rating",
        // Force invariant (en-US) parsing so a "." decimal is never misread under a comma-decimal locale.
        each if [RatingText] = null then null
             else try Number.FromText(Text.Trim([RatingText]), "en-US") otherwise null,
        type number
    ),
    RemoveRateWork = Table.RemoveColumns(AddRating, {"rate", "RatingText"}),

    // ---- Clean approx_cost(for two people): strip thousands separators -> whole number CostForTwo ----
    AddCostForTwo = Table.AddColumn(
        RemoveRateWork,
        "CostForTwo",
        each let raw = [#"approx_cost(for two people)"],
                 asText = if raw = null then null else Text.From(raw),
                 stripped = if asText = null then null
                            else Text.Select(asText, {"0".."9"})   // keep digits only; drops "," and spaces
             in  if stripped = null or stripped = "" then null
                 else try Int64.From(stripped) otherwise null,
        Int64.Type
    ),
    RemoveCostRaw = Table.RemoveColumns(AddCostForTwo, {"approx_cost(for two people)"}),

    // ---- Rename votes -> Votes ----
    RenameVotes = Table.RenameColumns(RemoveCostRaw, {{"votes", "Votes"}}),

    // ---- Optional: convert Yes/No to logical. ----
    // If you prefer to KEEP them as text, delete this whole step AND change the next
    // step's first argument from `ToLogical` to `RenameVotes` (otherwise the query
    // will reference a step that no longer exists). If kept as text, also add
    // {"online_order", type text} and {"book_table", type text} to the `Typed` list below.
    ToLogical = Table.TransformColumns(
        RenameVotes,
        {
            {"online_order", each if _ = null then null else Text.Upper(_) = "YES", type logical},
            {"book_table",   each if _ = null then null else Text.Upper(_) = "YES", type logical}
        }
    ),

    // ---- Set remaining explicit types ----
    Typed = Table.TransformColumnTypes(
        ToLogical,
        {
            {"RestaurantID",    Int64.Type},
            {"address",         type text},
            {"name",            type text},
            {"Votes",           Int64.Type},
            {"location",        type text},
            {"rest_type",       type text},
            {"dish_liked",      type text},
            {"cuisines",        type text},
            {"listed_in(type)", type text},
            {"listed_in(city)", type text},
            {"Rating",          type number},
            {"CostForTwo",      Int64.Type}
        }
    ),

    // ---- DEDUPLICATE to one row per RestaurantID (see dedupe rule above) ----
    // Sort best-representative first (max Votes, then max Rating), then keep first row per RestaurantID.
    SortForDedupe = Table.Sort(
        Typed,
        {
            {"RestaurantID", Order.Ascending},
            {"Votes",        Order.Descending},
            {"Rating",       Order.Descending}
        }
    ),
    Deduped = Table.Distinct(SortForDedupe, {"RestaurantID"}),

    // ---- Drop listing-context columns that no longer describe a unique restaurant ----
    // (Keep this REMOVE only if you truly don't need them in the dimension. Comment out to retain.)
    FinalColumns = Table.RemoveColumns(Deduped, {"listed_in(type)", "listed_in(city)"})
in
    FinalColumns
```

**Result:** `Restaurants` has one row per `RestaurantID` with columns `RestaurantID, address, name, online_order, book_table, Votes, location, rest_type, dish_liked, cuisines, Rating, CostForTwo`. `Rating` is `number` (nulls for NEW/-/blank), `CostForTwo` is whole number, `Votes` is whole number. This is exactly the shape the drafted DAX (`Cost Bucket`, `Rating Bucket`, `Avg Rating`, `Avg Votes`, `Total Restaurants`) expects.

> **If you want to keep the extra listings for a "listed-in" analysis:** comment out `FinalColumns` (return `Deduped`) *only after* moving those two columns to a separate query — do **not** keep them alongside a deduplicated key, or `RestaurantID` stops being unique and the star schema breaks.

### 3.2 Orders (FACT — set types, preserve grain, NO dedupe)

The grain is **one row per order** (`OrderID` unique). Do **not** remove duplicates and do **not** aggregate — every row is a distinct business event. Only set types and (optionally) trim `OrderStatus`.

```m
let
    // ---- Source (replace with: Source = Stg_Orders, if using staging) ----
    Source = Excel.Workbook(File.Contents(pFilePath), null, true),
    Orders_Sheet = Source{[Item="Orders",Kind="Sheet"]}[Data],
    PromotedHeaders = Table.PromoteHeaders(Orders_Sheet, [PromoteAllScalars=true]),

    // ---- Trim the one free-text column so status values group correctly ----
    TrimStatus = Table.TransformColumns(
        PromotedHeaders,
        {{"OrderStatus", each Text.Clean(Text.Trim(_)), type text}}
    ),

    // ---- Explicit types (grain preserved: no dedupe, no group-by) ----
    Typed = Table.TransformColumnTypes(
        TrimStatus,
        {
            {"OrderID",          Int64.Type},
            {"RestaurantID",     Int64.Type},
            {"CustomerID",       Int64.Type},
            {"OrderDate",        type date},
            {"OrderValue",       type number},
            {"DeliveryTimeMins", Int64.Type},
            {"OrderStatus",      type text},
            {"Quantity",         Int64.Type}
        }
    )
in
    Typed
```

> **Grain guard (optional validation, not shipped):** temporarily add `= Table.RowCount(Table.Distinct(Typed, {"OrderID"}))` in a blank query and confirm it equals `Table.RowCount(Typed)` (200,000 data rows). Delete after checking.

### 3.3 Customers (dimension — set types)

`CustomerID` is already unique; just clean text and set types.

```m
let
    // ---- Source (replace with: Source = Stg_Customers, if using staging) ----
    Source = Excel.Workbook(File.Contents(pFilePath), null, true),
    Customers_Sheet = Source{[Item="Customers",Kind="Sheet"]}[Data],
    PromotedHeaders = Table.PromoteHeaders(Customers_Sheet, [PromoteAllScalars=true]),

    // ---- Trim text columns ----
    TrimText = Table.TransformColumns(
        PromotedHeaders,
        {
            {"CustomerName", each Text.Clean(Text.Trim(_)), type text},
            {"City",         each Text.Clean(Text.Trim(_)), type text},
            {"CustomerType", each Text.Clean(Text.Trim(_)), type text}
        }
    ),

    // ---- Explicit types ----
    Typed = Table.TransformColumnTypes(
        TrimText,
        {
            {"CustomerID",   Int64.Type},
            {"CustomerName", type text},
            {"City",         type text},
            {"SignupDate",   type date},
            {"CustomerType", type text}
        }
    )
in
    Typed
```

> **Naming note for DAX:** the source column is `City` (capital C). The drafted `FilterCity` calculated column referenced `'Customer'[city]` — both the table name (`Customer` vs `Customers`) and the column casing (`city` vs `City`) are wrong. After this query loads, the correct reference is `Customers[City]`. See doc **02 (DAX)** for the fixed calculated column.

### 3.4 DateTable (dimension — set types)

The workbook already ships a `DateTable` sheet (1,001 rows, 2023-01-01 onward). Set types explicitly and load it.

```m
let
    // ---- Source (replace with: Source = Stg_DateTable, if using staging) ----
    Source = Excel.Workbook(File.Contents(pFilePath), null, true),
    DateTable_Sheet = Source{[Item="DateTable",Kind="Sheet"]}[Data],
    PromotedHeaders = Table.PromoteHeaders(DateTable_Sheet, [PromoteAllScalars=true]),

    // ---- Explicit types ----
    Typed = Table.TransformColumnTypes(
        PromotedHeaders,
        {
            {"Date",      type date},
            {"Year",      Int64.Type},
            {"MonthNo",   Int64.Type},
            {"MonthName", type text},
            {"Quarter",   type text},
            {"Day",       Int64.Type}
        }
    )
in
    Typed
```

After loading, **mark this table as a date table** (Model view → select `DateTable` → **Mark as date table** → date column = `Date`). This is required for the drafted time-intelligence measures (`Revenue YTD`, `Orders YTD`, `Revenue Previous Month`, `Revenue Growth %`) to behave correctly.

> **DAX date-table alternative (cross-reference — doc 02).** If you prefer to generate the date dimension in DAX instead of consuming the sheet, you can **disable load** on this query and create a calculated table with `CALENDAR(MIN(Orders[OrderDate]), MAX(Orders[OrderDate]))` plus `YEAR`, `MONTH`, `FORMAT(...,"MMM")`, `"Q" & ROUNDUP(MONTH(...)/3,0)`, and `DAY` columns. Keep **one** date table only — do not load the sheet and the calculated table simultaneously, or you will have two competing date dimensions. This project's default is to **use the shipped sheet** (simpler, deterministic, and already covers the required range). The full DAX generator lives in doc 02.

---

## 4. Query Folding & Why Step Order Matters

**Query folding** is Power Query's ability to push transform steps back to the source as a native query. Folding **does not apply to Excel-workbook sources** — `Excel.Workbook` is a file connector, so every step executes in the local Power Query mashup engine, not at a server. Two consequences:

1. **Don't expect fold-based performance.** There is no server to offload work to; the engine reads the whole sheet and applies steps in memory. Efficiency here comes from *step order and avoiding rework*, not from folding.
2. **Step order still matters a lot** for correctness and speed:

- **Promote headers → trim/clean → parse → type → dedupe.** Clean and parse *before* setting final numeric types, because `rate` and `approx_cost(for two people)` are text with contamination; typing them to number first would throw errors on `4.1/5`, `NEW`, and `1,200`.
- **Filter/reduce early, expand late.** Remove unneeded columns and rows before expensive row-wise `Table.AddColumn` operations so fewer values are processed. (We keep all columns here because all are used, but the principle holds.)
- **Sort immediately before `Table.Distinct`.** The dedupe in 3.1 relies on the sort ordering to choose the representative row; any step that reorders rows between the sort and the distinct would silently change which row survives.
- **Type last (per group of transforms).** A final `Table.TransformColumnTypes` after cleaning gives a single, auditable place where the model's column types are locked in — matching what downstream DAX assumes (`Rating` = number, `CostForTwo`/`Votes`/IDs = whole number, dates = date).

> If this source were later swapped for a SQL/warehouse table (via the staging layer), the *loaded* queries would begin to fold. Keeping cleaning logic native-M and avoiding fold-breaking custom functions where a built-in exists would let those steps push down automatically.

---

## 5. Gotchas — Specific to this messy Zomato-derived data

1. **`rate` is text, not a number.** It contains `"4.1/5"`, `"NEW"`, `"-"`, empty strings, and nulls. A plain "Change Type → Decimal" errors on all of these. Must split on `/` and null-map the non-numeric tokens (3.1). Result column is `Rating`.
2. **Profiling defaults to 1,000 rows and hides the dirt.** Switch to **"Column profiling based on entire data set"** or you'll miss the `NEW`/`-` values and the duplicate restaurants entirely (Section 2).
3. **Massive duplication in Restaurants (56,251 rows, far fewer real restaurants).** Same `name`/`address`/`RestaurantID` repeats once per `listed_in(type)` × `listed_in(city)`. Without the dedupe (3.1), `Total Restaurants`, `Avg Rating`, and `Avg Votes` are all inflated/skewed and the `Restaurants[RestaurantID]` ↔ `Orders[RestaurantID]` relationship becomes many-to-many. **Dedupe to one row per `RestaurantID`.**
4. **`approx_cost(for two people)` has thousands separators** (e.g., `1,200`). Locale-dependent number parsing can misread `1,200` as `1.2` or error. The digit-only `Text.Select(_, {"0".."9"})` approach in 3.1 is locale-proof. Result column is `CostForTwo` (whole number).
5. **Parenthesized column names need `#"..."` quoting in M.** `approx_cost(for two people)`, `listed_in(type)`, `listed_in(city)` must be written as `[#"approx_cost(for two people)"]` etc. Unquoted access errors out.
6. **Whitespace/control chars break grouping.** `location`, `OrderStatus`, `CustomerType`, and cuisine text can carry trailing spaces or stray control characters, so `"Delivered "` ≠ `"Delivered"` and `Banashankari ` splits into a second slicer value. `Text.Trim` + `Text.Clean` on every text column prevents phantom categories. This also matters because **RLS filters `Restaurants[location]`** — untrimmed location values would create RLS gaps.
7. **`online_order` / `book_table` are text `Yes/No`.** Converting to logical is optional but must handle nulls (3.1). If you keep them as text, downstream visuals/filters must match the exact casing `"Yes"`/`"No"`.
8. **`dish_liked` and `cuisines` are comma-separated multi-values.** Left as-is here (single text column). Do **not** split-to-rows in this dimension — that would re-duplicate `RestaurantID`. If cuisine-level analysis is needed, build a separate split-to-rows bridge query off `Stg_Restaurants`, keyed on `RestaurantID`.
9. **Date-range alignment.** `DateTable` covers 2023-01-01 → ~2025 (~1,001 days). Confirm `Orders[OrderDate]` min/max sit inside that window; out-of-range order dates would drop from time-intelligence measures. Remember to **Mark as date table**.
10. **Two competing date tables.** If you also build the DAX `CALENDAR` alternative (doc 02), disable load on the `DateTable` sheet query. Never have both active.
11. **Header-promotion assumption.** All scripts assume row 1 of each sheet holds headers (`PromoteHeaders`). If a sheet has a title/blank row above the header, add a `Table.Skip` before `PromoteHeaders`, or the column names will be wrong and every downstream reference fails.
12. **Errors are silent by default.** After typing, sanity-check with a temporary **Keep Errors** query (Section 2) — especially on `Rating`/`CostForTwo` — so a bad parse doesn't quietly become `null` and understate `Avg Rating`.

---

## 6. Handoff Checklist (Definition of Done for this stage)

- [ ] Four loaded queries: `Restaurants`, `Customers`, `Orders`, `DateTable` (staging queries load-disabled, italic, grouped).
- [ ] `Restaurants`: one row per `RestaurantID`; columns `Rating` (number), `CostForTwo` (whole number), `Votes` (whole number) present and typed; text trimmed/cleaned.
- [ ] `Orders`: 200,000 data rows, grain intact (`OrderID` unique), all columns typed; `OrderDate` = date.
- [ ] `Customers`: `City` present (not `city`); `SignupDate` = date; all typed.
- [ ] `DateTable`: typed and **Marked as date table** on `Date`.
- [ ] No parse errors remain unexplained (verified via Keep Errors spot-checks).
- [ ] Column names match exactly what docs **02 (DAX)** and **03 (RLS/model)** reference: `Rating`, `CostForTwo`, `Votes`, `Customers[City]`, `Restaurants[location]`.
