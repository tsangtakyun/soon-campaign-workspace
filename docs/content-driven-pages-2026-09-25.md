# Content-driven Core page library

The published contract's six roles are design choices, not an editorial sequence.
Confirmed carousel count (3–10) controls structure and drafts. Keep cover/end;
middle roles may repeat or be omitted according to content. Bind each approved
role to the existing editable master without mutating the trusted snapshot.
No automatic migration/overwrite of existing projects is performed. Old projects
with a mismatched count must regenerate structure, preserving uploaded assets.

Incident: project ac891362-6d0b-4a98-b650-e1699d145c15 requested seven pages but
the legacy fixed structure forced six. Its asset list actually contains seven
uploads (01–06 plus a screenshot); assets and pages must be labelled separately.
Final image analysis now returns done with its analysis included immediately,
avoiding the false “7/7, next image” intermediate state.

Draft provider returned 400 after an earlier timeout; historical logging did not
retain a classified reason. Request was ~37 KB (text only). Schema optional
branches were eliminated per Anthropic's grammar-complexity guidance. Required
irrelevant fields use empty values. This is a mitigation, not retrospective proof
of the provider's exact error. New logs classify schema compilation/validation,
request size or unknown, without logging private provider response text.

Tests: content-driven 3/6/7/10 pages with repeated comparison, no fabricated empty
pages at selection, trusted master unchanged, last-image transition and cache
reuse, provider error handling, structured output validation and phase routing.
