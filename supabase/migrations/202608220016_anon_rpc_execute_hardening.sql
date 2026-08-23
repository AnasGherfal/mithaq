revoke execute on function public.finalize_waitlist(text, boolean) from anon;
revoke execute on function public.get_my_referral_conversion_count() from anon;
revoke execute on function public.request_account_deletion(text) from anon;
revoke execute on function public.set_communications_consent(boolean, text) from anon;
revoke execute on function public.withdraw_communications_consent(text) from anon;

grant execute on function public.finalize_waitlist(text, boolean) to authenticated, service_role;
grant execute on function public.get_my_referral_conversion_count() to authenticated, service_role;
grant execute on function public.request_account_deletion(text) to authenticated, service_role;
grant execute on function public.set_communications_consent(boolean, text) to authenticated, service_role;
grant execute on function public.withdraw_communications_consent(text) to authenticated, service_role;
