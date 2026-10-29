import React from 'react';
import { ArrowUpRight, ArrowRight, Check } from 'lucide-react';

// Marketing sections added alongside the original home page. Copy describes the prototype and the
// proposed product only: no customer numbers, testimonials, certifications or invented prices.

export function PrototypeCta() {
  return (
    <section className="prototype-cta" aria-labelledby="prototype-heading">
      <div className="wrap prototype-grid">
        <div>
          <p className="eyebrow">INTERACTIVE PROTOTYPE</p>
          <h2 id="prototype-heading">Run a whole review.<br /><em>Every role, end to end.</em></h2>
        </div>
        <div>
          <p>The demo above shows one review table. The prototype runs the full loop with fictional data: confirm a specification, run the checks, triage AI suggestions, send corrections to the artwork studio, upload a corrected version, watch the re-check verify it, then record a two-person print decision.</p>
          <ul className="prototype-roles">
            <li><strong>Reviewer</strong> Dashboard, side-by-side compare, findings, versions, print decision.</li>
            <li><strong>Artwork studio</strong> Correction requests only, and corrected-version upload.</li>
            <li><strong>Administrator</strong> Aggregate overview, roles, policy, retention preview, audit log.</li>
          </ul>
          <div className="actions">
            <a className="button" href="/app">Open the prototype <ArrowUpRight size={18} aria-hidden="true" /></a>
            <span className="muted small-note">No sign-up. Changes stay in your browser.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

const BENEFITS = [
  ['Catch the small things', 'Quantities are compared after unit conversion, so 0.45 L matches 450 ml and 500 ml does not. Product codes, GS1 barcode check digits, required wording and allergen lists are checked by exact rules.'],
  ['See the source of every finding', 'Each finding shows the approved value, the artwork value, the field it came from and why it was raised. Nothing depends on trusting a score.'],
  ['Send corrections, not email chains', 'The artwork studio sees exactly what to change and replies in context. It does not see the rest of the review.'],
  ['Know it was fixed', 'When a corrected version arrives, the same checks run again. A finding is marked fixed because the artwork changed, not because someone ticked a box.'],
  ['Make decisions you can defend', 'Print decisions are tied to one artwork version, can require two different reviewers, and are written to an audit log and an exportable report.'],
  ['Work to your own rules', 'Mark which fields are critical, require critical findings to be fixed rather than waived, and switch AI suggestions on or off for the whole workspace.'],
];

export function Benefits() {
  return (
    <section className="benefits wrap" id="benefits" aria-labelledby="benefits-heading">
      <div className="section-heading">
        <div><p className="eyebrow">WHY TEAMS WOULD USE IT</p><h2 id="benefits-heading">Less chasing.<br /><em>More certainty.</em></h2></div>
        <p>Designed for the packaging, quality and artwork people who give the final check.</p>
      </div>
      <div className="card-grid">
        {BENEFITS.map(([t, d], n) => <article className="grid-card" key={t}><span>0{n + 1}</span><h3>{t}</h3><p>{d}</p></article>)}
      </div>
    </section>
  );
}

const USES = [
  ['Reformulation and size changes', 'A new fill size or recipe updates the specification. Check that every pack component carries the new quantity, code and barcode.'],
  ['Supplier and co-packer artwork', 'Check incoming artwork from agencies, suppliers or customers against the approved specification before it moves toward print.'],
  ['Allergen and warning updates', 'Make sure a newly declared allergen or a revised safety statement appears on every affected label, with nothing dropped.'],
  ['Market and language variants', 'Review each market version against its own approved specification, with findings kept separate per variant.'],
  ['Promotional and seasonal packs', 'Short-run designs change fast. Confirm the regulated details survived the creative changes.'],
  ['Rebrands and range refreshes', 'When a whole range is redrawn, review many products against their specifications with a trail for each one.'],
];

export function UseCases() {
  return (
    <section className="usecases wrap" id="use-cases" aria-labelledby="uses-heading">
      <p className="eyebrow">USE CASES</p>
      <h2 id="uses-heading">Where differences<br /><em>tend to slip through.</em></h2>
      <div className="card-grid">
        {USES.map(([t, d]) => <article className="grid-card plain" key={t}><h3>{t}</h3><p>{d}</p></article>)}
      </div>
    </section>
  );
}

const SAFEGUARDS = [
  ['A person decides', 'Proofloom never approves artwork. Print decisions are recorded by people, for one exact version, and can require two different reviewers.'],
  ['AI is labelled and evidence-bound', 'AI suggestions are marked as such, must quote the source text they rely on, and need a reviewer to confirm or dismiss them. That gate cannot be switched off.'],
  ['Exact checks stay exact', 'Quantities, codes, barcodes, allergens and required wording are checked by deterministic rules, so switching AI off never hides an exact mismatch.'],
  ['No compliance claims', 'Proofloom assists review. It does not certify regulatory compliance or guarantee error-free packaging, and it says so in the product.'],
  ['Your files stay yours', 'Proposed design: encryption at rest and in transit, per-customer isolation, and no use of customer files to train AI models.'],
  ['Traceable and time-limited', 'Every action is written to an audit log. Administrators set retention windows for artwork, reports and logs.'],
];

export function Safeguards() {
  return (
    <section className="safeguards" id="safeguards" aria-labelledby="safeguards-heading">
      <div className="wrap">
        <div className="section-heading">
          <div><p className="eyebrow">SAFEGUARDS</p><h2 id="safeguards-heading">AI that assists.<br /><em>People who decide.</em></h2></div>
          <p>The prototype already enforces the review gates below. Security items describe the proposed production design.</p>
        </div>
        <div className="card-grid">
          {SAFEGUARDS.map(([t, d]) => <article className="grid-card" key={t}><Check size={18} aria-hidden="true" /><h3>{t}</h3><p>{d}</p></article>)}
        </div>
        <p className="workflow-note">Labelling and packaging rules vary by product category and market. Responsibility for meeting them stays with the brand owner and its reviewers.</p>
      </div>
    </section>
  );
}

const PLANS = [
  ['Pilot', 'For one team trying Proofloom on live projects.', ['Guided onboarding with your own specifications', 'Exact checks and evidence-linked findings', 'Studio correction loop and re-checks', 'Exportable review reports']],
  ['Team', 'For packaging, quality and artwork teams working together.', ['Everything in Pilot', 'Roles, two-person print approval and audit log', 'AI-assisted claim and wording review', 'Retention and AI policy controls']],
  ['Enterprise', 'For multi-site brands, printers and manufacturers.', ['Everything in Team', 'Single sign-on with your identity provider', 'Data-region options and a data-processing agreement', 'Integration with your artwork or PLM system']],
];

export function Plans() {
  return (
    <section className="plans wrap" id="pricing" aria-labelledby="pricing-heading">
      <div className="section-heading">
        <div><p className="eyebrow">PLANS</p><h2 id="pricing-heading">Start small.<br /><em>Grow with the review load.</em></h2></div>
        <p>Proposed plans for early access. Prices are agreed with each early-access customer; none are published yet.</p>
      </div>
      <div className="plan-grid">
        {PLANS.map(([name, d, items], n) => (
          <article className={`plan ${n === 1 ? 'featured' : ''}`} key={name}>
            {n === 1 && <span className="plan-tag">Most complete</span>}
            <h3>{name}</h3>
            <p className="plan-price">Pricing on request</p>
            <p>{d}</p>
            <ul>{items.map(i => <li key={i}><Check size={14} aria-hidden="true" /> {i}</li>)}</ul>
            <a className={n === 1 ? 'button small' : 'text-link'} href="#early-access">Request early access <ArrowRight size={16} aria-hidden="true" /></a>
          </article>
        ))}
      </div>
    </section>
  );
}

const FAQS = [
  ['Does Proofloom approve artwork automatically?', 'No. It finds and explains differences. A person records the print decision for one exact artwork version, and your workspace can require a second reviewer to confirm.'],
  ['What does the AI do, and what does it not do?', 'In the proposed product, AI helps with things rules cannot judge well, such as whether a reworded claim means the same as the approved one. Every suggestion is labelled, must cite the source text, and needs a reviewer decision. Quantities, codes, barcodes, allergens and required wording are checked by exact rules, not by AI.'],
  ['Does it certify regulatory compliance?', 'No. Proofloom checks artwork against the specification you approved. Whether that specification meets the rules for your product and market remains your responsibility.'],
  ['How are unit differences handled?', 'Quantities are converted before comparing, so 0.45 L and 450 ml match. A change of unit type, such as grams against millilitres, is flagged as critical.'],
  ['Can the artwork studio see our whole review?', 'No. The studio role sees only the corrections sent to it, can reply in context, and can upload a corrected version. Administrators see aggregate counts, not review contents.'],
  ['Are our files used to train AI models?', 'The proposed design uses Amazon Bedrock under terms that exclude customer content from model training, and sends only the text needed for a suggestion. This will be confirmed in the data-processing agreement.'],
  ['Is the product available today?', 'Proofloom is in the building stage. The interactive prototype runs in your browser with fictional data; uploads, text extraction and AI comparison need the production backend described in the architecture section.'],
  ['How do we get early access?', 'Use the form below. Tell us what you review and where revisions get difficult, and we will reply by email.'],
];

export function Faq() {
  return (
    <section className="faq wrap" id="faq" aria-labelledby="faq-heading">
      <p className="eyebrow">FAQ</p>
      <h2 id="faq-heading">Questions packaging<br /><em>teams ask.</em></h2>
      <div className="faq-list">
        {FAQS.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
      </div>
    </section>
  );
}
