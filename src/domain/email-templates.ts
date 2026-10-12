/**
 * PHASE4_SPEC §13 · email templates (pure). Every value is escaped for HTML; the plain-text part carries the same
 * information. Templates never include strategic content: only who invites, to which brand, the link and its expiry.
 */
export type EmailMessage = { subject: string; text: string; html: string };

const escape = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const day = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]} de ${d.getUTCFullYear()}`; };

export function guestInvitationEmail(input: { brandName: string; inviterName: string; link: string; expiresAt: string }): EmailMessage {
  const subject = `Invitación para revisar la marca ${input.brandName}`.slice(0, 200);
  const text = [
    `${input.inviterName} te invita a revisar el trabajo de la marca ${input.brandName} en Brandopolis.`,
    '',
    `Abre este enlace de un solo uso para aceptar la invitación: ${input.link}`,
    `El enlace vence el ${day(input.expiresAt)} (UTC). Si no esperabas este mensaje, ignóralo.`,
    '',
    'Verás sólo lo que el equipo comparta contigo. Brandopolis no te pedirá contraseñas por correo.'
  ].join('\n');
  const html = `<p>${escape(input.inviterName)} te invita a revisar el trabajo de la marca <strong>${escape(input.brandName)}</strong> en Brandopolis.</p>`
    + `<p><a href="${escape(input.link)}">Aceptar la invitación</a> (enlace de un solo uso).</p>`
    + `<p>El enlace vence el ${escape(day(input.expiresAt))} (UTC). Si no esperabas este mensaje, ignóralo.</p>`
    + '<p>Verás sólo lo que el equipo comparta contigo. Brandopolis no te pedirá contraseñas por correo.</p>';
  return { subject, text, html };
}
