begin;
select plan(12);

select is(has_table_privilege('authenticated','private.friendship_conversations','SELECT'), false, 'raw friendship conversations stay private');
select is(has_table_privilege('authenticated','private.friendship_messages','SELECT'), false, 'raw friendship messages stay private');
select is(has_function_privilege('authenticated','public.open_my_friendship_conversation(uuid)','EXECUTE'), true, 'members can open guarded friendship conversations');

insert into auth.users (id, instance_id, aud, role, created_at, updated_at) values
('66666666-6666-4666-8666-666666666661','00000000-0000-0000-0000-000000000000','authenticated','authenticated',now(),now()),
('66666666-6666-4666-8666-666666666662','00000000-0000-0000-0000-000000000000','authenticated','authenticated',now(),now())
on conflict (id) do nothing;
insert into public.users (id) values
('66666666-6666-4666-8666-666666666661'),
('66666666-6666-4666-8666-666666666662')
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub','66666666-6666-4666-8666-666666666661',true);
select public.join_my_connection_space('friendship'::public.connection_space);
select * from public.save_my_friendship_profile('Amina','I enjoy books, coffee, walks, and meeting thoughtful people through shared interests.','Tripoli',array['Books','Coffee','Walking']);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','66666666-6666-4666-8666-666666666662',true);
select public.join_my_connection_space('friendship'::public.connection_space);
select * from public.save_my_friendship_profile('Sara','I enjoy coffee, reading, local events, and relaxed conversations with new friends.','Tripoli',array['Coffee','Books','Events']);
reset role;

insert into private.friendship_connections (user_a_id,user_b_id,source_request_id)
select least('66666666-6666-4666-8666-666666666661'::uuid,'66666666-6666-4666-8666-666666666662'::uuid),
       greatest('66666666-6666-4666-8666-666666666661'::uuid,'66666666-6666-4666-8666-666666666662'::uuid),
       null;

create temporary table fc(id uuid) on commit drop;
insert into fc select id from private.friendship_connections
where user_a_id='66666666-6666-4666-8666-666666666661' or user_b_id='66666666-6666-4666-8666-666666666661'
limit 1;

set local role authenticated;
select set_config('request.jwt.claim.sub','66666666-6666-4666-8666-666666666661',true);
select isnt(public.open_my_friendship_conversation((select id from fc)), null::uuid, 'accepted Friends connection can open a Friends conversation');
select isnt(public.send_friendship_message((select id from fc),'Hello from Friends','nonce-12345678'), null::uuid, 'member can send a Friends-only message');
select is((select count(*)::integer from public.list_my_friendship_messages((select id from fc),null,null,50)),1,'sender can read Friends message');
select is((select sender_is_me from public.list_my_friendship_messages((select id from fc),null,null,50) limit 1),true,'sender sees own message as mine');
select throws_ok($$select public.send_friendship_message((select id from fc),'Different body','nonce-12345678')$$,'P0001','idempotency conflict','same nonce cannot mutate message body');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','66666666-6666-4666-8666-666666666662',true);
select is((select count(*)::integer from public.list_my_friendship_messages((select id from fc),null,null,50)),1,'other friend can read the same Friends conversation');
select is((select sender_is_me from public.list_my_friendship_messages((select id from fc),null,null,50) limit 1),false,'recipient sees sender bubble as theirs');
select is(public.mark_my_friendship_conversation_read((select id from fc),clock_timestamp()),true,'recipient can mark Friends conversation read');
select public.block_member('66666666-6666-4666-8666-666666666661');
select throws_ok($$select public.list_my_friendship_messages((select id from fc),null,null,50)$$,'P0001','friendship conversation unavailable','blocking closes Friends conversation access immediately');
reset role;

select * from finish();
rollback;