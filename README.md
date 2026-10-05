# AE Member Enrollment Detail — SAC Custom Widget

A custom widget for SAP Analytics Cloud rendering **per-member Annual
Enrollment detail**. This is the third widget of a **3-widget suite**
(see [`../ae-member-enrollment-report/GOLD_VIEW_SPEC.md`](../ae-member-enrollment-report/GOLD_VIEW_SPEC.md)
§10l) mirroring the Employer Election suite's structure — this widget
plays the same role [AE Employer Election Drill-Down](../sac-ae-drilldown-widget)
does there. Headline leadership tiles live on
[AE Member Enrollment (Snap)](../sac-member-enrollment-widget); the
fuller operational breakdowns live on
[AE Member Enrollment Operational](../sac-member-operational-widget).


## FLEX members are excluded (v1.3.0, 2026-10-05)

`GLD_AE_Member_Enrollment` is shared with the FLEX dashboard (`sac-flex-member-widget`). FLEX members carry Wave "Group A"–"Group F", and this widget drops any row whose Wave starts with `Group `, next to its Portico exclusion. Blank-Wave rows are kept, so Traditional numbers don't change. In a headless check, output was byte-identical with and without FLEX rows injected. Gold's `Employer` column is also no longer NULL: it now holds "Name (Number)". Details: `../flex-member-enrollment-report/GOLD_CHANGES.md`.

## Important — deliberate exception to the rest of this suite

This widget binds to `GLD_AE_Member_Enrollment` **directly** — row-level,
PII-bearing Gold data, **not** the de-identified `_NoID` view the other
two widgets in this suite use. That reverses the original `GOLD_VIEW_SPEC.md`
§8a design (member-level data was meant to never reach a custom widget's
browser) — a reversal **explicitly confirmed by Blair on 2026-09-22**,
given the Employer suite's own precedent: `sac-ae-drilldown-widget`
already does the same thing for employer-level data, built as a custom
widget rather than a native SAC Table specifically because a raw native
Table looked "bolted on" next to the other two widgets' shared styling.
A separate native SAC Table + Export button (Blair's own build, not part
of this repo) remains the additional bulk-download surface — this widget
doesn't replace it.

## The interaction mechanism — not an in-widget click handler

Confirmed by reading `sac-ae-drilldown-widget`'s own code before building
this one: its per-row "Open" interaction is **not** a click handled
inside the widget's shadow DOM (that's the exact pattern already
confirmed, twice, not to work in SAC's Optimized-story View mode). It's
driven by a **native SAC Input Control** (Linked Analysis) that filters
the bound model externally — the widget only ever reacts to
`onCustomWidgetAfterUpdate` with whatever rows the current filter
returns. This widget works the same way:

- **No Input Control selection** → many members arrive → a "needs
  attention" list of CURRENT-cycle rows, sorted client-side
  (least-complete Enrollment Status first).
- **One member selected** (via a native Input Control bound to `Member`)
  → one distinct member arrives (as up to two rows, one per cycle) → a
  full detail card with **Prior Cycle / This Cycle** columns; changed
  election values are highlighted. The card/list decision counts distinct
  MEMBERS, not rows — a member now has a row per cycle.

## Two lessons carried over from the start, same as the rest of this suite

- **No in-widget filter controls.** Selection happens via the native
  Input Control described above, not anything drawn inside this widget.
- **No theme toggle, light theme only.** Same View-mode limitation.

## Files

- `widget.json` — manifest: properties (`width`, `height`), one data
  binding (`memberDetail`), one exposed scripting method (`refresh`).
- `main.js` — defines the `<com-porticobenefits-memberdetail>` custom
  element. Renders either the needs-attention list or the single-member
  detail card depending on how many rows are bound (see above). The
  detail card shows status/dates/attempts, then a full election-detail
  section (Health Coverage, Vision, HSA, FSA ×2, Supp Life ×3,
  Retirement ×2). Falls back to built-in mock data when no data binding
  is bound, so both render states are reviewable standalone via the
  toggle button in `preview.html`.
