# SaffronMetrics — 05: Deployment, Refresh & Governance

*Bangalore food-delivery analytics · Power BI Desktop · Star schema · "Saffron Noir" dark theme · Currency: Indian Rupees (₹)*

This section answers the practical question: **"Where and how do I actually deploy this, keep it refreshing, secure it, and put it in my portfolio?"** It is written for a **single analyst** building a portfolio / technical-interview artifact from a **local `dataset.xlsx`**, so every recommendation is weighed against cost (₹0 where possible), effort, and how well it demonstrates real-world skills to an interviewer.

---

## 1. Hosting & Deployment Options — Comparison and Recommendation

Power BI separates the two things you build in Desktop:

- **Semantic model** (formerly "dataset") — the data model, Power Query (M) steps, relationships, DAX measures/columns, and RLS roles.
- **Report** — the pages, visuals, bookmarks, and theme (`theme.json`) that sit *on top of* a semantic model.

Where you host them determines cost, refresh capability, sharing, and security. The realistic options:

| Option | License / Cost | Scheduled refresh? | RLS enforced? | Public link? | Best for |
|---|---|---|---|---|---|
| **Power BI Service — Free (My Workspace)** | Free Microsoft account (still needs a **work/school tenant** — consumer Gmail/Outlook can't sign in) | Yes (8×/day) — but content stays **private to you**; a Free user **cannot share** reports with others at all | Yes (but only you consume it) | Publish-to-web may work if the tenant enables it, but you cannot share via the Service | Personal dev/testing, learning |
| **Power BI Service — Pro workspace** | **Pro ~US$14 / ₹1,100 per user / month** (often free via 60-day trial or bundled with Microsoft 365 E5) | Yes, **8 refreshes/day** | Yes | Yes (if the tenant enables Publish to web) | The standard, correct answer for sharing a report with named people |
| **Microsoft Fabric / Premium Per User (PPU)** | **PPU ~US$24 / ₹1,900 per user / month** (60-day trial available); Fabric capacity (F-SKUs) billed hourly/reserved | Yes, **up to 48/day**, plus **incremental refresh**, larger models, XMLA endpoint, **Git integration**, and **deployment pipelines** | Yes | Yes (if the tenant enables Publish to web) | Demoing *enterprise* features: incremental refresh, deployment pipelines, and Fabric Git integration |
| **Power BI Report Server (on-prem)** | Requires **Power BI Premium (P/F capacity with the Report Server benefit)** OR **SQL Server Enterprise + Software Assurance** | Uses its **own** scheduled refresh engine on your infrastructure (not the cloud Service's) | Yes | No (behind your firewall) | Regulated orgs that cannot use the cloud. **Overkill for a portfolio.** |
| **Publish to Web (public)** | Free, but **the tenant admin must enable the "Publish to web" org setting** | Model still refreshes on its own schedule in the Service | **RLS is BYPASSED / ignored** | **Yes — fully public** | A live, embeddable link in a portfolio or resume |
| **Export to PDF / PowerPoint (.pptx)** | Free, from Desktop or Service | N/A (static snapshot) | N/A | Share the file anywhere | A safe, offline portfolio artifact with zero privacy risk |

> **PPU consumption note:** content in a **PPU workspace can only be viewed by other PPU-licensed users** — a plain Pro license is *not* enough to open PPU content. If you want named colleagues/interviewers on Pro to view it, use a **Pro workspace**, not PPU. (Content on a **Fabric F64+ / Premium capacity** can be viewed by Free users; a PPU *per-user* license cannot.)

### Recommendation for SaffronMetrics (solo / portfolio)

1. **Build and version in Power BI Desktop**, saving as **PBIP** (see §8).
2. **Publish to the Power BI Service** into a dedicated **Pro or PPU-trial workspace**.
   - Start a **free 60-day Pro or PPU trial** — this costs ₹0 and lets you demonstrate real Service skills (scheduled refresh, RLS, apps).
   - **Prefer PPU** if you want to *show off* incremental refresh, deployment pipelines, and Git integration in an interview. Otherwise **Pro** is sufficient, cheaper, and viewable by other Pro users.
3. **For the public portfolio surface, use ONE of:**
   - **Publish to Web** — gives a live, interactive, embeddable URL. **Privacy caveat below.**
   - **Export to PDF / PowerPoint** — a static but completely safe snapshot when your data is even slightly sensitive.
4. **Do NOT** use Report Server (it is on-prem enterprise infrastructure, irrelevant to a portfolio) and **do not** pay for Fabric capacity — the free trials cover everything you need.

> ### ⚠️ Publish-to-Web privacy caveat — read this before you click
> "Publish to web" creates a link that **ANYONE ON THE INTERNET can open, view, and share — with no sign-in.** Search engines can index it. It is designed for **public** data only.
> - **RLS is completely ignored** on a Publish-to-web embed, so never rely on it to hide rows.
> - Because SaffronMetrics is a **portfolio project on a public restaurant dataset (no real PII)**, Publish to Web is acceptable *for the demo*. But treat `CustomerName`, `CustomerID`, and any `address` data as if it were sensitive — for an interview, prefer the **PDF/PPTX export** or a **screen-shared Pro report** and mention that you *know* Publish-to-web bypasses RLS. That awareness is itself an interview signal.

---

## 2. Step-by-Step: Publishing from Power BI Desktop

**Prerequisites:** a work/school Power BI account. A personal **Gmail/Outlook consumer account cannot sign into the Power BI Service** — you need an organizational email, or spin up a **free Microsoft 365 developer tenant** and start the Power BI (Fabric) trial from `https://app.powerbi.com`.

1. **Sign in to the Service** — go to `https://app.powerbi.com`, sign in, and (first time) start the **Pro or PPU 60-day trial** when prompted.
2. **Create a workspace** (do **not** publish into "My Workspace" — it can't be shared and can't host an App):
   - Left nav → **Workspaces** → **+ New workspace**.
   - Name it e.g. **`SaffronMetrics [Dev]`**. Under *Advanced*, set the **license mode** to **Pro** or **Premium per user**.
3. **Publish from Desktop:**
   - In Power BI Desktop, **Home → Publish**.
   - Sign in with the same account, choose the **`SaffronMetrics [Dev]`** workspace, **Select**.
   - Desktop uploads **both** artifacts: the **semantic model** and the **report**.
4. **Open in the Service** and verify the report renders (the `theme.json` "Saffron Noir" theme travels with the report).

### Semantic model vs report separation

After publishing you'll see two items in the workspace: **`SaffronMetrics`** (semantic model) and **`SaffronMetrics`** (report). This matters:

- **Refresh, credentials, RLS, and incremental refresh are configured on the SEMANTIC MODEL**, not the report.
- One semantic model can back **many** reports — a good practice you can call out in interviews ("thin reports on a shared model").
- If you re-publish the same file from Desktop, it overwrites both items in place. Thin-report edits can also be made directly in the Service.

---

## 3. The Refresh Problem — Your Source Is a LOCAL `dataset.xlsx`

This is the single most important operational issue. After publishing, the report shows data **as of the moment you published**. It will **not** update on its own, because the Service **cannot reach a file sitting on your `F:\data\powerbi\` drive.** You have two ways to fix this:

### Option A — Move `dataset.xlsx` to OneDrive for Business / SharePoint  ✅ Recommended

- Upload `dataset.xlsx` to **OneDrive for Business** or a **SharePoint document library**.
- In Power Query, point the source at the **OneDrive/SharePoint** copy (use **Get Data → SharePoint folder / Web** with the file's cloud URL, or the OneDrive/SharePoint file path) rather than the local `F:\` path, then re-publish.
- The Power BI Service can read cloud-stored files **natively — no gateway to install, nothing running on your PC.** Scheduled refresh "just works," and the file re-syncs when you edit the cloud copy.

### Option B — Install the On-premises Data Gateway (Personal mode)

- Download and install the **On-premises data gateway (personal mode)** on the PC that holds `dataset.xlsx`.
- Sign in with the same Power BI account; the personal gateway binds to your user, not the tenant, and appears automatically for your models.
- In the semantic model's **Settings → Gateway and cloud connections**, map the Excel data source to this personal gateway and supply credentials.
- **Trade-off:** the gateway PC **must be powered on and online** at every scheduled refresh, or the refresh fails. It's tied to one machine — brittle for a portfolio.

### Recommendation

**Use Option A (OneDrive/SharePoint).** It removes the "my laptop must be on" dependency, needs no software install, is the modern best practice, and is trivially explainable in an interview. Reserve the gateway story for when the source is a true on-prem system (SQL Server, a local folder that can't move) — mention you *know* the gateway exists and when it's required.

---

## 4. Scheduled Refresh, Credentials & Incremental Refresh

### Configure data-source credentials (do this first — refresh fails without it)

1. Workspace → **`SaffronMetrics`** semantic model → **⋯ → Settings**.
2. Expand **Data source credentials** → **Edit credentials**.
   - For **OneDrive/SharePoint (Option A):** authentication method **OAuth2** — sign in with your account.
   - For the **personal gateway (Option B):** set the **Windows / Basic / Anonymous** credential the Excel file needs.
3. Set the **Privacy level** (e.g., *Organizational* or *Private*) so query combination is allowed.

### Configure scheduled refresh

1. Same **Settings** page → expand **Scheduled refresh** → toggle **On**.
2. Set **Refresh frequency** (Daily is plenty for this demo), a **time zone** (e.g., *(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi* — IST), and one or more **times**.
   - **Pro:** up to **8 refreshes/day**. **PPU / Fabric:** up to **48/day**.
3. Enable **"Send refresh failure notifications to the semantic model owner"** so you learn when it breaks.
4. Click **Apply**, then use **Refresh now** once to confirm it succeeds end-to-end.

### Incremental refresh — conceptual, for the 200k-row `Orders` fact table

`Orders` (~200,000 rows) is by far the largest table. A full refresh re-imports all 200k rows every time. **Incremental refresh** re-processes only *recent* data and keeps older partitions cached:

1. **Parameters:** create two Power Query date/time parameters named **exactly** `RangeStart` and `RangeEnd` (these are reserved names; type **Date/Time**).
2. **Filter the fact:** in the `Orders` query, filter `OrderDate` to `>= RangeStart` **and** `< RangeEnd`. (This works because `Orders[OrderDate]` and the `DateTable` cover 2023-01-01 onward.)
3. **Define the policy** (right-click `Orders` in the model → **Incremental refresh**): e.g., **Store rows for the last 3 years**, **Refresh rows from the last 10 days**. The Service auto-partitions by date; only the recent window is re-imported each run, and old partitions are never re-read.
4. **Benefits:** faster, cheaper refreshes and a smaller memory/refresh footprint.

**Caveats for SaffronMetrics:**
- Incremental refresh requires a **Pro, PPU, or Fabric/Premium** workspace, and the **first Service refresh performs the full historical load** to create the partitions (don't be alarmed the first run is a full load).
- Only worthwhile if the Excel source keeps *growing*; for a fixed portfolio file it's mostly a **skills-demonstration** exercise — implement it, then say so in the interview. A daily full refresh of 200k rows is otherwise perfectly fine.

---

## 5. Row-Level Security (RLS) in the Service

RLS is **defined in Desktop** (roles + DAX filter) and **enforced in the Service**. For SaffronMetrics, RLS filters **`Restaurants[location]`** (e.g., *Banashankari*, *BTM*, *Koramangala*), so a viewer only sees restaurants in their assigned location.

> **Reminder / bug link:** the drafted `FilterCity` calculated column referenced **`'Customer'[city]`** — that table/column does not exist. It must be **`Customers[City]`** (correct table = `Customers`, correct column = `City`). Fix it in Desktop *before* wiring RLS, or any location/city-based logic that leans on it will error. The RLS role itself filters `Restaurants[location]`, so the corrected column is:
> ```DAX
> FilterCity =
> VAR val = Customers[City]
> VAR wordCount = LEN( val ) - LEN( SUBSTITUTE( val, " ", "" ) ) + 1
> RETURN
>     IF(
>         ISBLANK( val ) || wordCount > 4 || LEN( val ) > 50,
>         BLANK(),
>         val
>     )
> ```

**In Desktop (recap):** Modeling → **Manage roles** → create a role, e.g. `Location - Banashankari`, with a table filter on `Restaurants`:
```DAX
[location] = "Banashankari"
```
Or, for dynamic RLS keyed to the signed-in user, use `USERPRINCIPALNAME()` mapped through a security table. Test in Desktop via **Modeling → View as**.

**In the Service:**
1. Workspace → semantic model → **⋯ → Security**.
2. Select the role (e.g., `Location - Banashankari`) → **add members** by email (`user@domain`) or security group → **Save**.
3. **Test:** on the role → **⋯ → Test as role** to confirm a member sees only that location's data.

**Critical caveats:**
- **Workspace Admins/Members/Contributors and the model owner bypass RLS.** Only users who consume the model with **build permission but no workspace edit role** (e.g., via an App or a Viewer role) actually have RLS applied. To test the restricted experience, use **Test as role** or a separate viewer account.
- **RLS is ignored by Publish to Web** (§1) — never use a public embed to protect restricted rows.

---

## 6. Sharing & Distribution

**Workspace roles** (who can do what):

| Role | Can do |
|---|---|
| **Admin** | Everything, incl. add/remove users (any role), update/delete the workspace |
| **Member** | Add members/contributors/viewers, publish/edit/share content, feature the App |
| **Contributor** | Create/edit content in the workspace; **cannot** manage workspace access or publish the App |
| **Viewer** | Read-only consumption; **RLS is enforced** for Viewers |

**Ways to distribute:**

- **Publish an App** — the recommended way to give consumers a clean, read-only, packaged experience. Workspace → **Create app**, pick the content, set the **audience**, publish. Viewers get a polished app without seeing the messy workspace. App consumers need a **Pro license** (unless the workspace is on **Fabric F64+ / Premium capacity**, where Free users may consume).
- **Share a report / "Share link"** — quick link to a single report; you control whether recipients can reshare. Recipients generally need **Pro** (unless the workspace is on Fabric F64+/Premium capacity).
- **Sensitivity labels** (Microsoft Purview Information Protection) — apply labels like *Public / General / Confidential* to the report and model. Labels **persist into exports** (PDF/PPTX/Excel), enforcing protection outside Power BI. For SaffronMetrics, label the portfolio version **Public** deliberately, and label anything with customer data **Confidential**. (Sensitivity labels require the tenant to have Purview Information Protection enabled.)

---

## 7. Deployment Pipelines (Dev / Test / Prod)

**Deployment pipelines** (a **PPU / Fabric or Premium capacity** feature) promote content across **Development → Test → Production** workspaces with one click, and can rewrite data-source/parameter bindings per stage via **deployment rules** (e.g., point Dev at a sample file, Prod at the full OneDrive file).

- Recommended layout: three workspaces — **`SaffronMetrics [Dev]`**, **`[Test]`**, **`[Prod]`** — assigned to the pipeline's three stages.
- For a **solo portfolio project this is optional**, but *setting one up* is a strong interview talking point: build in Dev, promote to Test to validate refresh/RLS, promote to Prod for the App audience.
- Pipelines pair naturally with PBIP + Git (§8): Git holds the source-of-truth; pipelines handle Service-side promotion.

---

## 8. Version Control (PBIP + Git)

> **Current state:** the project folder `F:\data\powerbi\` is **NOT a Git repository** yet (no `.git` present) and currently holds a legacy **`Restaurant.pbix`**. The steps below convert it to PBIP and initialize Git.

### Save as PBIP (Power BI Project) format

The legacy **`.pbix`** is a single opaque binary — Git can't diff it meaningfully. **PBIP** saves the project as **plain-text folders** (a `.Report/` folder and a `.SemanticModel/` folder, using **TMDL** for the model and JSON/PBIR for the report definition), so **DAX measures, M queries, relationships, and RLS roles become diff-able, review-able text.**

Enable and save:
1. Power BI Desktop → **File → Options and settings → Options → Preview features** → enable **"Power BI Project (.pbip) save option"** (and, if offered, **TMDL** and the **PBIR** enhanced report format). Restart Desktop.
2. Open `Restaurant.pbix`, then **File → Save As → Power BI project files (`.pbip`)** into the project folder. You'll get `SaffronMetrics.pbip`, plus `SaffronMetrics.Report/` and `SaffronMetrics.SemanticModel/` folders.

### Initialize Git and structure the repo

```bash
cd /f/data/powerbi
git init
git branch -M main
# add the .gitignore below first, then:
git add .
git commit -m "Initial commit: SaffronMetrics PBIP, theme, docs"
git remote add origin https://github.com/<you>/saffronmetrics.git
git push -u origin main
```

Recommended `.gitignore` (keep source-of-truth, drop caches, local settings, and the heavy binaries):
```gitignore
# Power BI local/cache settings (per Microsoft's PBIP guidance)
.pbi/localSettings.json
**/.pbi/localSettings.json
**/.pbi/cache.abf

# Legacy binary (PBIP is the reviewable source of truth)
*.pbix

# The large raw workbook — host it in OneDrive/SharePoint instead of Git
dataset.xlsx

# OS noise
Thumbs.db
.DS_Store
```
> Note: whether you commit the raw `dataset.xlsx` (~15 MB) is a judgment call. For refresh you should host it in **OneDrive/SharePoint** (§3) anyway, so Git can hold the **PBIP source + docs** and skip the binary. If you want the repo self-contained for reviewers, either commit it or use **Git LFS**. Likewise the `Restaurant.pbix` binary is `*.pbix`-ignored above; commit a copy only as a convenience download.

**Keep together in the repo:** `SaffronMetrics.pbip` (+ its `.Report`/`.SemanticModel` folders), `theme.json`, `PROJECT_PLAN.md`, the DAX/M documentation (`01_…`–`03_…`, `06_…`), and this `05_Deployment_and_Governance.md`. **PBIP is the reviewable source of truth.**

### Git integration in Fabric

In a **Fabric-capacity (or Fabric-trial) workspace**, **Workspace settings → Git integration** connects the workspace to an **Azure DevOps** or **GitHub** repo and syncs items (semantic model + report) as source. Combined with PBIP locally, you get a full loop: **edit in Desktop → commit to GitHub → sync into the Fabric workspace → promote via deployment pipeline.** Demonstrating even part of this loop is a standout portfolio/interview differentiator. (Note: Fabric Git integration requires a Fabric/Premium-backed workspace — PPU per-user does **not** include workspace Git sync; a Fabric trial capacity does.)

---

## 9. Go-Live Checklist

**Model & report correctness (in Desktop, before publishing):**
- [ ] Power Query renames applied: `rate → Rating` (Decimal, cleaned of `"NEW"/"-"/nulls/"/5"`), `approx_cost(for two people) → CostForTwo` (Whole Number, thousands separators stripped), `votes → Votes`.
- [ ] `Restaurants` duplicate-row problem handled (dedup to real-restaurant grain or documented) so `Total Restaurants` and `Avg Rating` aren't inflated.
- [ ] `FilterCity` fixed to **`Customers[City]`** (was `'Customer'[city]`).
- [ ] Star-schema relationships active: `Orders[RestaurantID] → Restaurants`, `Orders[CustomerID] → Customers`, `Orders[OrderDate] → DateTable[Date]`; `DateTable` marked as the **Date table**.
- [ ] Every measure/column references a column that exists **after** transforms; no broken refs. Time-intelligence (`Revenue YTD`, `Orders YTD`, `Revenue Previous Month`, `Revenue Growth %`) validated against the marked date table.
- [ ] "Saffron Noir" `theme.json` applied; ₹ currency formatting on `Total Revenue`, `Avg Order Value`, `CostForTwo`.
- [ ] Saved as **PBIP**.

**Service deployment:**
- [ ] Dedicated **Pro/PPU** workspace created (not My Workspace).
- [ ] Report + semantic model **published**; report renders with theme intact.
- [ ] Source **moved to OneDrive/SharePoint** (Option A) *or* personal gateway installed (Option B); Power Query re-pointed and re-published.
- [ ] **Data-source credentials** set (no auth errors).
- [ ] **Scheduled refresh** enabled (IST time zone, failure notifications on); **Refresh now** succeeds.
- [ ] *(Optional)* **Incremental refresh** policy on `Orders` (`RangeStart`/`RangeEnd` on `OrderDate`) configured.

**Security & sharing:**
- [ ] RLS role(s) on `Restaurants[location]` published; **members added**; verified via **Test as role**.
- [ ] Confirmed **workspace admins/members/contributors bypass RLS**; tested with a Viewer / second account.
- [ ] Distribution chosen: **App** (recommended) / share links; audience set; consumer licensing checked (Pro workspace ⇒ Pro viewers).
- [ ] **Sensitivity labels** applied (portfolio = *Public*; customer-data versions = *Confidential*).

**Portfolio surface:**
- [ ] Public artifact prepared: **Publish to Web** link *or* **PDF/PPTX export** — with explicit awareness that **Publish-to-web is fully public and bypasses RLS**.

**Governance & version control:**
- [ ] `git init` run on `F:\data\powerbi\` (was **not** a repo); `.gitignore` added; PBIP + `theme.json` + docs pushed to GitHub.
- [ ] *(Optional / interview bonus)* Fabric **Git integration** and **Dev/Test/Prod deployment pipeline** set up.
- [ ] `README` links to the live report / export and summarizes the model, DAX, and refresh design.
