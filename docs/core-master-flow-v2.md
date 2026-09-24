# Core master flow v2 — 2026-09-24

User-approved change: the existing published editable Core masters are the design authority, not a reference for a new design.

Image workflow: Brief → format and Core example selection → content and per-page uploads/AI imagery → output and editing. Video workflow is unchanged.

- Selection renders the literal published canvas example, without personalized image generation or AI suitability ranking.
- Server validates the published contract hash and saves a trusted snapshot. Story and asset edits do not require a new suitability recommendation.
- Fixed masters determine page roles/count before story generation.
- AI imagery uses the selected master image-frame geometry and text safe zones; it does not generate the typography, logo or replacement layout.
- Existing final editable-document rendering/export remains authoritative. Existing assets and outputs survive story regeneration; generation failure is not reported as success.
- Legacy style/assets URLs map into the new flow. Existing draft work has an explicit resume entry.

Verification: TypeScript, catalog authorization/selection tests, seven existing flow/rendering regression suites, browser fixture of published Core canvas. Live paid generation and uploaded-image extension quality still require project acceptance; this flow change does not guarantee outpainting succeeds for every image.
