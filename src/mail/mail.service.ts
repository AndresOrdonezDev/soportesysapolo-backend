import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>');
}

interface PlantillaParams {
  pageTitle: string;
  eyebrow: string;
  nombreUsuario: string;
  intro: string;
  numero: number;
  estadoLabel: string;
  estadoBg: string;
  estadoColor: string;
  fecha: string;
  titulo: string;
  autor: string;
  respuesta: string;
  ctaUrl: string;
  ctaLabel: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly portalUrl: string;

  constructor(private readonly config: ConfigService) {
    const user = this.config.get<string>('MAIL_USER');
    const port = Number(this.config.get('MAIL_PORT', 465));

    this.from = user ?? '';
    this.portalUrl = this.config.get<string>('MAIL_PORTAL_URL', 'https://soporte.softwareysoluciones.net');
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('MAIL_HOST'),
      port,
      secure: port === 465,
      auth: {
        user,
        pass: this.config.get<string>('MAIL_PASS'),
      },
    });
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"Software y Soluciones - Soporte" <${this.from}>`,
        to,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error(`Error enviando correo a ${to}: ${err}`);
    }
  }

  private formatFecha(): string {
    return new Date().toLocaleString('es-CO', {
      dateStyle: 'long',
      timeStyle: 'short',
    });
  }

  private buildTemplate(params: PlantillaParams): string {
    const {
      pageTitle, eyebrow, nombreUsuario, intro, numero,
      estadoLabel, estadoBg, estadoColor, fecha, titulo,
      autor, respuesta, ctaUrl, ctaLabel,
    } = params;

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f9; font-family: Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9; padding: 2rem 1rem;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e0e0e0;">

          <!-- HEADER -->
          <tr>
            <td style="background-color:#1a3a5c; padding:2rem; text-align:center;">
              <p style="margin:0 0 4px; font-size:12px; color:#90b8d8; letter-spacing:1px;">${eyebrow}</p>
              <p style="margin:0; font-size:22px; font-weight:bold; color:#ffffff;">Software y Soluciones</p>
            </td>
          </tr>

          <!-- SALUDO -->
          <tr>
            <td style="padding:1.75rem 2rem 0;">
              <p style="margin:0 0 4px; font-size:14px; color:#555;">Hola, <strong style="color:#1a1a1a;">${escapeHtml(nombreUsuario)}</strong></p>
              <p style="margin:0.75rem 0 0; font-size:14px; color:#666; line-height:1.6;">
                ${intro}
              </p>
            </td>
          </tr>

          <!-- DATOS DEL CASO -->
          <tr>
            <td style="padding:1.5rem 2rem 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa; border-radius:8px; border:1px solid #e0e0e0;">
                <tr>
                  <td style="padding:1.25rem 1.25rem 1rem;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right:2rem;">
                          <p style="margin:0 0 2px; font-size:10px; color:#999; text-transform:uppercase; letter-spacing:0.5px;">Número de caso</p>
                          <p style="margin:0; font-size:15px; font-weight:bold; color:#1a1a1a;">#${numero}</p>
                        </td>
                        <td style="padding-right:2rem;">
                          <p style="margin:0 0 2px; font-size:10px; color:#999; text-transform:uppercase; letter-spacing:0.5px;">Estado</p>
                          <span style="display:inline-block; padding:2px 10px; background-color:${estadoBg}; color:${estadoColor}; border-radius:20px; font-size:12px; font-weight:bold;">${estadoLabel}</span>
                        </td>
                        <td>
                          <p style="margin:0 0 2px; font-size:10px; color:#999; text-transform:uppercase; letter-spacing:0.5px;">Fecha</p>
                          <p style="margin:0; font-size:13px; color:#1a1a1a;">${fecha}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:1rem 1.25rem 1.25rem; border-top:1px solid #e0e0e0;">
                    <p style="margin:0 0 4px; font-size:10px; color:#999; text-transform:uppercase; letter-spacing:0.5px;">Título del caso</p>
                    <p style="margin:0; font-size:15px; font-weight:bold; color:#1a1a1a;">${titulo ? escapeHtml(titulo) : '—'}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- RESPUESTA -->
          <tr>
            <td style="padding:1.5rem 2rem 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-left:3px solid #1a3a5c; padding-left:1rem;">
                    <p style="margin:0 0 6px; font-size:10px; color:#999; text-transform:uppercase; letter-spacing:0.5px;">Respuesta de ${escapeHtml(autor)}</p>
                    <p style="margin:0; font-size:14px; color:#444; line-height:1.7;">${escapeHtml(respuesta)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- NOTA / CTA -->
          <tr>
            <td style="padding:1.5rem 2rem 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f6ff; border-radius:8px; border:1px solid #b5d4f4;">
                <tr>
                  <td style="padding:1rem 1.25rem;">
                    <p style="margin:0 0 1rem; font-size:13px; color:#185fa5; line-height:1.6;">
                      Si tienes alguna duda adicional o el problema persiste, ingresa al portal y responde directamente en tu caso.
                    </p>
                    <a href="${ctaUrl}"
                       style="display:inline-block; background-color:#1a3a5c; color:#ffffff; text-decoration:none; padding:10px 24px; border-radius:6px; font-size:13px; font-weight:bold;">
                      ${ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:1.25rem 2rem 1.75rem;">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:0.5rem; border-top:1px solid #e0e0e0;">
                <tr>
                  <td style="padding-top:1rem;">
                    <p style="margin:0; font-size:11px; color:#999;">Software y Soluciones · soporte@softwareysoluciones.net</p>
                  </td>
                  <td style="padding-top:1rem;" align="right">
                    <p style="margin:0; font-size:11px; color:#999;">Este es un mensaje automático</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
  }

  async sendRespuestaSoporte(params: {
    to: string;
    nombreUsuario: string;
    soporteId: number;
    titulo: string;
    respuesta: string;
    autor: string;
  }): Promise<void> {
    const { to, nombreUsuario, soporteId, titulo, respuesta, autor } = params;
    const tituloTxt = titulo ? ` - ${titulo}` : '';
    const subject = `Se atendió tu solicitud #${soporteId}${tituloTxt}`;

    const html = this.buildTemplate({
      pageTitle: 'Respuesta a tu caso de soporte',
      eyebrow: 'SOPORTE TÉCNICO',
      nombreUsuario,
      intro: 'Tu solicitud ha sido atendida. A continuación encontrarás el detalle de la respuesta.',
      numero: soporteId,
      estadoLabel: 'Atendido',
      estadoBg: '#dcfce7',
      estadoColor: '#166534',
      fecha: this.formatFecha(),
      titulo,
      autor,
      respuesta,
      ctaUrl: `${this.portalUrl}/dashboard`,
      ctaLabel: 'Ir al portal de soporte',
    });

    await this.send(to, subject, html);
  }

  async sendRespuestaCasoInterno(params: {
    to: string;
    nombreUsuario: string;
    casoId: number;
    titulo: string;
    respuesta: string;
    autor: string;
  }): Promise<void> {
    const { to, nombreUsuario, casoId, titulo, respuesta, autor } = params;
    const tituloTxt = titulo ? ` - ${titulo}` : '';
    const subject = `Nueva respuesta en el caso interno #${casoId}${tituloTxt}`;

    const html = this.buildTemplate({
      pageTitle: 'Nueva respuesta en tu caso interno',
      eyebrow: 'CASOS INTERNOS',
      nombreUsuario,
      intro: 'Hay una nueva respuesta en un caso interno en el que estás involucrado. A continuación encontrarás el detalle.',
      numero: casoId,
      estadoLabel: 'Nueva respuesta',
      estadoBg: '#dbeafe',
      estadoColor: '#1e40af',
      fecha: this.formatFecha(),
      titulo,
      autor,
      respuesta,
      ctaUrl: `${this.portalUrl}/casos-internos`,
      ctaLabel: 'Ir al portal de soporte',
    });

    await this.send(to, subject, html);
  }
}
