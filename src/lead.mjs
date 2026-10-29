// Early-access lead handling. HubSpot portal and form IDs are public identifiers (they appear in any
// HubSpot embed), not secrets, so they can live in VITE_ variables. Leave them unset to keep the
// form in email-draft mode. Field names match docs/crm-plan.md.

export function hubspotConfig(env = import.meta.env || {}) {
  const portalId = env.VITE_HUBSPOT_PORTAL_ID, formGuid = env.VITE_HUBSPOT_FORM_GUID;
  if (!portalId || !formGuid) return null;
  return { portalId, formGuid, marketingSubscriptionTypeId: env.VITE_HUBSPOT_MARKETING_SUBSCRIPTION_ID || '' };
}

export function validateLead(lead) {
  if (!lead.name.trim() || !lead.company.trim() || !lead.companyType) return 'Please complete your name, company and company type.';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email.trim())) return 'Please enter a valid work email.';
  if (!lead.message.trim()) return 'Please tell us briefly what your team reviews.';
  if (!lead.consent) return 'Please agree that we may use your details to reply.';
  return '';
}

/** HubSpot Forms API v3 payload. */
export function leadPayload(lead, context, config = {}) {
  const [first, ...rest] = lead.name.trim().split(/\s+/);
  const fields = [
    ['firstname', first], ['lastname', rest.join(' ')], ['email', lead.email.trim()], ['company', lead.company.trim()],
    ['jobtitle', lead.role.trim()], ['company_type', lead.companyType], ['monthly_artwork_volume', lead.volume], ['review_message', lead.message.trim()],
  ].filter(([, v]) => v).map(([name, value]) => ({ objectTypeId: '0-1', name, value }));
  return {
    fields,
    context,
    legalConsentOptions: {
      consent: {
        consentToProcess: true,
        text: 'I agree that Proofloom may use these details to reply to this request.',
        communications: lead.marketing && config.marketingSubscriptionTypeId
          ? [{ value: true, subscriptionTypeId: Number(config.marketingSubscriptionTypeId), text: 'Send me occasional product updates.' }]
          : [],
      },
    },
  };
}
