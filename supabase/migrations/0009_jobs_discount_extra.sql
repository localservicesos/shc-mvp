-- Per-job price adjustments: fixed-amount discount and extra charge.
--
-- The business needs to discount a job (e.g. a regular-customer deal) or add
-- an extra charge (e.g. extra-dirty vehicle) on top of the base price.
--
-- Scope (intentionally simple — see the job card):
--   * Fixed dollar amounts only. No percentages, coupons, or tax rules.
--   * The job total is derived as: price - discount + extra.
--   * `adjustment_note` records why the adjustment was applied.
--
-- All three columns are nullable with a 0 default for the numeric ones, so
-- existing jobs remain valid and behave as before (total == price).

alter table jobs
  add column if not exists discount        numeric(10, 2) not null default 0,
  add column if not exists extra           numeric(10, 2) not null default 0,
  add column if not exists adjustment_note text;

-- Discount and extra must be non-negative; direction is encoded by the column,
-- not the sign, so the total formula (price - discount + extra) stays simple.
alter table jobs
  add constraint jobs_discount_nonneg_chk check (discount >= 0),
  add constraint jobs_extra_nonneg_chk    check (extra >= 0);
