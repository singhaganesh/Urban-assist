-- 0011: data-sanity constraints for provider availability.
-- Fresh constraint names — plain add is safe on any existing environment.

alter table availability_slots
  add constraint availability_start_before_end check (start_time < end_time);

alter table time_off
  add constraint time_off_valid_range check (start_date <= end_date);
