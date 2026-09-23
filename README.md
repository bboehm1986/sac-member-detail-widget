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

- **No Input Control selection** → many rows arrive → a "needs
  attention" list, sorted client-side (least-complete Enrollment Status
  first).
- **One member selected** (via a native Input Control bound to `Member`)
  → exactly one row arrives → a full detail card.

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

- **`memberDetail`** ← `GLD_AE_Member_Enrollment` directly (row-level,
  PII-bearing — see the exception noted above). 11 dimensions (Member,
  Wave, Enrollment_Status, Defaulted, Defaulted_Timing, Membership_Type,
  Member_Health_Coverage, Vision_Plan, Set_Up_Date, Completed_Date,
  Abandoned_Date) and 9 measures (Total_Attempts, HSA/FSA ×2/Supp Life
  ×3/Retirement ×2 election amounts).

## Status of this build

- ✅ Widget scaffold, layout, and both render states (list + detail
  card) — done, verified locally against mock data (see `preview.html`'s
  toggle button); no console errors.
- ⏳ Not yet hosted on GitHub Pages or registered in SAC.
- ⏳ Blocked on real data — `GLD_AE_Member_Enrollment` itself needs the
  drafted Gold SQL in `BUILD_PLAN_FOR_AHMED.md` deployed first
  (`Membership_Type`, `Member_Health_Coverage`, and the `AE_EventRqsts`
  Wave/Defaulted join are all part of that same rebuild, not yet live).
- ⏳ `Employer` and `Sponsored` (the generic Ahmed-owned placeholder, not
  `Membership_Type`) are not bound here — not yet built in Gold at all.

## Next steps (once ready)

1. Host `main.js`/`icon.svg` on GitHub Pages, matching `widget.json`'s
   hardcoded URLs (`bboehm1986.github.io/sac-member-detail-widget/...`).
2. Register in SAC (System → Custom Widgets → Add Custom Widget).
3. Deploy the drafted Gold SQL per `BUILD_PLAN_FOR_AHMED.md`, build a SAC
   model directly on `GLD_AE_Member_Enrollment`, and bind `memberDetail`.
4. Add a native SAC Input Control bound to `Member`, wired to the same
   model via Linked Analysis (Tools → Link Dimensions) — this is what
   actually drives list-vs-detail, not anything in this widget's own code.
5. Confirm the access/sensitivity conversation implied by binding
   row-level PII into a custom widget has actually happened, if it hasn't
   already — see the exception note above.
