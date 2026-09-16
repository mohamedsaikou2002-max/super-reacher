export const markets = [
  { code: "SG", name: "Singapore", language: "English", currency: "SGD" },
  { code: "TW", name: "Taiwan", language: "Traditional Chinese", currency: "TWD" },
  { code: "VN", name: "Vietnam", language: "Vietnamese", currency: "VND" },
  { code: "TH", name: "Thailand", language: "Thai", currency: "THB" },
  { code: "AU", name: "Australia", language: "Australian English", currency: "AUD" },
  { code: "AR", name: "Argentina", language: "Argentine Spanish", currency: "USD" },
  { code: "FR", name: "France", language: "French", currency: "EUR" },
  { code: "ES", name: "Spain", language: "Spanish", currency: "EUR" },
  { code: "IT", name: "Italy", language: "Italian", currency: "EUR" },
  { code: "GR", name: "Greece", language: "Greek", currency: "EUR" },
  { code: "UK", name: "United Kingdom", language: "British English", currency: "GBP" },
];

const localized: Record<string, { subject: string; greeting: string; pitch: string; question: string; optout: string }> = {
  FR: { subject: "Une idée pour augmenter les réservations chez", greeting: "Bonjour", pitch: "Nous aidons les entreprises comme la vôtre à automatiser le suivi des prospects et à transformer davantage de demandes en réservations.", question: "Seriez-vous disponible pour une courte présentation cette semaine ?", optout: "Répondez STOP pour ne plus recevoir de messages." },
  ES: { subject: "Una idea para aumentar las reservas de", greeting: "Hola", pitch: "Ayudamos a negocios como el vuestro a automatizar el seguimiento de clientes potenciales y convertir más consultas en reservas.", question: "¿Te vendría bien una breve demostración esta semana?", optout: "Responde STOP para no recibir más mensajes." },
  IT: { subject: "Un'idea per aumentare le prenotazioni di", greeting: "Buongiorno", pitch: "Aiutiamo attività come la vostra ad automatizzare il follow-up dei contatti e trasformare più richieste in prenotazioni.", question: "Avrebbe 10 minuti per una breve demo questa settimana?", optout: "Risponda STOP per non ricevere altri messaggi." },
  TW: { subject: "協助提升預約量的想法：", greeting: "您好", pitch: "我們協助企業自動化潛在客戶跟進流程，將更多詢問轉化為實際預約。", question: "這週方便安排十分鐘簡單了解嗎？", optout: "如不希望再收到訊息，請回覆 STOP。" },
  default: { subject: "A simple way to grow bookings at", greeting: "Hi", pitch: "We help businesses like yours automate lead follow-up and turn more enquiries into confirmed bookings—without adding admin work.", question: "Would a quick 10-minute walkthrough this week be useful?", optout: "Reply STOP if you’d rather not hear from us." },
};

export function createEmail(input: { business: string; contact: string; sender: string; country: string; industry: string }) {
  const copy = localized[input.country] ?? localized.default;
  const business = input.business || "your business";
  const contact = input.contact || "there";
  const sender = input.sender || "The Super Reacher Team";
  const subject = `${copy.subject} ${business}`;
  const preview = `${copy.pitch.slice(0, 90)}…`;
  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${subject}</title></head>
  <body style="margin:0;background:#f3f4f1;font-family:Arial,sans-serif;color:#161813">
    <div style="display:none;max-height:0;overflow:hidden">${preview}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f1;padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #dedfd9">
          <tr><td style="height:8px;background:linear-gradient(90deg,#b8ff32,#72e31a)"></td></tr>
          <tr><td style="padding:34px 38px 10px;font-size:13px;font-weight:700;letter-spacing:1.4px;color:#506312">SUPER REACHER</td></tr>
          <tr><td style="padding:18px 38px 6px;font-size:17px;line-height:1.6">${copy.greeting} ${contact},</td></tr>
          <tr><td style="padding:8px 38px;font-size:17px;line-height:1.65">${copy.pitch}</td></tr>
          <tr><td style="padding:8px 38px;font-size:17px;line-height:1.65">${copy.question}</td></tr>
          <tr><td style="padding:18px 38px 32px;font-size:17px;line-height:1.6">Best,<br><strong>${sender}</strong></td></tr>
          <tr><td style="border-top:1px solid #e6e7e2;padding:18px 38px;font-size:11px;line-height:1.5;color:#767970">This is a business outreach email. ${copy.optout}</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  return { subject, html };
}