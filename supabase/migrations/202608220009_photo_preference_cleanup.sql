update public.waitlist_preferences
set photo_privacy_preference = 'after_mutual_interest',
    updated_at = clock_timestamp()
where photo_privacy_preference = 'discovery_visible';

update public.waitlist_preferences
set photo_privacy_preference = 'explicit_approval',
    updated_at = clock_timestamp()
where photo_privacy_preference = 'blurred';
