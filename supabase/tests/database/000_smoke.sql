begin;

select plan(3);
select has_schema('public', 'public schema is available');
select has_schema('auth', 'Supabase Auth schema is available');
select has_table('auth', 'users', 'Supabase Auth users table is available');
select * from finish();

rollback;
