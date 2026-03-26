# Changelog

All notable changes to this project are documented in this file. Version numbers follow semantic versioning and dates use `YYYY-MM-DD`.

## [3.0] - 2026-03-26
### Added
- Added HC17 to cap elective postings at a maximum of 5 blocks by the end of R3
- Added HC18 to ensure all required core postings are completed by the end of R3
- Added backend validation support for HC18 to verify core completion constraints before save/export
- Added timetable preprocessing metadata to preserve duplicate-month/duplicate-posting display cases

### Changed
- Strengthened R3 completion allocation logic to prioritize unmet core postings
- Updated replacement logic so excess GM and electives can be swapped into required core postings where needed
- Restricted SR posting assignments to allowed late-year windows (blocks 19-30)
- Updated resident timetable rendering to correctly handle mid-year timetable starts
- Refined frontend timetable display logic for duplicate block/month scenarios for better schedule accuracy

### Fixed
- Fixed backend save endpoint issues caused by incorrect variable references that could prevent user data/session save
- Fixed timetable accuracy issues involving leave blocks (LOA) in preprocessing/postprocessing and display

## [2.0] - 2026-03-05
### Added
- Added filtering for PlanningOverviewTable to filter data within 6-month windows for better clarity

### Changed
- Removed client-side GM capacity filtering from dropdown menu
  - Users can now freely select all GM postings regardless of current capacity
  - Capacity validation moved entirely to backend HC5 constraint
  - Allows users to rearrange/swap GM postings between blocks more flexibly

### Fixed
- Fixed HC6 to prevent assigning the same elective base multiple times within the current year
  - Ensures residents cannot be assigned duplicate electives even with different institutions
- Fixed HC16 validation to ensure assigned electives must be in resident's elective preferences
  - Added validation payload to check preference list during save
- Fixed CCR assignment logic to ensure exactly 1 block of 1 type of CCR posting
  - Prevents multiple CCR types from being assigned in the same year
- Fixed duplicate CCR assignments and CCR completed status check
  - Now correctly prevents CCR assignment if already completed historically
- Fixed HC13 to enforce 3-month consecutive blocks for MICU/RCCM packs even if R3 is not fully completed in current academic year
  - Enforces contiguous 3-block windows for MICU+RCCM regardless of career completion
- Fixed SR preference display to use solver-chosen SR value instead of inferring from schedule
  - Frontend now correctly shows resident's assigned SR department from solver output
- **Backend HC5 validation**: Correctly count core postings
  - Changed counting logic from `posting_type == "core"` to checking if posting base is in `CORE_REQUIREMENTS`
  - Previously, GM/GRM/MICU/RCCM postings not marked as `posting_type="core"` were not being counted, allowing constraint violations
- **Backend HC5 validation**: Fixed bug where `is_leave` field sent as string `'False'` was treated as truthy
  - All blocks were being skipped in HC5 validation, bypassing capacity checks entirely
  - Added boolean normalization to handle both boolean and string representations of `is_leave`
  - Now correctly distinguishes between leave blocks (excluded) and working blocks (counted)
- Improved HC5 validation robustness with per-block leave detection logging

## [1.1] - 2026-01-23
### Added
- Added HC16 to only assign electives from a resident's elective preferences

### Changed
- Modified HC12 to check within 6 months blocks: If there are at least 2 blocks with any of these: `GM`, `GRM` or `MedComm`, then there should be `ED` or any CCR within the 6 months blocks.
- Modified HC5 to remove extended cap of `GRM`. Instead increased base cap of `GRM` to 3. 
- Updated interpretation of `max_residents` field of Postings CSV. If `max_resident=0`, then it means 0 capacity, not unlimited capacity.
- Allowed `mcr` to be read case-insensitive from Resident History CSV
- Added exception for HC8 for `GRM` when `GRM` is part of a valid run

### Fixed
- Fixed the bug where the leave blocks disappear after a user edits and saves timetable block(s)
- Removed HC13 and HC14 as the constraints are not part of user requirements 
- Modified logic of HC13 to skip HC13 once 3 `RCCM` and 3 `MICU` have been completed historically 
- Fixed HC3 to allow runs at the end of the blocks, and allow exception postings like `GM`, `GRM` which are part of valid runs

