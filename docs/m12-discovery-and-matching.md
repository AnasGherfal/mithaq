# M12 — Discovery, Friends, and matching product loop

Mithaq needs reasons to open before a curated marriage introduction arrives. The
answer is not an endless swipe deck and not a public member directory. M12 adds
controlled discovery while supporting two explicit connection spaces:
**Marriage** and **Friends**.

The spaces share one secure account but do not share profile visibility,
interest signals, activity, or conversations. The complete non-mixing contract
is in `docs/connection-spaces.md`.

## Current implementation status

The first Friends product loop is now implemented in source:

- separate friendship profiles and explicit Marriage/Friends memberships;
- a top-level current-space switcher rather than hiding the product choice only
  inside Account;
- finite Friends discovery with a maximum server-controlled request limit;
- ranking by shared friendship interests, then same-city relevance, with a
  stable daily rotation instead of an infinite swipe feed;
- block-aware and account-state-aware discovery eligibility;
- private friend requests stored in the private schema;
- incoming and outgoing request views;
- explicit accept, decline, and withdraw actions;
- accepted friendship connections kept in the Friends request/connection
  context only;
- no direct raw-table access for authenticated clients;
- pgTAP coverage for discovery eligibility, block enforcement, private request
  storage, request direction, duplicate prevention, acceptance, and the rule
  that Marriage-only members cannot enter Friends discovery.

Hosted staging still needs these migrations before the iPhone preview can use
real Friends candidates and real friend requests. Source/test presence does not
mean the hosted database has already been upgraded or the pgTAP suite has been
executed successfully.

The next Friends slice after hosted validation is **Friends-only conversation
creation for accepted connections**, followed by Friends activity/unread state
and push notification context.

## Product problem

A purely passive matchmaking flow is high-intent but low-frequency: complete a
profile, wait, receive an introduction. That can feel empty between
introductions and gives a new member little sense that a real community exists.

At the other extreme, unlimited swiping creates entertainment and novelty but
encourages low-intent browsing, appearance-first judgments, validation loops,
and ambiguous motives.

Mithaq should combine the useful parts of discovery with clear intent and
controlled connection rules.

## Product model

The authenticated account can join one or both spaces:

1. **Marriage** — finite discovery can express private curiosity, but only the
   controlled-introduction state machine can open a marriage conversation.
2. **Friends** — finite interest- and activity-based discovery can lead to a
   private friend request and a friendship-only mutual connection.

A friendship signal is never treated as marriage interest. A friendship-only
profile is never listed in Marriage.

# Marriage space

## Marriage Discover experience

Marriage Discover is intentionally finite rather than infinite.

A member can see a small daily set of profile glimpses selected from eligible
people who are broadly relevant to their preferences. A glimpse is designed
around personality and context, not a full-screen attractiveness vote.

A glimpse may contain only disclosure-safe fields such as:

- approved primary portrait according to the owner's current discovery-photo
  policy;
- first name or approved display name;
- age band rather than exact birth date;
- city/region when disclosed;
- a short profile prompt or about-me excerpt;
- a few non-sensitive interests or lifestyle signals when those fields exist;
- a small number of factual common-ground reasons backed by stored data.

Marriage Discover does not expose phone numbers, social handles, exact
addresses, private questionnaire answers, moderation state, or hidden profile
fields.

## Marriage actions

There is no left/right rejection mechanic.

The primary actions are:

- **Interested / لفت انتباهي** — a private signal that this person is worth
  considering.
- **Next / التالي** — move on without creating a negative event against the
  other member.
- **Save for later / لاحقاً** — optional if product testing shows value.

An interest signal is not a match and is never revealed directly to the other
member.

The matching service can use a private interest signal as one ranking input only
after hard eligibility, mutual preferences, blocks, safety, and cooldowns pass.
Money can never override those gates.

## What happens after Marriage interest

```text
Discover interest
→ eligibility + mutual preference checks
→ compatibility ranking
→ controlled introduction candidate
→ introduction offered
→ both decide privately
→ mutual acceptance
→ marriage conversation
```

This preserves the existing introduction state machine while giving members
agency and a reason to explore.

# Friends space

## Friendship profile

