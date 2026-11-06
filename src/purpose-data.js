export default {
  name: 'Proofloom',
  eyebrow: 'Why Proofloom exists',
  manifesto: 'Every package makes a promise: what is inside, how much, and what it is safe to eat or use. We believe that promise deserves a second look before it is printed a million times.',
  purpose: 'Proofloom exists to make sure the words on a package match the facts behind it — so the people who check artwork can find the one detail that changed, prove where it came from, and fix it before the press runs.',
  why: 'A wrong quantity, an old product code or a missing allergen can mean reprints, recalls and — worst of all — a customer who trusted the label. Most of these mistakes are not careless; they slip through when specifications and artwork travel separately.',
  stakesTitle: 'Small details on a label carry real weight.',
  stats: [
    { value: 45.5, dec: 1, suffix: '%', label: 'of US food recall events in 2024 were caused by label errors — the leading cause that year.', source: 'Loftware analysis of FDA enforcement data, via New Food Magazine', url: 'https://www.newfoodmagazine.com/news/247701/label-errors-dominate-2024-us-food-recalls-costing-industry-1-92-billion/' },
    { value: 84, suffix: '%', label: 'of those label-error recalls came from undeclared allergens — information that existed, but never made it onto the pack.', source: 'Loftware analysis of FDA enforcement data, via New Food Magazine', url: 'https://www.newfoodmagazine.com/news/247701/label-errors-dominate-2024-us-food-recalls-costing-industry-1-92-billion/' },
    { value: 10, prefix: '$', suffix: 'M', label: 'is the average estimated cost of a single food recall event to the company involved.', source: 'Grocery Manufacturers Association estimate, via New Food Magazine', url: 'https://www.newfoodmagazine.com/news/247701/label-errors-dominate-2024-us-food-recalls-costing-industry-1-92-billion/' }
  ],
  statsNote: 'Published figures from third-party sources, linked above. They describe the cost of label mistakes across the industry, not Proofloom results. Proofloom assists human review; it does not certify compliance.',
  changeTitle: 'From “I think it matches” to “here is the proof.”',
  before: ['The specification lives in a spreadsheet; the artwork in a PDF.', 'Reviewers compare them by eye, line by line, late in the day.', 'Corrections are buried in long email threads.', 'An old product code survives three revisions unnoticed.', 'Nobody can show who approved what, or why.'],
  after: ['Specification and artwork sit side by side, on the same review table.', 'Exact checks catch quantities and codes that differ — with the source shown.', 'Every finding has an owner, a comment trail and a status.', 'Each new version is re-checked against the same approved facts.', 'A person records the print decision — and the record keeps it.'],
  principlesTitle: 'The rules we build by.',
  principles: [
    ['Evidence before opinion', 'Every flag shows the two values that differ and where each came from. No finding without a source.'],
    ['People make the call', 'Proofloom suggests and organises. The approval to print is always a human decision, recorded separately.'],
    ['Exact where it can be', 'Quantities, codes and dates are checked deterministically. AI only helps with wording and meaning.'],
    ['Respect the reviewer’s eye', 'We build for the expert who gives packaging its final check — and make their judgement easier to act on.'],
    ['Honest about limits', 'Proofloom does not certify regulatory compliance or promise error-free packaging. It makes errors easier to find.'],
    ['Your artwork stays yours', 'In the proposed design, files are encrypted, visible only to your team and never used to train models.']
  ],
  letterTitle: 'Why we’re building this.',
  letter: [
    'Packaging is the last thing between a product and the person who buys it. When the label is right, nobody notices. When it’s wrong, it can cost a reprint, a recall, or someone’s trust.',
    'We started Proofloom because the people who catch those mistakes deserve better tools than a spreadsheet, a PDF and a long email thread. They deserve to see the difference, the source and the decision in one place.',
    'We’re building it together with printers, brands and manufacturers — and we’d love to build it with you.'
  ],
  founders: [{ name: 'Tolu Akinwale', role: 'Founder & CEO' }, { name: 'Michael Ugwu', role: 'Co-founder & CTO' }],
  visionTitle: 'A world where the label always matches the facts.',
  visionIntro: 'Our plan, shaped by early-access teams. The order may change as pilots teach us more.',
  vision: [
    { stage: 'Now', title: 'Prototype & early access', text: 'An interactive review desk on fictional products: exact checks, AI suggestions, corrections and a two-person print decision.' },
    { stage: 'Next', title: 'Pilots with real artwork', text: 'Your specifications and artwork, extracted and compared, with corrections tracked through re-review.' },
    { stage: 'Then', title: 'Everyday review', text: 'Studio and printer hand-offs, single sign-on and review reports your customers can trust.' },
    { stage: 'Later', title: 'Fewer reprints, everywhere', text: 'Multi-language packs, regulatory reference libraries and a shared standard for proving a label is right.' }
  ]
};
