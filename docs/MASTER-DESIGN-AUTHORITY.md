# Published master authority

Tommy confirmed 2026-09-24. Governance source:
`/Users/tommytsang/Desktop/SOON/docs/content-studio/CONTENT-DIRECTION-GOVERNANCE.md`.

Core owns layout. Image optimization must not move/resize image or text frames,
change background colours, or substitute a new layout. An explicit published
artboard/role takes priority over keywords or photo counts.

Step 5 generates only representative cover/content/ending copy. Cover is a short
headline and one subtitle; ending is summary plus CTA. Preserve uncertainty and
attribution. Original approved story data is not replaced by preview copy.

Unsupported or rejected extensions remain needs-review, including cached contain
results. A user may explicitly choose original imagery. Do not mark a silent
fallback as an AI success. Preserve accepted extensions and original assets.

Regression gates: `comparison-layout.test.cjs` checks all six published layouts,
`master-policy.test.cjs` checks role budgets and unresolved composition states.
This does not claim horizontal outpainting or all copy-fitting issues are solved.
# Four-direction extension update — 2026-09-24

The composition planner and generator now share rectangle geometry for all four margins, using each published master image frame and text-safe regions. Original pixels are re-composited after generation; only environment continuation is eligible. Each requested boundary and the final margins/corners must pass subject and seam checks. Unsafe or uncertain results remain needs-review, never a replacement layout.

Accepted extensions and explicit original choices are retained. Only unresolved older composition decisions are invalidated once. Paid generation identities include horizontal placement and expansion, with persisted output recovery retained. Tests cover horizontal/vertical geometry, protected pixels, boundary rejection and cache migration. Live model aesthetic acceptance still requires inspection of actual generated results.
