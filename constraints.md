# Posting Allocator Constraints

All constraints below are implemented in [`server/services/posting_allocator.py`](./server/services/posting_allocator.py).

- “Hard” constraints must hold in every solution.
- “Soft” constraints are traded off in the objective with penalties or bonuses.

## Glossary

- **CCR**: Cross-Cluster Rotation
- **SR**: Senior Residency

Postings include:

- **GM**: General Medicine
- **GRM**: Geriatric Medicine
- **MICU**: Medical ICU
- **RCCM**: Respiratory Critical Care Medicine
- **ED**: Emergency Department
- **CVM**: Cardiovascular Medicine
- **Endocrine**: Endocrinology
- **Gastro**: Gastroenterology
- **MedComm**: Medical Community
- **Haemato**: Haematology
- **ID**: Infectious Diseases
- **Med Onco**: Medical Oncology
- **PMD**: Palliative Medicine
- **RAI**: Rheumatology and Immunology
- **Rehab**: Rehabilitation
- **Renal**: Renal Medicine
- **NL**: Neurology
- **Derm**: Dermatology

## Overview of posting assignment

The solver assigns exactly one thing per resident per block (a posting or OFF), while respecting:

- What is already fixed (history, pins, leave)
- Career stage progression (what a resident is allowed to do)
- Posting structure rules (block lengths, contiguity, start months)
- Programme requirements (cores, electives, ICU packs)
- Optimisation preferences (electives, SR, seniority, bundles)

## Linking, Inputs, and Pre-conditions

#### Variable binding

Refer to `# CREATE DECISION VARIABLES` section of the code in [`server/services/posting_allocator.py`](./server/services/posting_allocator.py).

- For each resident, each posting assignment is represented at 3 levels:
  - Block-level variables
    - In dictionary format: `x[mcr][posting][block]`
    - If resident `mcr` is assigned to posting `p` in block `b`, then `x[mcr][posting][block]=1`.
  - Selection flags
    - Whether the posting is selected
    - If posting `p` is selected at least once for the resident (run-level selection), then `selection_flags[mcr][p]=1`.
  - Run-count
    - Run: 1 continuous posting assignment whose length is fixed by `required_block_duration`
    - CCR with `required_block_duration = 3` → 3 consecutive blocks in 1 run
    - `run_count` = How many times the resident undertakes that posting as a full, valid rotation
- These are tied together
  - `selected ⇔ run_count ≥ 1` is enforced.
  - Full run-shape validity is enforced via HC3 automata (for applicable postings) plus posting-specific constraints (for example HC4 for CCR), rather than one global `Σ blocks = run_count × required_block_duration` equation for every posting.

#### Pins

Refer to `# APPLY PINNED ASSIGNMENTS (IF ANY)` section of the code in [`server/services/posting_allocator.py`](./server/services/posting_allocator.py).

- Explicit pinned rows and current-year resident-history rows fix `x[mcr][posting][block] = 1`.
- If a resident already has a known posting (because the user pinned it or because it already happened this year), the solver is forced to assign that exact posting in that block.

#### Leaves

- Leaves are normalised (deduped) (`normalised_leaves`) so duplicates are removed.
- Leaves force `OFF` in those blocks.
- If a leave specifies a posting code, it reserves capacity. That capacity is removed from the posting pool.
- Leaves block residents and consume capacity, preventing over-booking

#### Career progression

- 3 stages
  - Stage 1: `blocks_completed < 12`
  - Stage 2: `12 <= blocks_completed < 24`
  - Stage 3: `blocks_completed >= 24`
- Stage per block advances only on worked blocks (leave blocks pause the counter)
- This drives stage-aware rules (CCR, GM caps, SR window), eg HC11, HC15

## Hard Constraints

Refer to `# DEFINE HARD CONSTRAINTS` section of the code in [`server/services/posting_allocator.py`](./server/services/posting_allocator.py).

#### HC1 — Exclusivity per block

- For each resident, each block must have exactly one of:
  - A posting; or
  - `OFF`. Leave blocks are forced to `OFF`.
    - `off_or_leave[mcr][b] == 1`
