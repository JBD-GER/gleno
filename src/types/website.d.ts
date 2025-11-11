export type SectionId =
  | 'hero' | 'services' | 'benefits' | 'gallery'
  | 'testimonials' | 'faq' | 'contact';

export type WebsiteContent = {
  order: SectionId[];
  enabled: Record<SectionId, boolean>;
  hero: { h1: string; sub: string; cta_label?: string; cta_href?: string; image?: string };
  services: { title: string; items: { title: string; text: string; icon?: string }[] };
  benefits: { title: string; items: { title: string; text: string }[] };
  gallery: { title: string; items: { image: string; caption?: string }[] };
  testimonials: { title: string; items: { name: string; text: string; stars?: number }[] };
  faq: { title: string; items: { q: string; a: string }[] };

  // Kontakt jetzt mit Intro + E-Mail-Routing + optionalen Vorlagen
  contact: {
    title: string;
    phone?: string;
    email?: string;            // Anzeigeadresse (öffentlich sichtbar)
    address?: string;
    opening?: string;
    form?: boolean;

    // NEU:
    intro?: string;            // kurzer Einleitungstext über dem Formular
    recipient?: string;        // Empfängeradresse(n) für eingehende Anfragen (Komma getrennt möglich)
    notify_subject?: string;   // Betreff interner Benachrichtigung
    notify_html?: string;      // HTML-Body interne Benachrichtigung (Platzhalter: {{name}}, {{email}}, {{phone}}, {{message}}, {{websiteTitle}})
    autoreply_subject?: string;// Betreff Auto-Reply an Absender
    autoreply_html?: string;   // HTML-Body Auto-Reply an Absender (gleiche Platzhalter)
  };
};

