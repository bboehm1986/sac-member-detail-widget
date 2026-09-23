/*
    AE Member Enrollment — Detail — SAC Custom Widget

    Per-member Annual Enrollment detail. Meant to sit beside a native SAC
    Input Control (bound to Member via Linked Analysis): with no member
    selected, shows a needs-attention list sorted by completion status;
    with one selected, shows a full detail card.

    This is the third widget of a 3-widget suite (see
    ../ae-member-enrollment-report/GOLD_VIEW_SPEC.md §10l) mirroring
    sac-ae-drilldown-widget's role on the Employer side — same two-render-
    states-by-row-count mechanism, same reasoning: SAC's Optimized-story
    View mode doesn't deliver internal click/change events to a custom
    widget's shadow DOM, so "click a row to open it" can't work as an
    in-widget interaction. Selection has to come from an EXTERNAL native
    Input Control changing the bound query's filter and pushing fresh data
    through onCustomWidgetAfterUpdate — confirmed working (2026-09-22,
    Blair) on the Employer drill-down widget this one is modeled on.

    IMPORTANT, deliberate exception to the rest of this suite: this widget
    binds to GLD_AE_Member_Enrollment DIRECTLY — row-level, PII-bearing
    Gold data, not the de-identified _NoID view sac-member-enrollment-
    widget/sac-member-operational-widget use. That reverses the original
    §8a design (member-level data was meant to never reach a custom
    widget), a reversal Blair confirmed explicitly on 2026-09-22 given the
    Employer suite's own precedent (sac-ae-drilldown-widget already does
    the same thing for employer-level data). A separate native SAC Table +
    Export button (Blair's own build, not part of this repo) remains the
    additional bulk-download surface.

    Data binding (declared in widget.json):

      - memberDetail  <- GLD_AE_Member_Enrollment (row-level, PII-bearing)
            dimensions_0  = Member
            dimensions_1  = Wave
            dimensions_2  = Enrollment_Status (Success / Abandoned / Not
                             Started / In Progress / Needs Follow-up)
            dimensions_3  = Defaulted ("Yes" / "No")
            dimensions_4  = Defaulted_Timing ("Before PSP" / "After PSP" /
                             "N/A")
            dimensions_5  = Membership_Type (Sponsored / Retired / Other)
            dimensions_6  = Member_Health_Coverage (raw election value,
                             "waived" among them)
            dimensions_7  = Vision_Plan
            dimensions_8  = Set_Up_Date
            dimensions_9  = Completed_Date
            dimensions_10 = Abandoned_Date
            measures_0    = Total_Attempts
            measures_1    = HSA_Election_Amount
            measures_2    = FSA_Health_Election_Amount
            measures_3    = FSA_Dependent_Election_Amount
            measures_4    = SuppLife_Member_Amount
            measures_5    = SuppLife_Spouse_Amount
            measures_6    = SuppLife_Dependent_Amount
            measures_7    = Retirement_Pretax_Amount
            measures_8    = Retirement_Roth_Amount

    Two render states, decided purely by how many rows arrive:
      - No Input Control selection -> many rows -> "needs attention" list,
        sorted client-side (least-complete Enrollment_Status first, same
        STATUS_PRIORITY convention as the Employer drill-down). Capped to
        a readable number of rows; a caption points at the Input Control
        for the full detail card.
      - One member selected        -> exactly one row -> a full detail
        card (status, dates, election detail).

    Until wired to the real Datasphere-backed model, the widget renders
    from the MOCK_* constants below (see preview.html) — one mock set for
    the multi-row default state, one for the single-row selected state,
    toggled via the "Toggle mock: selected member" preview control since
    real Input Control filtering can't be simulated standalone.
*/
(function () {
    "use strict";

    const STATUS_PRIORITY = {
        "Not Started": 1, "In Progress": 2, "Needs Follow-up": 3, "Abandoned": 4, "Success": 5,
    };
    const STATUS_LABELS = { "Success": "Completed", "Abandoned": "Started, Not Completed", "Not Started": "Not Started", "In Progress": "In Progress", "Needs Follow-up": "Needs Follow-up" };
    const MAX_LIST_ROWS = 25;

    function row(dims, measures) {
        const out = {};
        dims.forEach((d, i) => { out["dimensions_" + i] = { id: d, label: d }; });
        measures.forEach((m, i) => { out["measures_" + i] = { raw: m, formatted: String(m) }; });
        return out;
    }

    // Multi-row mock — the unfiltered "needs attention" default state.
    const MOCK_MEMBER_LIST = { data: [
        row(["9996795", "Wave 3", "Not Started", "No", "N/A", "Other", "", "", "", "", ""], [0, 0, 0, 0, 0, 0, 0, 0, 0]),
        row(["5750789", "Wave 2b", "Not Started", "No", "N/A", "Retired", "", "", "", "", ""], [0, 0, 0, 0, 0, 0, 0, 0, 0]),
        row(["1842687", "Wave 1", "In Progress", "No", "N/A", "Sponsored", "", "", "2026-10-19", "", ""], [2, 500, 0, 0, 0, 0, 0, 0, 0]),
        row(["9513394", "Wave 2a", "Needs Follow-up", "No", "N/A", "Sponsored", "", "", "2026-11-09", "", ""], [3, 0, 0, 0, 10, 0, 0, 0, 0]),
        row(["2766505", "Wave 1", "Abandoned", "Yes", "Before PSP", "Retired", "waived", "", "2026-10-19", "", "2026-10-30"], [1, 0, 0, 0, 0, 0, 0, 0, 0]),
        row(["2794088", "Wave 1", "Abandoned", "Yes", "After PSP", "Sponsored", "waived", "", "2026-10-19", "", "2026-11-04"], [2, 0, 0, 0, 0, 0, 0, 0, 0]),
        row(["3832321", "Wave 2a", "Success", "No", "N/A", "Other", "silver", "silver", "2026-11-09", "2026-11-12", ""], [1, 500, 250, 0, 0, 0, 0, 88, 0]),
        row(["8033811", "Wave 2b", "Success", "No", "N/A", "Sponsored", "gold", "gold", "2026-11-09", "2026-11-15", ""], [1, 1000, 0, 0, 20, 10, 0, 0, 145]),
    ] };

    // Single-row mock — one member selected via the Input Control.
    const MOCK_MEMBER_SELECTED = { data: [
        row(["1842687", "Wave 1", "Success", "No", "N/A", "Sponsored", "silver", "silver", "2026-10-19", "2026-10-24", ""], [2, 500, 250, 0, 25, 0, 0, 88, 0]),
    ] };

    const template = document.createElement("template");
    template.innerHTML = `
        <style>
            :host {
                display: block;
                box-sizing: border-box;
                font-family: "72", "Segoe UI", Arial, sans-serif;

                /* Same glassmorphism/depth design system as the other two
                   widgets in this suite, copied wholesale for visual
                   consistency — each Shadow DOM is isolated, so this is a
                   copy-paste convention, not shared CSS. */
                --mesh-1: rgba(106, 92, 240, 0.16);
                --mesh-2: rgba(47, 111, 224, 0.12);
                --mesh-3: rgba(20, 151, 111, 0.10);
                --surface: rgba(255, 255, 255, 0.58);
                --surface-2: rgba(23, 26, 35, 0.055);
                --border: rgba(255, 255, 255, 0.65);
                --text: #171a23;
                --text-soft: #5b6072;
                --accent: #6a5cf0;
                --accent-bg: rgba(106, 92, 240, 0.14);
                --success: #14976f;
                --success-bg: rgba(20, 151, 111, 0.14);
                --warning: #a5700c;
                --warning-bg: rgba(165, 112, 12, 0.14);
                --info: #2f6fe0;
                --info-bg: rgba(47, 111, 224, 0.14);
                --danger: #c94b4b;
                --danger-bg: rgba(201, 75, 75, 0.14);
                --glass-blur: blur(20px) saturate(180%);
                --shadow-card: 0 1px 1px rgba(23,26,35,0.03), 0 4px 12px -2px rgba(23,26,35,0.07), 0 14px 28px -10px rgba(23,26,35,0.10);
            }
            * { box-sizing: border-box; }

            .dashboard {
                width: 100%; height: 100%; overflow: auto;
                background:
                    radial-gradient(at 12% 8%, var(--mesh-1) 0%, transparent 45%),
                    radial-gradient(at 88% 14%, var(--mesh-2) 0%, transparent 45%),
                    radial-gradient(at 50% 100%, var(--mesh-3) 0%, transparent 50%),
                    #f4f5fa;
                color: var(--text); border-radius: 18px; padding: 18px;
            }

            .panel, .badge, .pill { backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); }
            @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
                .panel { background: rgba(255,255,255,0.94) !important; }
            }

            .topbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
            .eyebrow { font-size: 10.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-soft); margin-bottom: 4px; }
            .topbar h1 { font-size: 19px; font-weight: 700; margin: 0; display: inline; }
            .titlewrap { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
            .badge { font-size: 10.5px; font-weight: 600; letter-spacing: 0.01em; padding: 3px 9px; border-radius: 100px; border: 1px solid; white-space: nowrap; }
            .badge.accent { color: var(--accent); border-color: rgba(106,92,240,0.35); background: var(--accent-bg); }

            .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px; box-shadow: var(--shadow-card); }
            .empty-row { font-size: 12.5px; color: var(--text-soft); padding: 4px 0; }

            /* ---- Selected-member detail card ---- */
            .member-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 4px; }
            .member-head h2 { font-size: 17px; font-weight: 700; margin: 0; color: var(--text); }
            .pill { font-size: 10.5px; font-weight: 600; padding: 2px 8px; border-radius: 100px; border: 1px solid rgba(106,92,240,0.35); background: var(--accent-bg); color: var(--accent); white-space: nowrap; }
            .pill.success { border-color: rgba(20,151,111,.35); background: var(--success-bg); color: var(--success); }
            .pill.warning { border-color: rgba(165,112,12,.35); background: var(--warning-bg); color: var(--warning); }
            .pill.danger { border-color: rgba(201,75,75,.35); background: var(--danger-bg); color: var(--danger); }
            .member-sub { font-size: 12px; color: var(--text-soft); margin-bottom: 14px; }

            .detail-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
            .detail-table th, .detail-table td { padding: 7px 10px; text-align: left; border-bottom: 1px solid var(--border); }
            .detail-table tbody td { text-align: right; font-variant-numeric: tabular-nums; }
            .detail-table tbody th { font-weight: 600; color: var(--text); white-space: nowrap; }
            .detail-table tbody tr:last-child td, .detail-table tbody tr:last-child th { border-bottom: none; }
            .detail-table .section-row th { padding-top: 14px; font-size: 9.5px; font-weight: 700; color: var(--text-soft); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: none; }

            /* ---- Needs-attention default list ---- */
            .attn-row { display: flex; align-items: center; gap: 10px; font-size: 12.5px; padding: 8px 0; border-bottom: 1px solid var(--border); }
            .attn-row:last-child { border-bottom: none; }
            .attn-row .name { flex: 1 1 auto; min-width: 0; }
            .attn-row .name .primary { color: var(--text); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .attn-row .name .secondary { color: var(--text-soft); font-size: 11px; }
            .attn-row .status { flex: none; font-size: 11.5px; color: var(--text-soft); white-space: nowrap; text-align: right; }
            .attn-more { font-size: 11px; color: var(--text-soft); text-align: center; padding-top: 10px; }
        </style>
        <div class="dashboard">
            <div class="topbar">
                <div>
                    <div class="eyebrow">Annual Enrollment — Member Detail</div>
                    <div class="titlewrap">
                        <h1>Member Detail</h1>
                        <span class="badge accent" id="dataBadge">Mock Data — Preview</span>
                    </div>
                </div>
            </div>
            <div class="panel" id="body"></div>
        </div>
    `;

    class MemberDetail extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(template.content.cloneNode(true));

            this._props = { width: 900, height: 480 };
            this._memberDetail = MOCK_MEMBER_LIST;
            this._usingMockData = true;
        }

        connectedCallback() {
            this._render();
        }

        onCustomWidgetBeforeUpdate(changedProperties) {
            this._props = Object.assign({}, this._props, changedProperties);
        }

        onCustomWidgetAfterUpdate(changedProperties) {
            if ("width" in changedProperties) this.style.width = changedProperties.width + "px";
            if ("height" in changedProperties) this.style.height = changedProperties.height + "px";
            if ("memberDetail" in changedProperties) { this._memberDetail = changedProperties.memberDetail; this._usingMockData = false; }
            this._render();
        }

        onCustomWidgetDestroy() {
            // No timers/subscriptions held; nothing to tear down.
        }

        refresh() {
            this._render();
        }

        // ---- Parsing helpers — same normalization pattern as the
        // Employer drill-down (SAC represents a blank dimension member as
        // literal placeholder text, not an empty string). ----
        _dim(r, i) {
            const d = r["dimensions_" + i];
            if (!d) return "";
            if (d.id === "@NullMember" || d.label === "(Null)" || d.label === "(No Value)") return "";
            return d.label;
        }
        _measure(r, i) {
            const m = r["measures_" + i];
            if (!m) return 0;
            const n = Number(m.raw);
            return Number.isFinite(n) ? n : 0;
        }

        _parseRow(r) {
            return {
                member: this._dim(r, 0),
                wave: this._dim(r, 1),
                enrollmentStatus: this._dim(r, 2),
                defaulted: this._dim(r, 3),
                defaultedTiming: this._dim(r, 4),
                membershipType: this._dim(r, 5),
                healthCoverage: this._dim(r, 6),
                visionPlan: this._dim(r, 7),
                setUpDate: this._dim(r, 8),
                completedDate: this._dim(r, 9),
                abandonedDate: this._dim(r, 10),
                totalAttempts: this._measure(r, 0),
                hsaAmount: this._measure(r, 1),
                fsaHealthAmount: this._measure(r, 2),
                fsaDependentAmount: this._measure(r, 3),
                suppLifeMemberAmount: this._measure(r, 4),
                suppLifeSpouseAmount: this._measure(r, 5),
                suppLifeDependentAmount: this._measure(r, 6),
                retirementPretaxAmount: this._measure(r, 7),
                retirementRothAmount: this._measure(r, 8),
            };
        }

        _statusPriority(status) {
            return STATUS_PRIORITY[status] || 99;
        }
        _statusLabel(status) {
            return STATUS_LABELS[status] || status || "—";
        }
        _statusPillClass(status) {
            if (status === "Success") return "success";
            if (status === "Not Started" || status === "Needs Follow-up") return "warning";
            if (status === "Abandoned") return "danger";
            return "";
        }
        _money(v) {
            return v ? "$" + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
        }

        // ---- Selected-member detail card ----
        _detailCardHtml(m) {
            const rows = [
                { section: "Status" },
                { label: "Set Up Date", v: m.setUpDate || "—" },
                { label: "Completed Date", v: m.completedDate || "—" },
                { label: "Abandoned Date", v: m.abandonedDate || "—" },
                { label: "Total Attempts", v: m.totalAttempts.toLocaleString() },
                { label: "Defaulted", v: m.defaulted === "Yes" ? "Yes — " + (m.defaultedTiming || "N/A") : "No" },
                { section: "Elections" },
                { label: "Health Coverage", v: m.healthCoverage || "—" },
                { label: "Vision", v: m.visionPlan || "—" },
                { label: "HSA", v: this._money(m.hsaAmount) },
                { label: "FSA — Health", v: this._money(m.fsaHealthAmount) },
                { label: "FSA — Dependent", v: this._money(m.fsaDependentAmount) },
                { label: "Supp Life — Member", v: this._money(m.suppLifeMemberAmount) },
                { label: "Supp Life — Spouse", v: this._money(m.suppLifeSpouseAmount) },
                { label: "Supp Life — Dependent", v: this._money(m.suppLifeDependentAmount) },
                { label: "Retirement — Pretax", v: this._money(m.retirementPretaxAmount) },
                { label: "Retirement — Roth", v: this._money(m.retirementRothAmount) },
            ];
            const bodyRows = rows.map((r) =>
                r.section
                    ? `<tr class="section-row"><th colspan="2" scope="colgroup">${r.section}</th></tr>`
                    : `<tr><th scope="row">${r.label}</th><td>${r.v}</td></tr>`
            ).join("");
            return `
                <div class="member-head">
                    <h2>Member ${m.member || "(Unknown)"}</h2>
                    <span class="pill">${m.wave || "No Wave"}</span>
                    <span class="pill ${this._statusPillClass(m.enrollmentStatus)}">${this._statusLabel(m.enrollmentStatus)}</span>
                </div>
                <div class="member-sub">${m.membershipType || "Membership type unknown"}</div>
                <table class="detail-table"><tbody>${bodyRows}</tbody></table>`;
        }

        // ---- Needs-attention default list (no member selected) ----
        _attentionListHtml(entries) {
            if (!entries.length) return `<div class="empty-row">No member data bound yet</div>`;
            const shown = entries.slice(0, MAX_LIST_ROWS);
            const rowsHtml = shown.map((m) =>
                `<div class="attn-row">
                    <div class="name">
                        <div class="primary" title="${m.member}">Member ${m.member || "(Unknown)"}</div>
                        <div class="secondary">${m.wave || "No Wave"} &middot; ${m.membershipType || "Unknown type"}</div>
                        ${m.defaulted === "Yes" ? `<div class="secondary">Defaulted — ${m.defaultedTiming || "N/A"}</div>` : ""}
                    </div>
                    <div class="status">${this._statusLabel(m.enrollmentStatus)}</div>
                </div>`
            ).join("");
            const more = entries.length > MAX_LIST_ROWS
                ? `<div class="attn-more">+ ${(entries.length - MAX_LIST_ROWS).toLocaleString()} more — select a member above to see their full detail</div>`
                : "";
            return rowsHtml + more;
        }

        // ---- Rendering ----
        _render() {
            const root = this._shadowRoot;
            const dataBadgeEl = root.getElementById("dataBadge");
            dataBadgeEl.hidden = !this._usingMockData;

            const rawRows = (this._memberDetail && this._memberDetail.data) || [];
            const rows = rawRows.map((r) => this._parseRow(r));
            const bodyEl = root.getElementById("body");

            if (rows.length === 1) {
                bodyEl.innerHTML = this._detailCardHtml(rows[0]);
                return;
            }

            // Needs-attention default state — sorted client-side,
            // least-complete Enrollment_Status first (same STATUS_PRIORITY
            // convention as the Employer drill-down's needs-attention
            // list) — a custom widget sorts in JS, no SQL sort-helper
            // columns needed.
            const sorted = rows.slice().sort((a, b) => {
                const statusDiff = this._statusPriority(a.enrollmentStatus) - this._statusPriority(b.enrollmentStatus);
                if (statusDiff !== 0) return statusDiff;
                return (a.member || "").localeCompare(b.member || "");
            });

            bodyEl.innerHTML = this._attentionListHtml(sorted);
        }
    }

    // Exposed statically so preview.html can toggle between the two mock
    // states without duplicating the datasets — real Input Control
    // filtering can't be simulated standalone.
    MemberDetail.MOCK_MEMBER_LIST = MOCK_MEMBER_LIST;
    MemberDetail.MOCK_MEMBER_SELECTED = MOCK_MEMBER_SELECTED;

    customElements.define("com-porticobenefits-memberdetail", MemberDetail);
})();