## [1.0.3] - 2026-01-09
### Changed
### Fixed
- Fixed status code 400 error when attempting to export final timetable CSV
    - Removed unused `optimisation_score` field from backend `/api/download-csv` api
    - https://github.com/NHG-AINE/residency-rotation-scheduler/pull/63

## [1.0.2] - 2026-01-08
### Changed
- Added strict validation functions for each CSV type to verify required columns are present, enforce data type constraints (e.g. integers, booleans), validate value ranges and allowed enums
    - Added row-specific error messages (e.g. Row X: invalid month_block) to make CSV issues easy to diagnose
    - Added a check to ensure that in `resident_history` CSV file, the `posting_code` (if any) should be found in `posting_code` from `postings` CSV file. It should not be a `leave_type` or random date.
    - https://github.com/NHG-AINE/residency-rotation-scheduler/pull/43
-  Removed user-input balancing deviation for `GRM (TTSH)`, `MedComm (TTSH)`. Added shared monthly quota for `GRM (TTSH)`, `MedComm (TTSH)` instead.
    - https://github.com/NHG-AINE/residency-rotation-scheduler/pull/53 

### Fixed
- Removed extra guard in HC5 which was not implemented 
    - https://github.com/NHG-AINE/residency-rotation-scheduler/pull/47
- Fixed the interpretation of `max_residents=0` to allow the solver to assign any number of residents to the posting, eg `MedComm (TTSH)` and `RCCM (KTPH)` 
    - https://github.com/NHG-AINE/residency-rotation-scheduler/pull/50
- Fixed infeasibility of actual dataset 
    - Added support for `GM`/`GRM` cap extension when `MedComm (TTSH)` is completed historically or assigned this year.
    - Fixed solver infeasibility by excluding `MICU`/`RCCM` from HC5 core caps and delegating their totals entirely to HC15.
    - https://github.com/NHG-AINE/residency-rotation-scheduler/pull/55

## [1.0.1] - 2026-01-01

### Added

- Support for shared balancing quotas for specified postings (e.g., GRM and MedComm at TTSH).
- SR preference mapping to ensure residents are allocated to their preferred SR supervisor.
- Multi-select dropdown for postings with balancing deviations.
- Button to set default deviations for ED, GRM, and GM postings.

### Changed

- Redesigned CSV ingestion workflow for improved validation and error handling.
- Removed the now-redundant Optimisation Scorecard from the UI.
- Updated documentation for constraints and developer onboarding.

### Fixed

- Resolved a bug in post-processing that affected timetable accuracy.
- Corrected logic to exclude residents on leave from the assigned block count.
- Addressed an issue with the end-of-year career-track constraint.

## [1.0.0] - 2025-12-16

### Added

- Residency Rotation Scheduler initial release with constraint-based timetable optimisation powered by Google OR-Tools CP-SAT.
- CSV ingestion and validation for residents, resident history, resident preferences, SR preferences, postings, and optional resident leaves, plus weightages, pinned assignments, and a solver time-limit override.
- FastAPI backend exposing `/api/solve`, `/api/save`, and `/api/download-csv`, with in-memory dataset caching to support iterative solves and current-year edits.
- React + Vite + Tailwind frontend for uploading CSVs, tuning weightages, pinning assignments, running the solver, reviewing timetables/cohort statistics, and exporting the final timetable; includes a sample CSV generator for quick smoke tests.
- Constraint documentation and developer handoff guidance covering the hard/soft rules (see `constraints.md` and `DEVELOPER_GUIDE.md`), plus notes for hosted deployments (stateless flows with optional PostgreSQL session persistence).

### Known issues

- No automated backend test suite yet; validate changes manually with representative CSVs.
- Local in-memory cache resets when the API process restarts; `/api/save` requires a prior solve/upload within the same process.
- Solver runtime scales with dataset size; use `max_time_in_minutes` when iterating or debugging feasibility.