- `[x[mcr][p][b] for p in posting_codes] + [off_or_leave[mcr][b]] = 1`

#### HC2 — Posting capacity

- Per-block headcount ≤ `max_residents` minus any slots reserved for leave.
- `available_capacity = max_residents - leave_reserved_slots`
- `sum(x[r["mcr"]][p][b] for r in residents) <= available_capacity`

#### HC3 — Consecutive runs

- Each posting honours `required_block_duration` using an automaton (no fragmented runs).
- Postings with multi-block durations must have consecutive blocks and exactly match the required length.

#### HC4 — CCR availability by stage

- CCR is forbidden (0 CCR this year):
  - in stage 1
  - if any CCR has already been completed historically
  - if no stage ≥2 blocks exist
- Otherwise (when stage 2 or 3 blocks exist and CCR not yet done):
  - **Only one type of CCR posting** can be selected, but not both.
  - Exactly one run when stage 3 blocks exist.
  - At most one run when only stage 2 blocks exist.
- **Block count**: For each offered CCR posting, if selected then assigned blocks must equal its `required_block_duration`; if not selected then assigned blocks must be 0 (enforced directly in HC4).

#### HC5 — Core caps (per resident)

- Do not exceed base core requirements.
  - `GM` can exceed base requirements if the resident already completed `MedComm (TTSH)` in the past or are assigned `MedComm (TTSH)` in any block this year.
  | Scenario                | medcomm_flag | GM max |
  | ----------------------- | ------------ | ------ |
  | No MedComm              | 0            | 6      | 
  | MedComm done / assigned | 1            | 12     |

- If already met historically, block further assignments of that base. 
  - Exception: `GM` can exceed base requirements (to max of 12) if the resident already completed `MedComm (TTSH)` in the past or are assigned `MedComm (TTSH)` in any block this year.
- Implies that if a resident has already exceeded the `GM` base cap and has not done `MedComm` historically, then the solver MUST assign `MedComm`.

#### HC6 — Elective repetition

- At most one variant of an elective base.
- If a base elective is already completed historically, variants of that base are disallowed.
- Pinned exception: if one variant is already pinned for the current year, that pinned variant is allowed while other variants of the same base are disallowed.
- Example of variants: `GM (NUH)`, `GM (SGH)`, `GM (CGH)`, `GM (SKH)`, `GM (WH)`

#### HC7a — MICU/RCCM institution consistency

- Cannot select MICU and RCCM from different institutions.
- If MICU and RCCM are both assigned, they must come from the same institution.

#### HC7b — MICU/RCCM contiguity

- MICU/RCCM blocks must form one contiguous run and cannot span Dec→Jan.

#### HC8 — Dec→Jan guardrail

- No posting may have runs in both Dec (block 6) and Jan (block 7)
- Exception: GRM (when it is in a run with GM / ED)

#### HC9 — GRM start months

- GRM may only start on odd blocks
- Even-block GRM must continue from the prior block

#### HC10 — Quarter starts for 3-block runs

- Postings of duration 3 may only start on blocks 1, 4, 7, or 10.
- Other blocks must be continuations.

#### HC11 — Stage-1 GM cap

- Max three GM blocks in stage 1.
- Historical GM counts toward the cap.

#### HC12 - Within each half-year, if there are >=2 blocks of (`GM`, `GRM`, `MedComm`), require >=1 block of (`ED` or `GM`)
- Check within 6 months blocks: Within blocks 1-6 and within blocks 7-12
- If there are at least 2 blocks with any of these: `GM`, `GRM` or `MedComm`, then there must be at least 1 block of `ED` or `GM` within that same 6-month window.

#### HC13 — MICU/RCCM packs by stage

**Overall Requirement:**
- Every resident must complete exactly **3 MICU + 3 RCCM blocks** by end of residency (including history).

