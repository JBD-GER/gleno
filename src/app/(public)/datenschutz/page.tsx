// src/app/(public)/datenschutz/page.tsx

export const metadata = {
  title: 'Datenschutz – Software Fliesenleger',
  description:
    'Datenschutzerklärung der Software Fliesenleger – Informationen zur Erhebung, Verarbeitung und Nutzung Ihrer personenbezogenen Daten.',
}

export default function DatenschutzPage() {
  return (
    <section className="py-20 px-6 text-text-700">
      <div className="max-w-3xl mx-auto space-y-12">
        <h1 className="text-4xl font-bold text-primary">Datenschutzerklärung</h1>

        {/* 1. Verantwortlicher */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">1. Verantwortlicher</h2>
          <p>
            Verantwortlich für die Datenverarbeitung im Sinne der Datenschutz-Grundverordnung (DSGVO)
            ist:<br />
            <strong>Flaaq Holding GmbH</strong><br />
            Dammstr. 6G<br />
            30890 Barsinghausen<br />
            E‑Mail: <a href="mailto:support@gleno.de" className="text-accent-500 hover:underline">support@gleno.de</a><br />
            Telefon: +49 5035 3169991
          </p>
        </div>

        {/* 2. Datenerhebung und -verarbeitung */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">2. Erhebung und Verarbeitung personenbezogener Daten</h2>
          <p>
            Wir erheben und verarbeiten personenbezogene Daten, wenn Sie sich registrieren, unseren Dienst
            nutzen oder uns eine Nachricht senden. Zu den wichtigsten Daten gehören:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>E‑Mail­adresse, Name, Passwort (Verschlüsselt)</li>
            <li>Nutzungsdaten (Login‑Zeitpunkt, Aktionen im Dashboard)</li>
            <li>Kommunikations­inhalte (Support‑Anfragen)</li>
          </ul>
        </div>

        {/* 3. Rechtsgrundlagen */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">3. Rechtsgrundlagen der Verarbeitung</h2>
          <p>
            Die Verarbeitung erfolgt auf Basis folgender Rechtsgrundlagen:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)</li>
            <li>Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)</li>
            <li>Art. 6 Abs. 1 lit. f DSGVO (Berechtigte Interessen)</li>
          </ul>
        </div>

        {/* 4. Cookies & Tracking */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">4. Cookies & Tracking</h2>
          <p>
            Wir verwenden Cookies, um die Nutzung unserer Website zu ermöglichen und zu verbessern.
            Funktionale Cookies sind für den Betrieb unerlässlich. Analytische Cookies (z. B. Google Analytics)
            können Sie in den Einstellungen Ihres Browsers deaktivieren.
          </p>
        </div>

        {/* 5. Web‑Analyse */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">5. Web‑Analyse</h2>
          <p>
            Zur Messung und Verbesserung unserer Website verwenden wir Google Analytics. Ihre IP-Adresse
            wird gekürzt, um eine direkte Personenbeziehbarkeit auszuschließen. Weitere Informationen:
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-500 hover:underline"
            >
              Google Datenschutzerklärung
            </a>.
          </p>
        </div>

        {/* 6. Kontaktformular */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">6. Kontaktformular</h2>
          <p>
            Bei Nutzung unseres Kontaktformulars werden Name, E‑Mail und Ihre Nachricht erhoben. Diese Daten
            dienen ausschließlich zur Bearbeitung Ihrer Anfrage und werden nach Abschluss der Kommunikation
            gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten bestehen.
          </p>
        </div>

        {/* 7. Betroffenenrechte */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">7. Ihre Rechte</h2>
          <p>
            Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung sowie
            Datenübertragbarkeit und Widerruf erteilter Einwilligungen. Zur Ausübung Ihrer Rechte wenden
            Sie sich bitte an:
          </p>
          <p>
            <a href="mailto:hey@realmeta.io" className="text-accent-500 hover:underline">
              hey@realmeta.io
            </a>
          </p>
        </div>

        {/* 8. Datensicherheit */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">8. Datensicherheit</h2>
          <p>
            Wir setzen technische und organisatorische Sicherheitsmaßnahmen (z. B. TLS-Verschlüsselung)
            ein, um Ihre Daten vor unbefugtem Zugriff zu schützen. Trotz aller Maßnahmen kann keine
            vollständige Sicherheit im Internet garantiert werden.
          </p>
        </div>

        {/* 9. Änderungen der Datenschutzerklärung */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">9. Änderungen dieser Erklärung</h2>
          <p>
            Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen. Die jeweils aktuelle
            Fassung finden Sie auf unserer Website.
          </p>
        </div>

        {/* 10. Stand und Kontakt */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">10. Stand und Kontakt</h2>
          <p>
            Diese Datenschutzerklärung ist gültig ab Juli 2025.<br />
            Bei Fragen wenden Sie sich bitte an:
            <br />
            <a href="mailto:hey@realmeta.io" className="text-accent-500 hover:underline">
              hey@realmeta.io
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
