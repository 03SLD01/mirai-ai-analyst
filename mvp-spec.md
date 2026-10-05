# Mirai AI Analyst: MVP Build Spec

Give this file to Claude Code or Cursor. Build in the phases at the bottom, one at a time.

## 1. Goal

A small business owner uploads an Excel or CSV sales file and, within a minute, gets:
1. A cleaned dataset with a short report of what was fixed.
2. An automatic dashboard (revenue, profit, top products, trend).
3. A chat box ("Ask Mirai") that answers questions about their data with numbers they can verify.

Out of scope for the MVP: live integrations (Shopify, Tally), forecasting, anomaly alerts, scheduled reports, multi-user teams, payments. Add these after 5 to 10 real users have tried the MVP.

## 2. Recommended stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js + TypeScript + Tailwind + Recharts | Fast to build, easy to deploy on Vercel |
| Backend | FastAPI (Python) | Your strongest language; pandas is native |
| Data processing | pandas + openpyxl | Reads xlsx and csv, handles cleaning |
| Query engine | DuckDB | Runs SQL directly on a DataFrame, in memory, fast |
| Database and auth | Supabase (Postgres + Auth + Storage) | Free tier, handles login and file storage |
| AI | Claude API (use the current Sonnet model) | Column understanding, SQL generation, explanations |

## 3. User flow

1. Sign up or log in (email, Google).
2. Upload `.xlsx` or `.csv` (limit 10 MB for MVP).
3. Mirai shows "Analyzing..." with progress: reading, cleaning, understanding, building dashboard.
4. Show the **cleaning report**: duplicates removed, missing values filled, formats fixed. User can accept or undo.
5. Show the **column mapping** Mirai guessed (for example, `Amt` = revenue, `Cust` = customer). User can correct any column. This step is essential, because wrong mapping means wrong answers.
6. Show the dashboard and the Ask Mirai chat side by side.

## 4. Pipeline (backend)

### 4.1 Read and profile
- Read file with pandas. For xlsx, let the user pick a sheet if there are several.
- Detect header row (first row with mostly non-empty text cells).
- Build a **profile**: for each column, name, dtype, % missing, 5 sample values, min/max for numbers and dates. This profile is all the AI sees at this stage, never the full data.

### 4.2 Clean (rule-based first, AI second)
Rules, in order:
- Trim whitespace in text columns; standardise case for categories.
- Parse dates (try several formats, flag ambiguous day/month).
- Convert numbers stored as text (remove `₹`, commas).
- Drop exact duplicate rows.
- Missing values: numeric columns left as null and excluded from sums (do not silently fill with zero); categorical filled with "Unknown".
Return a list of every change made, with counts. Never change data without logging it.

### 4.3 Understand (AI step)
Send the profile to Claude. Ask for JSON only:

```json
{
  "date": "Order Date",
  "revenue": "Amount",
  "cost": "Cost Price",
  "product": "Item",
  "customer": "Customer Name",
  "quantity": "Qty",
  "confidence": {"revenue": 0.95, "cost": 0.6}
}
```
Fields that do not exist are `null`. If a field's confidence is below 0.7, ask the user to confirm it (step 5 of the user flow).

### 4.4 Compute dashboard metrics (plain pandas, no AI)
- Total revenue, total profit (if cost exists), order count, average order value.
- Growth: last full month vs the month before.
- Monthly revenue and profit series.
- Top 10 products by revenue and by profit; bottom 5 by profit.
- Top 10 customers by revenue; repeat-customer share.
Compute these in code. Never let the AI do arithmetic.

## 5. Ask Mirai (the signature feature)

Use a **question → SQL → result → explanation** loop. The AI never sees the whole dataset.

1. Load the cleaned DataFrame into DuckDB as table `data`, with the mapped column names.
2. Send Claude: the user's question, the column mapping, the profile, and 5 sample rows. System prompt below.
3. Claude returns a single read-only SQL query.
4. Backend validates: must start with `SELECT`, must not contain `INSERT/UPDATE/DELETE/DROP/ATTACH/COPY/PRAGMA`, 5 second timeout, max 1000 rows.
5. Run it in DuckDB. Send the question plus the result table back to Claude to write a short plain-English answer.
6. Show the answer, the result table, and a "Show SQL" toggle so the user can check the work.

