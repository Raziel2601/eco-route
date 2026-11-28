import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const SENDER = 'EcoRoute AI <flota@eco-router.shop>';

// 1. Envío de código de uso único (OTP) a correo real
export async function sendOtpEmail(to: string, code: string) {
  const { data, error } = await resend.emails.send({
    from: SENDER,
    to,
    subject: `${code} es tu código de acceso - EcoRoute AI`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px;">
        <h2>Verificación de acceso</h2>
        <p>Ingresa este código de un solo uso para continuar:</p>
        <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; padding: 12px; background: #f4f4f5; text-align: center; border-radius: 8px;">
          ${code}
        </div>
        <p style="color: #71717a; font-size: 13px;">Este código expira en 10 minutos.</p>
      </div>
    `,
  });

  if (error) throw new Error(error.message);
  return data;
}

// 2. Demostración de alta en flotilla o asignación de viaje
export async function sendDispatchEmail(params: {
  to: string;
  driverName: string;
  type: 'ALTA_FLOTILLA' | 'ASIGNACION_VIAJE';
  unit: string;
  route?: string;
}) {
  const isTrip = params.type === 'ASIGNACION_VIAJE';
  const subject = isTrip
    ? `Nueva ruta asignada: ${params.route} - EcoRoute AI`
    : `Bienvenido a la flotilla - EcoRoute AI`;

  const { data, error } = await resend.emails.send({
    from: SENDER,
    to: params.to,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 520px;">
        <h2>Hola, ${params.driverName}</h2>
        <p>${
          isTrip
            ? 'Se te ha asignado un nuevo viaje dentro de la plataforma:'
            : 'Tu registro ha sido confirmado y ya formas parte activa de la flotilla:'
        }</p>
        <ul>
          <li><strong>Unidad asignada:</strong> ${params.unit}</li>
          ${isTrip ? `<li><strong>Ruta:</strong> ${params.route}</li>` : ''}
          <li><strong>Estado:</strong> Activo</li>
        </ul>
      </div>
    `,
  });

  if (error) throw new Error(error.message);
  return data;
}