// src/app/(public)/agb/page.tsx

export const metadata = {
  title: 'AGB – GLENO ',
  description: 'Allgemeine Geschäftsbedingungen (AGB) für die Nutzung von GLENO.',
}

export default function AGBPage() {
  return (
    <section className="py-20 px-6 text-text-700">
      <div className="max-w-3xl mx-auto space-y-12">
        <h1 className="text-4xl font-bold text-primary">Allgemeine Geschäftsbedingungen (AGB)</h1>

        {/* 1. Geltungsbereich */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">1. Geltungsbereich</h2>
          <p>
            Diese Bedingungen gelten für alle Verträge über die Nutzung der GLENO
            zwischen der Flaaq Holding GmbH (nachfolgend „Anbieter“) und ihren Kunden (nachfolgend
            „Nutzer“), soweit nicht etwas anderes ausdrücklich vereinbart ist.
          </p>
        </div>

        {/* 2. Vertragsgegenstand */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">2. Vertragsgegenstand</h2>
          <p>
            Der Anbieter stellt dem Nutzer eine webbasierte SaaS‑Lösung zur Projektverwaltung,
            Materialplanung, Teamorganisation und Reporting zur Verfügung. Die Software wird als
            Dienstleistung betrieben und im Rahmen eines Abonnements zugänglich gemacht.
          </p>
        </div>

        {/* 3. Testphase */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">3. Testphase</h2>
          <p>
            Neue Nutzer erhalten eine kostenlose Testphase von 30 Tagen. Während dieser Zeit ist
            die Nutzung aller Funktionen ohne Entgelt möglich. Die Testphase endet automatisch,
            ohne dass es einer Kündigung bedarf. Ab Vertragsende fällt das Abonnement an, wenn nicht
            vorher gekündigt wurde.
          </p>
        </div>

        {/* 4. Preise und Zahlung */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">4. Preise und Zahlung</h2>
          <p>
            Nach Ablauf der Testphase beträgt das monatliche Abonnemententgelt 59 € zzgl. gesetzlicher
            Mehrwertsteuer. Die Zahlung erfolgt monatlich im Voraus per SEPA‑Lastschrift, Kreditkarte
            oder PayPal. Rückerstattungen sind ausgeschlossen.
          </p>
        </div>

        {/* 5. Leistungsumfang */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">5. Leistungsumfang</h2>
          <p>
            Der Anbieter sichert die Verfügbarkeit der Software von 99 % im Jahresmittel. Ausgenommen
            sind geplante Wartungsarbeiten und unvorhergesehene Störungen, die außerhalb des Einflussbereichs
            des Anbieters liegen.
          </p>
        </div>

        {/* 6. Laufzeit und Kündigung */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">6. Laufzeit und Kündigung</h2>
          <p>
            Nach der Testphase verlängert sich das Abonnement jeweils um einen weiteren Monat,
            wenn es nicht mit einer Frist von 7 Tagen zum Laufzeitende schriftlich gekündigt wird.
            Die Kündigung kann per E‑Mail an support@gleno.de erfolgen.
          </p>
        </div>

        {/* 7. Haftungsausschluss */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">7. Haftungsausschluss</h2>
          <p>
            Der Anbieter haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit. Bei einfacher
            Fahrlässigkeit ist die Haftung auf vertragstypische und vorhersehbare Schäden begrenzt.
            Für entgangenen Gewinn und mittelbare Schäden haftet der Anbieter nur bei Vorsatz oder
            grober Fahrlässigkeit.
          </p>
        </div>

        {/* 8. Datenschutz */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">8. Datenschutz</h2>
          <p>
            Personenbezogene Daten werden entsprechend der Datenschutzerklärung verarbeitet. Eine
            Weitergabe an Dritte erfolgt nur, soweit dies zur Vertragserfüllung erforderlich ist
            oder eine gesetzliche Verpflichtung besteht.
          </p>
        </div>

        {/* 9. Schlussbestimmungen */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">9. Schlussbestimmungen</h2>
          <p>
            Änderungen oder Ergänzungen dieses Vertrags bedürfen der Schriftform. Sollte eine
            Bestimmung dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen
            unberührt. Es gilt deutsches Recht. Gerichtsstand ist Hannover, sofern der Nutzer Kaufmann
            ist.
          </p>
        </div>
      </div>
    </section>
  )
}
