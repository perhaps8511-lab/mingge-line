# CARD 124 v1.3 — Mingge FalseToken 產品閉環

- execution_authority: `READMITTED`
- owner_anchor: `recAmE4JNKbw3q35U`
- p0_2_anchor: `recsBhYiEd5gCyxlZ`
- exact_base: `c97bb04982342617229ec55ef7158036cc25f7e8`
- pm_lease: `COWORK-PM-MGFT-01`
- writer: `CODEX-WRITE-MGFT-01`
- reviewer: `CODEX-REVIEW-MGFT-01`
- allowed_end_state: single Draft PR; no merge, deploy, Production Activation, or External TA release

## Phase 0 receipt

- P0-0 `PASS`: open PR #1 changes only `governance/OWNER_DECISION_LOG.md`; intersection with this card's write set is empty.
- P0-1 `TRACK_B_HOLD`: no durable `deepen_200` to `log_id` binding exists.
- P0-2 `PASS` by formal anchor `recsBhYiEd5gCyxlZ`: scenario 5202754 module 44 decrements `trial_quota_remaining` first, then `monthly_quota_remaining`. Card 124 does not modify scenario 5202754.
- P0-3 `PASS`: existing `mingge-relay` bindings support the design with only the new `HOOK_FALSETOKEN` secret name. The value is not handled or recorded here.

## Track A exact Make mutation packet

Chat MCP is the actor for Make. Codex does not substitute UI or route connector work to Owner.

### A2 — create scenario

- Create `命格_03B_FalseToken_發動鏈`.
- Accept only trusted normalized fields: `order_id`, `custom_id`, `line_user_id`, `plan`, `amount`, `status`.
- Require `status=pending`.
- Create exactly one pending record in `appfQm6On0Wp9LtL9 / tblwwjFN2pY7T8BKN`.
- Immediately POST the normalized verification payload to existing 命格_04 webhook `2448651`.
- Do not write `paid`; do not write Subscribers.
- Rollback: deactivate and retain; do not delete.

### A4/A5 — scenario 5375310, M10/M11 only

- `single_149`: write `fld0xQM3jegjRYxNO = trial_quota_remaining + 1`; tier unchanged.
- `pack_399`: write `fld0xQM3jegjRYxNO = trial_quota_remaining + 3`; tier remains free; no reset and no subscriber conversion.
- `sub_1490`: tier subscriber; preserve current `subscription_start` and `quota_reset_date` behavior; quota unchanged.
- `deepen_200`: zero Subscribers write.
- Existing Subscriber with `consent_at`: update entitlement only.
- Missing Subscriber or missing consent: do not create a Subscriber and do not write `payment_bypass_consent_gate`; retain paid evidence in Payment_Orders for later onboarding.
- Before/after evidence must include scenario ID, version, lastEdit, sanitized M10/M11 mapping, and execution ID. M3/M7 Authorization material must be redacted.

## Track B schema proposal — not authorized for mutation

```yaml
base: appfQm6On0Wp9LtL9
table: tblwwjFN2pY7T8BKN
field:
  name: entitlement_log_id
  type: singleLineText
contract: '^rec[A-Za-z0-9]{14}$; required for deepen_200, empty otherwise'
writer: 命格_03B from trusted issuer normalized payload
reader: mingge-relay POST /trigger/deepdive
legacy_rows: remain empty
rollback: disable use and retain empty field; deletion requires separate authority
```

Track B remains HOLD until explicit schema mutation GO.
