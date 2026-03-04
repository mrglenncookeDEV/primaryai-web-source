alter table user_profile_settings
  add column if not exists eal_percent integer,
  add column if not exists pupil_premium_percent integer,
  add column if not exists above_standard_percent integer,
  add column if not exists below_standard_percent integer,
  add column if not exists hugely_above_standard_percent integer,
  add column if not exists hugely_below_standard_percent integer;

alter table user_profile_settings
  drop constraint if exists user_profile_settings_eal_percent_check,
  add constraint user_profile_settings_eal_percent_check
    check (eal_percent is null or (eal_percent >= 0 and eal_percent <= 100));

alter table user_profile_settings
  drop constraint if exists user_profile_settings_pupil_premium_percent_check,
  add constraint user_profile_settings_pupil_premium_percent_check
    check (pupil_premium_percent is null or (pupil_premium_percent >= 0 and pupil_premium_percent <= 100));

alter table user_profile_settings
  drop constraint if exists user_profile_settings_above_standard_percent_check,
  add constraint user_profile_settings_above_standard_percent_check
    check (above_standard_percent is null or (above_standard_percent >= 0 and above_standard_percent <= 100));

alter table user_profile_settings
  drop constraint if exists user_profile_settings_below_standard_percent_check,
  add constraint user_profile_settings_below_standard_percent_check
    check (below_standard_percent is null or (below_standard_percent >= 0 and below_standard_percent <= 100));

alter table user_profile_settings
  drop constraint if exists user_profile_settings_hugely_above_standard_percent_check,
  add constraint user_profile_settings_hugely_above_standard_percent_check
    check (hugely_above_standard_percent is null or (hugely_above_standard_percent >= 0 and hugely_above_standard_percent <= 100));

alter table user_profile_settings
  drop constraint if exists user_profile_settings_hugely_below_standard_percent_check,
  add constraint user_profile_settings_hugely_below_standard_percent_check
    check (hugely_below_standard_percent is null or (hugely_below_standard_percent >= 0 and hugely_below_standard_percent <= 100));
