'use strict';
import nodemailer from 'nodemailer';

let transportador = null;

const escaparHtml = (valor) =>
  String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const convertirBooleano = (valor) =>
  ['1', 'true', 'si', 'sí', 'yes'].includes(String(valor ?? '').trim().toLowerCase());

const obtenerConfiguracion = () => {
  const host = process.env.CORREO_HOST;
  const puerto = Number(process.env.CORREO_PUERTO || 587);
  const usuario = process.env.CORREO_USUARIO;
  const contrasena = process.env.CORREO_CONTRASENA;

  if (!host || !usuario || !contrasena) {
    throw new Error(
      'Configuración de correo incompleta. Define CORREO_HOST, CORREO_USUARIO y CORREO_CONTRASENA.'
    );
  }

  return {
    host,
    port: puerto,
    secure: convertirBooleano(process.env.CORREO_SEGURO) || puerto === 465,
    auth: {
      user: usuario,
      pass: contrasena,
    },
  };
};

const obtenerTransportador = () => {
  if (!transportador) {
    transportador = nodemailer.createTransport(obtenerConfiguracion());
  }

  return transportador;
};

const obtenerContenidoPorMotivo = (motivo) => {
  if (motivo === 'activacion') {
    return {
      asunto: 'Tu cuenta TECHO Chile fue activada',
      titulo: 'Cuenta activada correctamente',
      introduccion:
        'Tu cuenta ya está activa. Por seguridad se generó una nueva contraseña temporal para este acceso.',
      aviso:
        'La contraseña temporal reemplaza cualquier contraseña anterior. Te recomendamos cambiarla después de iniciar sesión.',
    };
  }

  if (motivo === 'creacion') {
    return {
      asunto: 'Credenciales de tu nueva cuenta TECHO Chile',
      titulo: 'Tu cuenta fue creada',
      introduccion:
        'Se creó una cuenta para ti en la plataforma de gestión de TECHO Chile. La cuenta permanecerá pendiente hasta que un coordinador la active.',
      aviso:
        'Cuando la cuenta sea activada recibirás un nuevo correo con credenciales válidas de activación.',
    };
  }

  return {
    asunto: 'Confirmación de registro y credenciales TECHO Chile',
    titulo: 'Registro recibido correctamente',
    introduccion:
      'Tu registro fue recibido y tu cuenta quedó pendiente de activación por un coordinador.',
    aviso:
      'Cuando la cuenta sea activada recibirás un nuevo correo. La activación puede reemplazar esta contraseña por una contraseña temporal.',
  };
};

export class CorreoService {
  static async enviarCredenciales({
    nombre,
    correo,
    rut,
    contrasena,
    motivo = 'registro',
  }) {
    if (!correo || !rut || !contrasena) {
      throw new Error('Faltan datos para enviar el correo de credenciales.');
    }

    const contenido = obtenerContenidoPorMotivo(motivo);
    const remitente =
      process.env.CORREO_REMITENTE ||
      `TECHO Chile <${process.env.CORREO_USUARIO}>`;
    const urlBase = String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const urlLogin = `${urlBase}/auth/iniciar-sesion`;

    const nombreSeguro = escaparHtml(nombre || 'Usuario');
    const rutSeguro = escaparHtml(rut);
    const contrasenaSegura = escaparHtml(contrasena);
    const tituloSeguro = escaparHtml(contenido.titulo);
    const introduccionSegura = escaparHtml(contenido.introduccion);
    const avisoSeguro = escaparHtml(contenido.aviso);
    const urlLoginSegura = escaparHtml(urlLogin);

    const info = await obtenerTransportador().sendMail({
      from: remitente,
      to: correo,
      subject: contenido.asunto,
      text: [
        `Hola ${nombre || 'Usuario'},`,
        '',
        contenido.introduccion,
        '',
        'Credenciales:',
        `RUT: ${rut}`,
        `Contraseña: ${contrasena}`,
        '',
        contenido.aviso,
        `Ingresar: ${urlLogin}`,
        '',
        'TECHO Chile',
      ].join('\n'),
      html: `
        <div style="margin:0;padding:24px;background:#f3f4f5;font-family:Arial,sans-serif;color:#191c1d;">
          <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #bec7d2;border-radius:14px;overflow:hidden;">
            <div style="background:#006192;color:#ffffff;padding:24px;">
              <div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">TECHO Chile</div>
              <h1 style="margin:8px 0 0;font-size:26px;line-height:1.25;">${tituloSeguro}</h1>
            </div>
            <div style="padding:28px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hola <strong>${nombreSeguro}</strong>,</p>
              <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#3f4850;">${introduccionSegura}</p>

              <div style="background:#f3f4f5;border:1px solid #bec7d2;border-radius:10px;padding:18px;margin:0 0 20px;">
                <div style="margin-bottom:12px;">
                  <div style="font-size:12px;font-weight:700;color:#6f7882;text-transform:uppercase;">RUT</div>
                  <div style="font-size:17px;font-weight:700;color:#191c1d;">${rutSeguro}</div>
                </div>
                <div>
                  <div style="font-size:12px;font-weight:700;color:#6f7882;text-transform:uppercase;">Contraseña</div>
                  <div style="font-size:17px;font-weight:700;color:#191c1d;word-break:break-all;">${contrasenaSegura}</div>
                </div>
              </div>

              <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#3f4850;">${avisoSeguro}</p>

              <a href="${urlLoginSegura}" style="display:inline-block;background:#006192;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px;">Ir al inicio de sesión</a>
            </div>
          </div>
        </div>
      `,
    });

    return {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    };
  }
}