Friends uses its own profile record. The initial profile contains:

- preferred friendship display name;
- city;
- a friendship-specific introduction;
- two to eight interest keys;
- future friendship prompts and activity preferences.

Marriage biography, preferences, and photos are not copied automatically. A
later photo reuse flow must require explicit selection and a Friends-specific
disclosure record.

## Friends Discover

Friends discovery is finite and based on friendship-specific signals such as
shared interests, city, activities, language, availability, and future community
preferences. It must have independent review, visibility, ranking, and exposure
controls.

The first implementation uses completed Friendship profiles, active Friendship
space membership, shared interests, city relevance, account availability, and
account-wide blocking. It intentionally does not query Marriage preferences or
Marriage profile fields.

The Friends profile should answer questions such as:

- What do you enjoy doing with new friends?
- What kind of social pace feels comfortable?
- Are you looking for local activities, online friendship, or both?
- Which interests or life stages would make conversation easier?

It must not display marriage readiness, marriage timeline, accepted marital
status, or romantic compatibility explanations.

## Friends actions

The intended actions are:

- **Connect / طلب صداقة** — a private friendship request.
- **Next / التالي** — move on without a negative event.
- **Maybe later / لاحقاً** — optional if testing supports it.

A friendship request is not a public like and does not open a direct message.
The other member receives a privacy-safe connection opportunity only through the
Friends request rules.

## What happens after a friend request

```text
Friends discovery
→ friendship eligibility + visibility checks
→ private friend request
→ mutual friendship connection
→ Friends-only conversation
```

The conversation, unread state, activity event, and notification deep link all
retain the Friends context. They never appear in Marriage navigation.

# Shared community layer

Both spaces can later include low-pressure reasons to return without turning
Mithaq into social media:

- space-specific weekly prompts;
- aggregate community answers with minimum cohort thresholds;
- interest collections such as books, travel, food, fitness, volunteering, and
  career;
- curated local/community events after moderation and operations exist;
- profile prompts that help members express personality beyond demographic
  fields.

Prompts must be labeled by space when their meaning differs. Marriage prompts
must not silently become Friends profile data, and vice versa.

No public comments, follower counts, popularity scores, public likes, or open
DMs are part of v1.

## Retention loops

Marriage:

```text
Open Mithaq
→ discover a person or prompt
→ express private curiosity
→ receive a meaningful introduction when rules align
→ decide
→ converse
```

Friends:

```text
Open Friends
→ discover an interest, person, or activity
→ send a private friendship request
→ connect mutually
→ converse or meet through a clear friendship context
```

The product should not optimize for minutes spent swiping. It should optimize
for healthy return frequency, completed profiles, meaningful private signals,
mutual connections, safe conversations, and useful off-app outcomes.

## Premium boundary

Mithaq+ may improve discovery through advanced controls, more context, deeper
compatibility explanations, or a modestly larger finite discovery set. It must
not sell unlimited access to people, reveal who privately expressed interest,
or bypass another member's preferences.

Premium capabilities are space-scoped. Buying a Friends capability cannot
increase Marriage exposure, and a Marriage benefit cannot reveal friendship
requests.

## Design direction

The visual language should feel warm, social, editorial, and premium rather than
institutional:

- people and personality before status dashboards;
- photography and expressive prompts before security copy;
- warm ivory and human accent tones as the base;
- navy reserved for brand/structure rather than filling large surfaces;
- teal for actions and positive progress;
- rose/coral for human connection moments;
- champagne as a restrained premium accent;
- softer cards, more breathing room, fewer boxed settings surfaces on primary
  tabs;
- subtle motion only where it explains state; bottom-tab switches remain
  instant.

Friends should feel lighter and more exploratory than Marriage without becoming
childish or visually implying romantic interest.

## M12 exit

M12 exits when a staging account can use one or both spaces with no cross-space
leakage.

Marriage must support a finite privacy-safe discovery set, private interest, and
the existing controlled matching/introduction pipeline. Friends must support a
separate friendship profile, finite discovery, private friend request, mutual
friendship connection, and Friends-only conversation. Both paths must preserve
safety, blocking, review, disclosure, Arabic/English parity, and physical-device
acceptance.
