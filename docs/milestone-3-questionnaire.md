# Milestone 3 — Verified Waitlist Questionnaire Contract

Milestone 3 turns the public waitlist preview into a real, phone-verified
serious-marriage waitlist. It does not introduce profiles, matching,
introductions, photos, messaging, identity documents, payments, or admin
analytics.

## User journey

1. Eligibility and intent gate
2. Phone number entry
3. SMS OTP verification
4. About you
5. What you are looking for
6. Privacy and trust preferences
7. Versioned consent
8. Success and private referral link
9. Returning-user waitlist status, permitted edits, consent withdrawal, and
   deletion request

Progress after phone verification must be resumable.

## Question set

### Eligibility gate

| Field                     | Required | Arabic                          | English                                              | Values  |
| ------------------------- | -------- | ------------------------------- | ---------------------------------------------------- | ------- |
| `age_18_plus`             | yes      | أؤكد أن عمري 18 سنة أو أكثر     | I confirm that I am 18 or older                      | boolean |
| `serious_marriage_intent` | yes      | أنضم إلى ميثاق بنية جادة للزواج | I am joining Mithaq with serious intent for marriage | boolean |

Both must be true before requesting an OTP. The UI must state that Stage A is a
waitlist and that phone verification is not identity verification.

### Step 1 — About you / عنك

| Field                     | Required | Arabic label                        | English label                                  | Values                                               |
| ------------------------- | -------- | ----------------------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| `gender`                  | yes      | أنا                                 | I am                                           | woman, man                                           |
| `age_band`                | yes      | الفئة العمرية                       | Age range                                      | 18–24, 25–29, 30–34, 35–39, 40–44, 45–49, 50–54, 55+ |
| `residency_type`          | yes      | مكان الإقامة                        | Where do you live?                             | libya, diaspora                                      |
| `current_country_code`    | yes      | الدولة الحالية                      | Current country                                | ISO country                                          |
| `current_city`            | yes      | المدينة الحالية                     | Current city                                   | normalized short text                                |
| `libyan_origin_region`    | no       | المنطقة الليبية التي تنتمي إليها    | Libyan region of origin                        | configured reference value                           |
| `marital_status`          | yes      | الحالة الاجتماعية                   | Marital status                                 | never_married, divorced, widowed                     |
| `has_children`            | yes      | هل لديك أطفال؟                      | Do you have children?                          | boolean                                              |
| `libyan_self_attestation` | yes      | أؤكد أنني ليبي/ليبية أو من أصل ليبي | I confirm that I am Libyan or of Libyan origin | boolean                                              |

Do not collect an exact birth date, exact address, family/tribe name, salary,
political views, government ID, photograph, or biography in Stage A.

### Step 2 — What you are looking for / ما الذي تبحث عنه

| Field                           | Required | Arabic label                     | English label                                 | Values                                                |
| ------------------------------- | -------- | -------------------------------- | --------------------------------------------- | ----------------------------------------------------- |
| `marriage_timeline`             | yes      | متى تأمل أن تكون مستعداً للزواج؟ | When do you hope to be ready for marriage?    | within_6_months, 6_to_12_months, 1_to_2_years, unsure |
| `preferred_partner_age_min`     | yes      | أقل عمر مناسب                    | Minimum preferred age                         | validated integer >= 18                               |
| `preferred_partner_age_max`     | yes      | أعلى عمر مناسب                   | Maximum preferred age                         | validated integer; >= minimum                         |
| `accepted_marital_statuses`     | yes      | الحالات الاجتماعية المقبولة      | Marital statuses you would consider           | one or more configured statuses                       |
| `accepts_partner_with_children` | yes      | هل تقبل شريكاً لديه أطفال؟       | Would you consider a spouse who has children? | yes, no, depends                                      |
| `open_to_libya`                 | yes      | منفتح على شخص مقيم في ليبيا      | Open to someone living in Libya               | boolean                                               |
| `open_to_diaspora`              | yes      | منفتح على شخص مقيم خارج ليبيا    | Open to someone in the diaspora               | boolean                                               |
| `relocation_willingness`        | yes      | الاستعداد للانتقال               | Willingness to relocate                       | yes, no, depends                                      |
| `preferred_countries`           | no       | دول مفضلة إن وجدت                | Preferred countries, if any                   | zero or more ISO countries                            |

At least one of `open_to_libya` or `open_to_diaspora` must be true.

### Step 3 — Privacy and trust / الخصوصية والثقة

| Field                           | Required | Arabic label                                                 | English label                                                                   | Values                                                                            |
| ------------------------------- | -------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `willing_identity_verification` | yes      | هل أنت مستعد للتحقق من الهوية قبل المشاركة في التعارف الخاص؟ | Are you willing to complete identity verification before private introductions? | boolean                                                                           |
| `photo_privacy_preference`      | yes      | متى تفضل مشاركة صورتك مستقبلاً؟                              | When would you prefer to share a photo in the future?                           | none, blurred, after_mutual_interest, explicit_approval, after_family_involvement |
| `family_involvement_preference` | yes      | متى تفضل إشراك الأسرة؟                                       | When would you prefer family involvement?                                       | early, after_initial_interest, later, unsure                                      |

The UI must never turn `willing_identity_verification=true` into an
identity-verified badge. Stage A only establishes phone verification.

## Consent events

Consent is append-only. Never overwrite an old consent event to represent
withdrawal.

Required before submission:

- `age_18_plus`
- `terms`
- `privacy`
- `waitlist_processing`

Optional:

- `communications`

Each event records document version, document SHA-256, locale shown, event type,
timestamp, request correlation ID, and optional retention-controlled security
hashes.

If communications consent is later withdrawn, Mithaq appends a `withdrawn` event
that references the consent event it supersedes. The original grant remains
immutable.

## Referral attribution

Referral attribution is privacy-safe and first-party only.

- Opening a valid referral link creates an opaque random session identifier.
- The opaque identifier is kept in an HttpOnly, SameSite=Lax cookie for at most
  30 days.
- Referral events may record `opened`, `started`, `phone_verified`, and
  `submitted` milestones.
- The authenticated user ID is attached internally only after authentication is
  established.
- Referrers can see only an aggregate completed-registration count plus their
  own referral code.
- Referrers must never receive the identity, phone number, questionnaire
  answers, or application record of anyone they referred.

## Success state

Show:

- phone verified;
- questionnaire complete;
- waitlist registration complete;
- identity verification not yet available;
- no guarantee of an introduction;
- a private referral link/code.

Do not expose a public queue position.

## Returning-user permissions

A waitlist user may read and edit only their own permitted waitlist fields, read
their own consent history, see their own referral code and aggregate referral
conversion count, withdraw optional communications consent, and request
deletion.

Editing a submitted questionnaire must preserve the submitted waitlist state and
must not silently create duplicate policy-consent events.

They must never be able to enumerate another user's application, preferences,
phone information, consent history, referral identity, or deletion request.

## Deletion

A user may request either waitlist-data deletion or entire-account deletion. The
request receives a visible lifecycle status. Internal processing notes remain
private.

## Validation principles

- Zod validates all application trust boundaries.
- Postgres constraints validate durable invariants.
- RLS is enabled on every exposed user-owned table.
- Database tests prove user A cannot read or mutate user B's data.
- Phone OTP endpoints are rate limited and do not reveal whether a number
  already has an account.
- OTP values are never stored in application tables or logs.
- Full phone numbers remain in Supabase Auth and are not duplicated into public
  application tables.
