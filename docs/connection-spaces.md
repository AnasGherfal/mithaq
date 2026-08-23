# Mithaq connection spaces

Mithaq supports two explicit connection spaces under one authenticated account:

- **Marriage** — a life-partner journey using private preferences, controlled
  introductions, independent decisions, and mutual conversation.
- **Friends** — a community and friendship journey using a separate profile,
  interests, finite discovery, private friend requests, and separate chats.

A member may use one space or both. Joining one space never silently enrolls the
member in the other.

## Non-mixing contract

The following data and actions are space-scoped and must not cross
automatically:

1. Profile biography and prompts.
2. Discovery eligibility and ranking inputs.
3. Interest, like, or connection-request signals.
4. Activity and notification events.
5. Conversations and unread state.
6. Visibility and disclosure settings.
7. Paid capacity or feature entitlements that are space-specific.

Marriage preferences are never used as friendship preferences. A friendship-only
member cannot appear in a marriage introduction. Friendship interest is never
interpreted as romantic interest.

## Shared account controls

A narrow set of controls remains account-wide because splitting them would
weaken safety or create confusing duplicate identity state:

- phone authentication and secure session;
- account language and device security;
- blocking and severe safety enforcement;
- account suspension and deletion;
- verified identity state, if identity verification is implemented later.

Account-wide blocking prevents the blocked pair from interacting in either
space. Space-specific reports and conversations still retain their own context.

## Profiles and photos

Marriage and Friends have separate profile records. The client must not prefill
a friendship profile from a marriage profile without a clear member action.

Approved marriage photos are not automatically visible in Friends. A later photo
reuse flow may allow the member to select an already approved photo explicitly,
but the chosen disclosure must be recorded for the friendship space. Public
photo URLs remain forbidden.

## Navigation

After phone verification, a new member chooses a space before completing
space-specific onboarding. Returning members reopen their last current space.
The space selector remains available from Account.

Marriage keeps its own primary destinations. Friends will receive its own Home,
Discover, Activity/Chats, and Account presentation when those backend contracts
exist. Marriage activity or conversations must not be reused as placeholders in
Friends.

## Friends product rules

Friends is not an unmoderated open-chat directory. The intended flow is:

```text
Friendship profile
→ finite interest-based discovery
→ private friend request
→ mutual connection
→ friendship-only conversation
```

The initial Friends profile uses a preferred name, city, friendship
introduction, and two to eight interest keys. Friendship discovery and
cross-member profile views remain closed until separate review, ranking,
disclosure, request, and conversation contracts are implemented and tested.

## Current implementation slice

The SDK 54 preview branch now includes:

- explicit connection-space membership records;
- an independently persisted current space;
- self-only friendship profiles;
- a bilingual space selector;
- a separate Friends home and friendship-profile flow;
- OTP routing into the selector for new accounts;
- returning-session routing into the last current space;
- Account access to switch spaces;
- development preview fallbacks while hosted staging is one migration behind.

This foundation does not yet expose real friendship discovery or friendship
messages. Those remain fail-closed until M12 implements their independent server
contracts.
