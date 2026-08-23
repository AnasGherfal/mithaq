begin;
select plan(12);

select is(has_function_privilege('anon', 'public.finalize_waitlist(text,boolean)', 'EXECUTE'), false, 'anon cannot finalize a member waitlist');
select is(has_function_privilege('anon', 'public.get_my_referral_conversion_count()', 'EXECUTE'), false, 'anon cannot read a member referral conversion count');
select is(has_function_privilege('anon', 'public.request_account_deletion(text)', 'EXECUTE'), false, 'anon cannot request a member account deletion');
select is(has_function_privilege('anon', 'public.set_communications_consent(boolean,text)', 'EXECUTE'), false, 'anon cannot mutate member communications consent');
select is(has_function_privilege('anon', 'public.withdraw_communications_consent(text)', 'EXECUTE'), false, 'anon cannot withdraw member communications consent');

select is(has_function_privilege('authenticated', 'public.finalize_waitlist(text,boolean)', 'EXECUTE'), true, 'authenticated member can finalize waitlist');
select is(has_function_privilege('authenticated', 'public.get_my_referral_conversion_count()', 'EXECUTE'), true, 'authenticated member can read own referral conversion count');
select is(has_function_privilege('authenticated', 'public.request_account_deletion(text)', 'EXECUTE'), true, 'authenticated member can request own account deletion');
select is(has_function_privilege('authenticated', 'public.set_communications_consent(boolean,text)', 'EXECUTE'), true, 'authenticated member can update own communications consent');
select is(has_function_privilege('authenticated', 'public.withdraw_communications_consent(text)', 'EXECUTE'), true, 'authenticated member can withdraw own communications consent');

select is(has_function_privilege('anon', 'public.record_referral_open(text,uuid)', 'EXECUTE'), true, 'anonymous referral-open attribution remains intentionally available');
select is(has_function_privilege('anon', 'public.record_referral_milestone(uuid,text)', 'EXECUTE'), true, 'anonymous pre-auth referral milestone attribution remains intentionally available');

select * from finish();
rollback;