System prompt (starting point):

```
You are Mirai, an analyst for small business owners. You answer questions about one table named `data`.
Columns and meanings: {mapping}. Profile: {profile}.
Rules:
- Return only one DuckDB SELECT query, no explanation.
- Use only columns that exist. If the question cannot be answered from them, return the word UNANSWERABLE.
- Never guess numbers. All numbers must come from the query result.
```

Answer prompt rules: state the key number first, give one likely reason only if the data supports it, give at most one suggested action, and say "I can't tell from this data" when the data does not show a cause. "Why did sales drop?" questions should be answered by comparing periods (by product, customer, region) and reporting what changed, not by guessing.

## 6. Data model (Supabase / Postgres)

- `users` (from Supabase Auth)
- `datasets`: id, user_id, name, file_path, status, row_count, created_at
- `dataset_meta`: dataset_id, profile (jsonb), mapping (jsonb), cleaning_log (jsonb), metrics (jsonb)
- `chats`: id, dataset_id, role, content, sql, result_preview (jsonb), created_at

Store the original upload in Supabase Storage, private bucket, path `user_id/dataset_id/original.xlsx`. Store a cleaned copy as Parquet. Row-level security: users can only read their own rows and files.

## 7. API endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/datasets` | Upload file, returns dataset id, starts processing |
| GET | `/datasets/{id}` | Status, profile, cleaning log, mapping |
| PUT | `/datasets/{id}/mapping` | Save user-corrected mapping, recompute metrics |
| GET | `/datasets/{id}/metrics` | Dashboard numbers and series |
| POST | `/datasets/{id}/ask` | Body `{question}`, returns answer, table, sql |
| DELETE | `/datasets/{id}` | Delete file and all derived data |

Every endpoint checks that the logged-in user owns the dataset.

## 8. Frontend pages

- `/` marketing site (already built).
- `/app` dataset list and upload button.
- `/app/[id]`: tabs **Dashboard**, **Ask Mirai**, **Data** (cleaning report and mapping).
- Dashboard: 4 KPI tiles, monthly revenue line chart, profit by product bar chart, top customers table.
- Ask Mirai: chat with suggested questions generated from the mapped columns (only suggest questions the data can answer).

## 9. Safety and trust rules

- Never send the full dataset to the AI. Only profile, sample rows and query results.
- Show the SQL and result table with every answer.
- Delete on request: removes the original, the Parquet copy, and all chat history.
- Do not claim accuracy figures on the website until you have measured them (see section 10).
- Add a plain privacy page saying exactly what is sent to the AI provider.

## 10. Testing before launch

- Collect 10 real or realistic messy files (Shopify export, Tally export, hand-made Excel). Keep them as a test set.
- For each, write 10 questions with known correct answers (you can compute them in pandas). Measure how many Mirai gets right. Fix the prompt and the cleaning rules until this is above 90%.
- Test with 3 actual small business owners watching them use it. Note where they get confused.

## 11. Build order

**Phase 1 (week 1 to 2):** FastAPI endpoint that reads a CSV/xlsx, profiles it, cleans it, returns the cleaning log. Test on your 10 files.

**Phase 2 (week 3):** Column mapping with Claude, metrics computation, dashboard page in Next.js.

**Phase 3 (week 4):** Ask Mirai loop with DuckDB and validation. Build the test question set.

**Phase 4 (week 5):** Auth, storage, delete flow, deploy (Vercel for frontend, Railway or Render for FastAPI).

**Phase 5 (week 6):** Invite 5 to 10 businesses free. Watch, fix, then add the paid plans and forecasting.

## 12. First prompt to give Claude Code

> Read `mirai-mvp-spec.md`. Build Phase 1 only: a FastAPI project with a `POST /datasets` endpoint that accepts an xlsx or csv file, detects the header row, builds the column profile, applies the cleaning rules in section 4.2, and returns the profile and cleaning log as JSON. Include pytest tests using small sample files with duplicates, rupee-formatted numbers and mixed date formats. Do not add AI calls yet.
