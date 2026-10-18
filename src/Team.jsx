import React from 'react';

// Only owner-confirmed public facts belong here. Omit optional fields until supplied.
export const founders = [
  { name: 'Tolu Akinwale', role: 'Founder & CEO', initials: 'TA' },
  { name: 'Michael Ugwu', role: 'Co-founder & CTO', initials: 'MU' },
];

export default function Team() {
  return (
    <section id="leadership" className="team-section" aria-labelledby="leadership-heading">
      <div className="wrap">
        <div className="team-heading">
          <p className="eyebrow">THE PEOPLE BEHIND THE PRODUCT</p>
          <h2 id="leadership-heading">The People<br/>{' '}<em>Building Proofloom</em></h2>
        </div>
        <div className="founder-grid">
          {founders.map(person => (
            <article className="founder-card" key={person.name} aria-label={`${person.name}, ${person.role}`}>
              <div className="founder-portrait">
                {person.photo ? (
                  <img src={person.photo} alt={person.name} width="112" height="112"/>
                ) : (
                  <span className="founder-initials" aria-hidden="true">{person.initials}</span>
                )}
                <span className="founder-alignment" aria-hidden="true"/>
              </div>
              <div className="founder-info">
                <p className="founder-role">{person.role}</p>
                <h3>{person.name}</h3>
                {person.bio && <p className="founder-bio">{person.bio}</p>}
                {person.socials?.length > 0 && (
                  <nav className="founder-socials" aria-label={`${person.name} social links`}>
                    {person.socials.map(link => <a key={link.url} href={link.url} rel="noopener noreferrer">{link.label}</a>)}
                  </nav>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