**Contiguity / shape enforcement in code:**
- Global MICU/RCCM contiguity and Dec-Jan boundary are enforced by HC7b.
- HC13 itself enforces stage-wise count mix requirements (how many MICU vs RCCM), not explicit pattern templates like `MRR` or `MMR`.

**Stage-by-Stage Delivery Logic:**

**Stage 1 (R1):**
- **Optional**: may deliver Pack #1 counts in Stage 1.
- If chosen, Stage-1 counts are forced to exactly `1 MICU + 2 RCCM`; otherwise Stage-1 MICU/RCCM counts are both 0.

**Stage 2 (R2):**
- **If Pack #1 is NOT done historically**:
  - By end of Stage 2, totals through Stage 2 are forced to `1 MICU + 2 RCCM`.
- **If Pack #1 is done historically**:
  - Stage 2 may **optionally** deliver Pack #2 counts (`2 MICU + 1 RCCM`) entirely within Stage 2.

**Stage 3 (R3):**
- **Mandatory**: Always enforce exact counts—must deliver exactly the remaining MICU/RCCM blocks needed to reach 3M + 3R total.
  - `micu_stage3 == micu_needed_s3` and `rccm_stage3 == rccm_needed_s3` are enforced as hard constraints whenever a resident is in Stage 3.
  - This applies **regardless of whether the resident finishes Stage 3 in the current year**, ensuring residents never exceed their required 3M+3R total.

**Skip Condition:**
- If a resident already has 3 MICU + 3 RCCM historically, they are **forbidden** from any further MICU/RCCM assignments.


#### HC14 — Balancing within halves and balancing deviation per posting 
- Within blocks 1-6 and within blocks 7-12, the user can optionally input how much imbalance is allowed between the maximum and minimum number of residents assigned across 6 blocks. 
  - 0 <= (max - min) <= deviation
- Else, by default (no input on the balancing deviation), the imbalance is 0. 
  - Resident counts per block are equal within blocks 1–6 and within blocks 7–12 (leave-reserved slots are treated as occupied).
- `balancing_deviations`
- Some postings always have 0 balancing deviation, hence are excluded from the list of postings in the dropdown. 

#### HC15 - Shared quota for `GRM (TTSH)` and `MedComm (TTSH)
- Across each month block, the **total** number of residents assigned to both `GRM (TTSH)` and `MedComm (TTSH)` is equal.
- This shared quota is decided by the solver. 

#### HC16 - Only assign electives in a resident's elective preferences 
- For electives, only assign postings among the resident's elective preferences. 
- For each resident and each block: If a posting is elective and the posting is **not** in the resident’s elective preference list, then that posting must never be assigned to the resident.

#### HC17 - Stage 3 elective maximum cap (max 5 total)
- If a resident finishes Stage 3 in the current planning year (`stage3_finishes == True`), then total electives by end of year are capped at 5.
- The cap is enforced as: `historical_electives + current_year_elective_selections <= 5`.
- If historical electives already exceed 5, no new electives are assignable in the current year.

#### HC18 - R3 GM-excess replacement policy (hard) + end-of-R3 repair
- For residents with Stage-3 presence in the planning year (either `stage3_finishes == True` or Stage-3 blocks present), full end-of-R3 core completion is **not** enforced as a direct hard feasibility equation in the CP-SAT model.
- Instead, the solver enforces a hard anti-excess rule for GM:
  - Let `gm_excess_assignable = max(0, current_year_gm_assigned - max(0, 6 - historical_gm_done))`.
  - If there are unmet **non-GM** core deficits by end of year, `gm_excess_assignable` must be `0`.
  - If non-GM cores are complete but replacement with electives is still possible (resident has preference-eligible uncompleted elective base and there is room under the stage-3 elective cap), `gm_excess_assignable` must also be `0`.
- Interpretation: for R3 finishers, the solver must not keep replaceable GM above the base GM requirement when it can be replaced by unmet non-GM cores, or (after cores complete) by eligible electives.

