// src/app/(public)/impressum/page.tsx

export const metadata = {
  title: 'Impressum – Software Fliesenleger',
  description: 'Impressum der Software Fliesenleger – rechtliche Informationen und Kontaktangaben.',
}

export default function ImpressumPage() {
  return (
    <section className="py-20 px-6 text-text-700">
      <div className="max-w-3xl mx-auto space-y-10">
        <h1 className="text-4xl font-bold text-primary">Impressum</h1>

        {/* Anbieter */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Angaben gemäß § 5 TMG</h2>
          <p>Flaaq Holding GmbH<br/>
             Dammstr. 6G<br/>
             30890 Barsinghausen
          </p>
        </div>

        {/* Registereintrag */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Handelsregister</h2>
          <p>
            Eingetragen beim Amtsgericht Hannover<br/>
            HRB 223594
          </p>
        </div>

        {/* Vertretungsberechtigte */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Vertreten durch</h2>
          <p>Geschäftsführer: Christoph Pfad</p>
        </div>

        {/* Kontakt */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Kontakt</h2>
          <p>Telefon: <a href="tel:+4950353169991" className="text-accent-500 hover:underline">+49 5035 3169991</a><br/>
             E‑Mail: <a href="mailto:support@gleno.de" className="text-accent-500 hover:underline">support@gleno.de</a>
          </p>
        </div>

        {/* Umsatzsteuer */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Umsatzsteuer‑ID</h2>
          <p>Umsatzsteuer‑Identifikationsnummer gemäß § 27 a UStG:<br/>
             DE 352217621
          </p>
        </div>

        {/* Aufsichtsbehörde */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Aufsichtsbehörde</h2>
          <p>
            Deutscher Industrie‑ und Handelskammertag (DIHK) e.V.<br/>
            Breite Straße 29<br/>
            10178 Berlin
          </p>
        </div>

        {/* Vermittlerregister */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Registerangaben</h2>
          <p>
            Registrierung nach § 34i Abs. 1 GewO<br/>
            Erlaubnis erteilt in Deutschland<br/>
            Telefon: <a href="tel:+491806005850" className="text-accent-500 hover:underline">
              +49 180 6 00 58 50
            </a> (20 ct/Anruf aus dem Festnetz, max. 60 ct/Anruf aus dem Mobilfunk)<br/>
            Online‑Vermittlerregister: <a href="http://www.vermittlerregister.info" className="text-accent-500 hover:underline">
              www.vermittlerregister.info
            </a><br/>
            Unser Eintrag: <a
              href="http://www.vermittlerregister.info/flaaqholdinggmbh"
              className="text-accent-500 hover:underline"
            >
              www.vermittlerregister.info/flaaqholdinggmbh
            </a>
          </p>
        </div>

        {/* ODR */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Online‑Streitbeilegung</h2>
          <p>
            Die Europäische Kommission stellt eine Plattform zur Online‑Streitbeilegung (OS) bereit:
            <br/>
            <a
              href="https://ec.europa.eu/consumers/odr/"
              className="text-accent-500 hover:underline"
            >
              https://ec.europa.eu/consumers/odr/
            </a><br/>
            Unsere E‑Mail‑Adresse finden Sie oben im Impressum.
          </p>
        </div>

        {/* Berufshaftpflicht */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Berufshaftpflichtversicherung</h2>
          <p>
            Name und Sitz des Versicherers:<br/>
            VHV Allgemeine Versicherung AG<br/>
            VHV‑Platz 1, 30177 Hannover<br/>
            Geltungsraum: Deutschland
          </p>
        </div>

        {/* Betriebshaftpflicht */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Betriebshaftpflichtversicherung</h2>
          <p>
            Name und Sitz des Versicherers:<br/>
            andsafe Aktiengesellschaft<br/>
            Provinzial‑Allee 1, 48159 Münster<br/>
            Geltungsraum: Deutschland
          </p>
        </div>

        {/* Verbraucherstreitbeilegung */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Verbraucherstreitbeilegung</h2>
          <p>
            Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren
            vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </div>
      </div>
    </section>
  )
}
