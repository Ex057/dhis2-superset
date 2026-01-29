# SQL Lab DHIS2 Query Builder Design (Draft)

## Goal
Provide a usable DHIS2 query builder inside SQL Lab that helps users compose DHIS2 analytics queries and insert the generated SQL into the editor.

## Non‑Goals (for now)
- No live metadata fetch/search in SQL Lab (avoid dependency on DHIS2 metadata endpoints).
- No automatic dataset creation from SQL Lab.
- No preview modal inside SQL Lab.

## User Flow (Current Proposed)
1. User selects DHIS2 database in SQL Lab.
2. Left sidebar shows a DHIS2 Query Builder section.
3. User manually enters UIDs for dx/pe/ou and selects relative periods.
4. Builder validates required fields and generates SQL in a preview area.
5. User clicks “Insert at Cursor” to add SQL to editor.

## UI Layout (Sidebar)
- Title: “DHIS2 Query Builder”
- Collapsible sections:
  - Data Elements (dx)
  - Periods (pe)
  - Organisation Units (ou)
  - Options (displayProperty, skipMeta)
- Preview block (generated SQL)
- Action buttons: Insert at Cursor, Copy SQL, Clear All

## Data Entry (Manual UID)
- Data Elements: text input + Add button; list with remove action.
- Periods: multi-select of relative periods + custom period input.
- Org Units: quick select (USER_ORGUNIT, CHILDREN, GRANDCHILDREN) + custom UID input.

## Validation
- Require at least one data element and one period.
- Show validation errors under preview if missing.

## Output
- SQL format used by DHIS2 dialect:
  - `-- DHIS2: dimension=dx:...&dimension=pe:...&dimension=ou:...`
  - `SELECT * FROM analytics` (or selected endpoint)

## Future Iterations
- Add metadata search (dx/pe/ou) with backend debugging panel.
- Add “Copy URL” and “Insert SQL” with fully expanded dimension param output.
- Add endpoint selector (analytics/dataValueSets/events).
- Add dataset creation button with DHIS2 parameters prefilled.

## Risks / Notes
- Manual UID input reduces fetch complexity but increases user effort.
- DHIS2 API errors like “At least one dimension must be specified” indicate malformed SQL comment or missing dimension params.
- Any changes to SQL comment format must remain compatible with `dhis2_dialect.py`.
