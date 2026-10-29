# CRM plan (HubSpot)

Scope: **prospects and customers' staff contacts only.** No artwork, specifications, findings or review data ever enters the CRM.

## 1. Data model

| HubSpot object | Use | Custom properties |
|---|---|---|
| Contact | Packaging manager, QA lead, artwork coordinator, print buyer | `company_type`, `monthly_artwork_volume`, `review_message`, `lead_source`, `utm_*` |
| Company | Brand, printer, contract manufacturer, agency | `company_type`, `markets`, `artwork_tool` (e.g. a named artwork-management or PLM system), `data_region`, `proofloom_tenant_id` (after signup) |
| Deal | One per opportunity | `pilot_start`, `pilot_end`, `plan` (Pilot / Team / Enterprise), `dpa_status`, `sso_required` |
| Ticket | Onboarding and support | `onboarding_stage` |

## 2. Pipelines

- **Early access:** New request → Qualified (company type, volume, decision maker) → Walkthrough booked → Walkthrough held → Pilot proposed → Pilot running → Contract and DPA → Closed won or lost.
- **Onboarding (after a win):** Kick-off → DPA signed → SSO configured → First specifications loaded → Reviewer and studio training → First approved review → 30-day check-in → Steady state.

## 3. Workflows

1. **Form intake** (trigger: Early-access form submitted). Dedupe on email; associate or create a Company by email domain. Set lifecycle stage to *Lead* and create a Deal in *New request*. Assign an owner, create a task to *reply within one business day* (an internal target, not a public promise), and send an internal notification.
2. **Qualification.** Score on company type, artwork volume band and role. Record a disqualification reason whenever a lead is disqualified.
3. **Walkthrough follow-up.** After the meeting outcome is *Held*, send a recap with the prototype link (`/app`) and the safeguards summary, and create a *pilot proposal* task.
4. **Nurture (marketing consent only).** Send only to contacts who ticked the optional updates box. Honour unsubscribes, and use double opt-in where the region requires it.
5. **Onboarding.** On closed-won, create onboarding tickets and send a welcome sequence to the customer's admin contact.

## 4. Website touchpoint

`src/Contact.jsx` with `src/lead.mjs`:

- With `VITE_HUBSPOT_PORTAL_ID` and `VITE_HUBSPOT_FORM_GUID` set at build time, the form posts to the HubSpot Forms API v3 (`api.hsforms.com/submissions/v3/integration/submit/{portalId}/{formGuid}`). These IDs are public identifiers, not secrets.
- Fields sent (create matching form fields and custom properties in HubSpot first): `firstname`, `lastname`, `email`, `company`, `jobtitle`, `company_type`, `monthly_artwork_volume`, `review_message`.
- A required consent checkbox is sent as `legalConsentOptions.consent`. The optional marketing checkbox subscribes the contact only if `VITE_HUBSPOT_MARKETING_SUBSCRIPTION_ID` is set.
- A hidden honeypot field drops bot submissions silently. Client-side validation runs before sending. The message field asks people not to include confidential artwork or customer data.
- With the variables unset (the default), the form keeps its original behaviour: it opens an email draft to the founder's mailbox and offers a copy fallback. Nothing is submitted.
- Before switching HubSpot on: update the Privacy draft with the confirmed processor, region and retention; decide on cookie consent before adding any HubSpot tracking script (none is included); and test a real submission end to end.

## 5. Reporting

Track speed to first reply, walkthrough-to-pilot rate, pilot-to-paid rate, conversion by company type, and time from kick-off to the first approved review.

## 6. Governance

Use a private-app token with minimal scopes, held server-side only, for any future server-to-HubSpot sync. Delete or anonymise lost prospects after 24 months. Document the subject-request process. List HubSpot as a sub-processor for prospect data only.