#### End-of-R3 post-solve repair (best effort)
- After a feasible solve, the allocator runs a repair pass for R3 finishers:
  - Replace elective runs with core runs (duration-matched) where deficits exist and capacity/rules allow.
  - Recompute deficits, then compute excess GM (`historical + assigned - 6`).
  - Replace excess GM segments with unmet non-GM cores first (duration-matched).
  - If all cores are complete and excess GM remains, replace excess GM segments with resident-preference, non-repeated elective bases (subject to elective cap and duration/capacity rules).
- This repair is conservative and local (capacity/rule-aware), so it may leave residual excess if no valid swap exists.

### Save-time Validation Alignment

- Manual timetable edits validated through `validate_assignment` still enforce end-of-R3 core completion checks.
- When the edited schedule reaches/passes end of R3 (`career_blocks_completed + non_leave_assigned_blocks >= 36`), save is rejected if any core requirement remains short.
- Note: this save-time validation is stricter than the solver's HC18 hard equations (which now focus on GM-excess replaceability plus post-solve repair).

## Soft Constraints

Refer to `# DEFINE SOFT CONSTRAINTS WITH PENALTIES` section of the code in [`server/services/posting_allocator.py`](./server/services/posting_allocator.py).

#### SC1 - Elective requirements

- Stage 2
  - Must have ≥1 elective completed to date (history + current year).
  - If elective prefs exist, a second elective (history + current year) earns a bonus (`s2_elective_bonus_terms`).
  - Shortfall uses the same `elective_shortfall_penalty` weight (s2 elective shortfall).
- Stage 3
  - Hard cap from HC17: cannot exceed five total electives by end of Stage 3.
  - Still encourages hitting exactly five total electives when possible.
  - A slack var (`*_elective_req_unmet`) incurs `elective_shortfall_penalty` when short (s3 elective shortfall).

#### SC2 - Core requirements (stage 3)

- For each unmet core base, enforce equality to the requirement unless a slack var (`{base}_req_unmet`) is paid, incurring `core_shortfall_penalty`.

#### SC3 - CCR timing bonus

- Bonus for completing CCR during stage 2 and nowhere else (when not yet done). Related to HC4.
- `ccr_stage2_bonus_terms`

#### SC4 - SR preference constraints and bonuses

- SR prefs are normalised to bases with available variants (deduped). Bases with any completed blocks by the resident are removed. If the planning year includes career blocks 28–30, elective SR bases must also appear in elective preferences or they are removed.
- Exactly one SR base is chosen per resident; a "none" option is allowed but strongly penalised to keep it as a fallback.
- Chosen SR does not require assignment. If chosen, postings of that base are forbidden outside career blocks 19–30 (except GM, which requires at least three blocks in 19–30).
- Rank-weighted SR preference bonus (uses the `preference` weight), plus an extra bonus for placing the chosen SR in blocks 19–24.
- Elective postings whose base is chosen as SR do not receive elective preference bonuses to avoid double-counting.

#### Bonuses and penalties (objective terms)

- Preference bonus: rank-weighted (via `preference` weight) for elective preferences when the posting is selected and not chosen as SR.
- SR bonuses: rank-weighted SR choice bonus (via `preference` weight), 19–24 window bonus, and a strong fixed bonus for having a chosen SR (`sr_choice_bonus_terms`).
- Seniority bonus: per-block bonus scaled by stage value and the `seniority` weight.
- Core prioritisation bonus: fixed bonus for selecting any core posting.
- ED/GRM/GM bonuses: pair bonus for ED+GRM, three-GM bonus when exactly three GM blocks exist with ED+GRM, and a half-year bundle bonus when ED/GRM/GM stay within one half-year.
- GM (KTPH) bonus: bonus for `GM (KTPH)` blocks in stage 1 (related to HC11).
- MICU/RCCM pack shortfall penalty: uses the `core_shortfall_penalty` weight when pack #1 is not completed during stage 2 and stage 2 does not finish in the current AY.
- OFF penalty: strong penalty (`OFF` not on leave) to discourage unused blocks.

#### Objective

- Maximise the sum of bonuses minus penalties above (weights primarily driven by `weightages` plus a few fixed constants noted inline).