- `icon.svg` — icon shown in the SAC widget panel (copied from the Snap
  widget — same family, same icon).
- `preview.html` — standalone local test harness; drives the widget
  through the real `onCustomWidgetBeforeUpdate`/`onCustomWidgetAfterUpdate`
  lifecycle hooks and includes a toggle button to swap between the two
  mock states, since real Input Control filtering can't be simulated
  standalone.

## Data binding — what it expects

- **`memberDetail`** ← `AM_MEMBER_ENROLLMENT_DETAIL` (built on
  `GLD_AE_Member_Enrollment` directly — row-level, PII-bearing — see the
  exception noted above). SAC binds by POSITION, so add **Measures first,
  then Dimensions, in exactly this order**:
  - **9 measures:** Total_Attempts, HSA_Election_Amount,
    FSA_Health_Election_Amount, FSA_Dependent_Election_Amount,
    SuppLife_Member_Amount, SuppLife_Spouse_Amount,
    SuppLife_Dependent_Amount, Retirement_Pretax_Amount,
    Retirement_Roth_Amount.
  - **13 dimensions:** Member, Wave, Enrollment_Status, Defaulted,
    Defaulted_Timing, Membership_Type, Member_Health_Coverage, Vision_Plan,
    Set_Up_Date, Completed_Date, Abandoned_Date, Is_Portico_Employee,
    **EventDate (LAST)**.
- **`EventDate` (added v1.2.0) must be the last dimension.** It marks
  this cycle (`2027-01-01`) vs. prior (`2026-01-01`) by its YEAR; the
  widget's `CURRENT_EVENT_YEAR` / `PRIOR_EVENT_YEAR` constants must be
  bumped each cycle. If it isn't bound the widget does NOT go blank: it
  shows all rows as before with a one-line notice asking for the binding.
  Never put an Input Control or filter on `EventDate` — the comparison
  needs both cycles' rows.
- Portico's own employees (`Is_Portico_Employee = 'Yes'`) are excluded by
  the widget AND by a story-level `Is_Portico_Employee = No` filter on
  the main story. The HR-only dashboard for them is
  [`sac-member-portico-widget`](../sac-member-portico-widget), a separate
  story.

## Status of this build

- ✅ Built, hosted on GitHub Pages, registered in SAC, bound, and
  confirmed working against real (QA) data, including the prior-cycle
  comparison (2026-10-05).
- ✅ Native Input Controls on the Detail page: `Member` (the priority),
  `Enrollment_Status`, `Member_Health_Coverage`, `Defaulted` — set up
  2026-10-03; `Wave` later, once real Wave tags exist.
- ⏳ `Membership_Type`, `Eligible_Count`, `Health_Covered_Count` are `NULL`
  placeholders in Gold until BR-29 is fixed, so the card/list read
  "Membership type unknown" / "Unknown type" today. Expected, not a bug.
- ⏳ Prior-cycle data is sparse in QA (~81 rows), so most members show
  "No prior-cycle record".
- ⏳ `Employer` and `Sponsored` are not bound here — not built in Gold.
- Known minor edge case: if the bound data contains no non-Portico rows
  for the current selection, the empty-state text can read "EventDate is
  not bound" even though it is (the check runs after the Portico filter).
  Rare on this widget; fixed on the Portico widget in v1.1.2.

## Changing it

- Pushing a `main.js` change changes its hash, which breaks the live SAC
  registration until `widget.json` is re-uploaded. Bump the version
  (minor/patch only — a placed instance is locked to its major version),
  recompute the integrity hash
  (`openssl dgst -sha384 -binary main.js | openssl base64 -A`), and warn
  before pushing.
- GitHub Pages can sit "queued" for a long time; check
  `api.github.com/repos/<owner>/<repo>/actions/runs` and confirm the
  hosted `widget.json` shows the new version before re-uploading.
- No caveat / "open items" banners on this or any widget (Blair's
  standing decision, 2026-10-05).
