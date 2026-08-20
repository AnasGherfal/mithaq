# M12 — Discovery and matching product loop

Mithaq needs a reason to open before a curated introduction arrives. The answer is not an endless swipe deck and not a public member directory. M12 adds a controlled discovery layer that makes the community feel alive while preserving marriage intent, privacy, and safety.

## Product problem

A purely passive matchmaking flow is high-intent but low-frequency: complete a profile, wait, receive an introduction. That can feel empty between introductions and gives a new member little sense that a real community exists.

At the other extreme, unlimited swiping creates entertainment and novelty but encourages low-intent browsing, appearance-first judgments, validation loops, and ambiguous motives.

Mithaq should combine the useful parts of discovery with the trust of controlled introductions.

## Product model

The member app has two distinct layers:

1. **Discover** — a lightweight, limited way to explore the community and express curiosity.
2. **Introductions** — the serious, private path where compatibility, eligibility, mutual preferences, and safety gates control who can actually connect.

Discover never opens a direct message and never bypasses matching rules.

## Discover experience

Discover is intentionally finite rather than infinite.

A member can see a small daily set of profile glimpses selected from eligible people who are broadly relevant to their preferences. A glimpse is designed around personality and context, not a full-screen attractiveness vote.

A glimpse may contain only disclosure-safe fields such as:

- approved primary portrait according to the owner's current discovery-photo policy;
- first name or approved display name;
- age band rather than exact birth date;
- city/region when disclosed;
- a short profile prompt or about-me excerpt;
- a few non-sensitive interests or lifestyle signals when those fields exist;
- a small number of factual common-ground reasons backed by stored data.

Discover does not expose phone numbers, social handles, exact addresses, private questionnaire answers, moderation state, or hidden profile fields.

## Actions

There is no left/right rejection mechanic.

The primary actions are:

- **Interested / لفت انتباهي** — a private signal that this person is worth considering.
- **Next / التالي** — move on without creating a negative event against the other member.
- **Save for later / لاحقاً** — optional if product testing shows value.

An interest signal is not a match and is never revealed directly to the other member.

The matching service can use a private interest signal as one ranking input only after hard eligibility, mutual preferences, blocks, safety, and cooldowns pass. Money can never override those gates.

## What happens after interest

`Discover interest -> eligibility + mutual preference checks -> compatibility ranking -> controlled introduction candidate -> introduction offered -> both decide privately -> mutual acceptance -> conversation`

This preserves the existing introduction state machine while giving members agency and a reason to explore.

## Community layer

Discover can later include non-profile surfaces that create low-pressure reasons to return without turning Mithaq into social media:

- weekly prompts about relationships, family, life goals, and culture;
- aggregate community answers with minimum cohort thresholds;
- interest collections such as books, travel, food, fitness, volunteering, and career;
- curated local/community events after moderation and operations exist;
- profile prompts that help members express personality beyond demographic fields.

No public comments, follower counts, popularity scores, public likes, or open DMs are part of v1.

## Friendship

Friendship is a separate connection intent, not a hidden interpretation of marriage profiles. If implemented, Friendship Mode must have separate visibility, matching, copy, and expectations so a member seeking marriage is not unknowingly shown to someone seeking only friends.

Friendship does not need to ship in the first beta. The architecture should avoid making it impossible later.

## Retention loop

The desired loop is:

`Open Mithaq -> see something new -> discover a person or prompt -> express private curiosity -> receive a meaningful introduction when rules align -> decide -> converse`

The product should not optimize for minutes spent swiping. It should optimize for healthy return frequency, completed profiles, meaningful interest signals, introduction acceptance, mutual acceptance, safe conversations, and eventual off-app outcomes.

## Premium boundary

Mithaq+ may improve discovery through advanced preference controls, more context, deeper compatibility explanations, or a modestly larger finite discovery set. It must not sell unlimited access to people, reveal who privately expressed interest, or bypass another member's preferences.

## Design direction

The visual language should feel warm, social, editorial, and premium rather than institutional:

- people and personality before status dashboards;
- photography and expressive prompts before security copy;
- warm ivory and human accent tones as the base;
- navy reserved for brand/structure rather than filling large surfaces;
- teal for actions and positive progress;
- rose/coral for human connection moments;
- champagne as a restrained premium accent;
- softer cards, more breathing room, fewer boxed settings surfaces on primary tabs;
- subtle motion only where it explains state; bottom-tab switches remain instant.

## M12 exit

M12 exits when a staging member can explore a finite, privacy-safe discovery set, privately express interest, and have that signal feed the existing controlled matching pipeline without exposing the signal or weakening eligibility, safety, mutual preference, or introduction rules. The same staging environment must still demonstrate the complete curated-introduction path for members who do not use Discover.
