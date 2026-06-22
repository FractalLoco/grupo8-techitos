'use strict';
import PDFDocument from 'pdfkit';
import { createWriteStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const COLOR_PRIMARIO = '#163B63';
const COLOR_SECUNDARIO = '#1597BB';
const COLOR_TEXTO = '#263746';
const COLOR_SUAVE = '#EEF4F7';
const COLOR_ALERTA = '#A86700';
const DIRECTORIO_FOTOS_CHAT = path.resolve(process.cwd(), 'uploads', 'chat');

const fechaLegible = (valor) => {
  if (!valor || valor === 'No registrado') return 'No registrado';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Santiago',
  }).format(fecha);
};

const asegurarEspacio = (doc, alto = 70) => {
  if (doc.y + alto > doc.page.height - doc.page.margins.bottom - 22) doc.addPage();
};

const tituloSeccion = (doc, titulo) => {
  asegurarEspacio(doc, 55);
  doc.moveDown(0.7);
  doc.font('Helvetica-Bold').fontSize(15).fillColor(COLOR_PRIMARIO).text(titulo);
  doc.moveTo(doc.page.margins.left, doc.y + 4)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y + 4)
    .lineWidth(1)
    .strokeColor(COLOR_SECUNDARIO)
    .stroke();
  doc.moveDown(0.7);
};

const filaDato = (doc, etiqueta, valor) => {
  asegurarEspacio(doc, 28);
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR_PRIMARIO).text(`${etiqueta}:`, { continued: true });
  doc.font('Helvetica').fillColor(COLOR_TEXTO).text(` ${valor ?? 'No registrado'}`);
  if (doc.y < y + 13) doc.y = y + 13;
};

const listaSimple = (doc, elementos, obtenerTexto) => {
  if (elementos.length === 0) {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor('#637381').text('Sin registros');
    return;
  }
  for (const elemento of elementos) {
    asegurarEspacio(doc, 30);
    doc.font('Helvetica').fontSize(9).fillColor(COLOR_TEXTO).text(`- ${obtenerTexto(elemento)}`, {
      indent: 8,
      paragraphGap: 3,
    });
  }
};

const tarjetaIndicador = (doc, etiqueta, valor, x, y, ancho) => {
  doc.roundedRect(x, y, ancho, 58, 7).fill(COLOR_SUAVE);
  doc.font('Helvetica-Bold').fontSize(19).fillColor(COLOR_PRIMARIO)
    .text(String(valor), x + 12, y + 10, { width: ancho - 24, align: 'center' });
  doc.font('Helvetica').fontSize(7.5).fillColor('#516776')
    .text(etiqueta.toUpperCase(), x + 8, y + 36, { width: ancho - 16, align: 'center' });
};

const agregarPortada = (doc, snapshot) => {
  doc.rect(0, 0, doc.page.width, 190).fill(COLOR_PRIMARIO);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLOR_SECUNDARIO)
    .text('TECHO CHILE', 54, 58, { characterSpacing: 1.5 });
  doc.font('Helvetica-Bold').fontSize(27).fillColor('#FFFFFF')
    .text('Reporte de emergencia', 54, 88, { width: 487 });
  doc.font('Helvetica').fontSize(15).fillColor('#D8E8F0')
    .text(snapshot.emergencia.nombre, 54, 127, { width: 487 });

  doc.y = 225;
  filaDato(doc, 'Estado', snapshot.emergencia.estado);
  filaDato(doc, 'Fecha de inicio', fechaLegible(snapshot.emergencia.fecha_inicio));
  filaDato(doc, 'Fecha de cierre', fechaLegible(snapshot.emergencia.fecha_fin));
  filaDato(doc, 'Generado', fechaLegible(snapshot.generado_en));
  filaDato(doc, 'Ubicacion', snapshot.emergencia.ubicacion.direccion);
  doc.moveDown(1);
  doc.font('Helvetica').fontSize(10).fillColor(COLOR_TEXTO)
    .text(snapshot.emergencia.descripcion, { lineGap: 3 });
};

const agregarResumen = (doc, snapshot) => {
  tituloSeccion(doc, 'Resumen ejecutivo');
  const indicadores = [
    ['Obras finalizadas', snapshot.indicadores.obras_finalizadas],
    ['Familias registradas', snapshot.indicadores.familias_registradas],
    ['Personas beneficiadas', snapshot.indicadores.personas_beneficiadas],
    ['Cuadrillas', snapshot.indicadores.cuadrillas_desplegadas],
    ['Voluntarios', snapshot.indicadores.voluntarios_desplegados],
  ];
  const espacio = 8;
  const ancho = (doc.page.width - doc.page.margins.left - doc.page.margins.right - espacio * 2) / 3;
  let x = doc.page.margins.left;
  let y = doc.y;
  indicadores.forEach(([etiqueta, valor], indice) => {
    if (indice === 3) {
      y += 68;
      x = doc.page.margins.left;
    }
    tarjetaIndicador(doc, etiqueta, valor, x, y, ancho);
    x += ancho + espacio;
  });
  doc.y = y + 68;
};

const agregarFoto = async (doc, archivoUrl) => {
  if (!archivoUrl) return;
  try {
    if (!archivoUrl.startsWith('/uploads/chat/')) throw new Error('Ruta de foto no permitida');
    const nombreArchivo = path.basename(archivoUrl);
    const ruta = path.resolve(DIRECTORIO_FOTOS_CHAT, nombreArchivo);
    if (path.dirname(ruta) !== DIRECTORIO_FOTOS_CHAT) throw new Error('Ruta de foto no permitida');

    let buffer = await readFile(ruta);
    if (path.extname(nombreArchivo).toLowerCase() === '.webp') {
      buffer = await sharp(buffer).png().toBuffer();
    }
    const anchoMax = 200;
    const altoMax = 150;
    asegurarEspacio(doc, altoMax + 20);
    doc.image(buffer, doc.page.margins.left + 20, doc.y, { fit: [anchoMax, altoMax], align: 'center' });
    doc.y += altoMax + 10;
  } catch (error) {
    asegurarEspacio(doc, 25);
    doc.font('Helvetica-Oblique').fontSize(8).fillColor(COLOR_ALERTA)
      .text(`Evidencia fotografica no disponible (${error.message})`, { indent: 8 });
  }
};

const agregarCuadrillas = async (doc, snapshot) => {
  tituloSeccion(doc, 'Cuadrillas e integrantes');
  if (snapshot.cuadrillas.length === 0) {
    listaSimple(doc, [], () => '');
    return;
  }
  for (const cuadrilla of snapshot.cuadrillas) {
    asegurarEspacio(doc, 120);
    doc.roundedRect(doc.page.margins.left, doc.y, 487, 25, 5).fill(COLOR_SUAVE);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOR_PRIMARIO)
      .text(cuadrilla.nombre, doc.page.margins.left + 10, doc.y + 7, { width: 467 });
    doc.y += 32;
    filaDato(doc, 'Estado y fase', `${cuadrilla.estado} / ${cuadrilla.fase}`);
    filaDato(doc, 'Jefe', typeof cuadrilla.jefe === 'string' ? cuadrilla.jefe : cuadrilla.jefe.nombre);
    filaDato(doc, 'Cumplimiento de plazo', cuadrilla.cumplimiento_plazo);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR_PRIMARIO).text('Integrantes:');
    listaSimple(doc, cuadrilla.integrantes, (item) => `${item.nombre} (${item.rol}) - ${item.habilidades}`);

    // Hitos con fotos
    if (cuadrilla.hitos && cuadrilla.hitos.length > 0) {
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR_PRIMARIO).text('Avances:');
      for (const hito of cuadrilla.hitos) {
        asegurarEspacio(doc, 40);
        doc.font('Helvetica-Oblique').fontSize(8).fillColor('#637381')
          .text(`${fechaLegible(hito.fecha)} — ${hito.remitente}`, { indent: 8 });
        doc.font('Helvetica').fontSize(9).fillColor(COLOR_TEXTO)
          .text(hito.contenido, { indent: 8, paragraphGap: 2 });
        if (hito.archivo_url) {
          await agregarFoto(doc, hito.archivo_url);
        }
      }
    }
    doc.moveDown(0.5);
  }
};

const agregarFamilias = (doc, snapshot) => {
  tituloSeccion(doc, 'Familias atendidas');
  listaSimple(doc, snapshot.familias, (familia) => (
    `${familia.responsable} - ${familia.miembros} integrante(s) - Prioridad ${familia.prioridad} - ${familia.ubicacion.direccion}`
  ));
};

const agregarObras = (doc, snapshot) => {
  tituloSeccion(doc, 'Avance de obras');
  listaSimple(doc, snapshot.obras, (obra) => (
    `${obra.nombre} - Estado: ${obra.estado} - Ubicacion: ${obra.direccion} - Registrada: ${fechaLegible(obra.fecha_creacion)}`
  ));
};

const agregarHerramientas = (doc, snapshot) => {
  tituloSeccion(doc, 'Balance de herramientas');
  if (snapshot.cuadrillas.length === 0) {
    listaSimple(doc, [], () => '');
    return;
  }
  for (const cuadrilla of snapshot.cuadrillas) {
    const b = cuadrilla.balance_herramientas;
    asegurarEspacio(doc, 45);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR_PRIMARIO).text(cuadrilla.nombre);
    doc.font('Helvetica').fontSize(9).fillColor(COLOR_TEXTO).text(
      `Total: ${b.total} | Buenas: ${b.buenas} | Danadas: ${b.danadas} | Perdidas: ${b.perdidas} | No devueltas: ${b.no_devueltas}`,
    );
    doc.moveDown(0.4);
  }
};

const agregarIncidentes = async (doc, snapshot) => {
  tituloSeccion(doc, 'Incidentes y alertas');
  if (snapshot.incidentes.length === 0) {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor('#637381').text('Sin incidentes registrados.');
    return;
  }
  for (const incidente of snapshot.incidentes) {
    asegurarEspacio(doc, 40);
    doc.font('Helvetica').fontSize(9).fillColor(COLOR_TEXTO);
    doc.text(`- ${fechaLegible(incidente.fecha)} — Cuadrilla #${incidente.cuadrilla_id}`, { indent: 8 });
    doc.font('Helvetica-Oblique').fontSize(8).fillColor('#637381')
      .text(`  Reportado por: ${incidente.remitente}`, { indent: 8 });
    doc.font('Helvetica').fontSize(9).fillColor(COLOR_TEXTO)
      .text(`  ${incidente.descripcion}`, { indent: 8, paragraphGap: 2 });
    if (incidente.archivo_url) {
      await agregarFoto(doc, incidente.archivo_url);
    }
  }
};

const agregarAdvertencias = (doc, snapshot) => {
  tituloSeccion(doc, 'Advertencias al generar');
  if (snapshot.advertencias.length === 0) {
    doc.font('Helvetica').fontSize(9).fillColor('#287A4B').text('No se detectaron advertencias.');
    return;
  }
  doc.fillColor(COLOR_ALERTA);
  listaSimple(doc, snapshot.advertencias, (advertencia) => advertencia.descripcion);
};

const agregarEncabezadosYPies = (doc, snapshot) => {
  const rango = doc.bufferedPageRange();
  for (let indice = 0; indice < rango.count; indice += 1) {
    doc.switchToPage(rango.start + indice);
    if (indice > 0) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR_PRIMARIO)
        .text('TECHO Chile - Reporte de emergencia', 54, 28, { width: 487, lineBreak: false });
      doc.moveTo(54, 43).lineTo(541, 43).lineWidth(0.5).strokeColor('#C9D8E0').stroke();
    }
    const margenInferior = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(8).fillColor('#738793')
      .text(
        `${snapshot.emergencia.nombre} | Pagina ${indice + 1} de ${rango.count}`,
        54,
        doc.page.height - 34,
        { width: 487, align: 'center', lineBreak: false },
      );
    doc.page.margins.bottom = margenInferior;
  }
};

export const generarPdfReporte = async (snapshot, rutaArchivo) => {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 58, right: 54, bottom: 54, left: 54 },
    bufferPages: true,
    info: {
      Title: `Reporte de emergencia - ${snapshot.emergencia.nombre}`,
      Author: 'TECHO Chile',
      Subject: 'Consolidado operativo de emergencia',
    },
  });

  return new Promise((resolve, reject) => {
    const salida = createWriteStream(rutaArchivo, { flags: 'wx' });
    salida.on('finish', () => resolve(rutaArchivo));
    salida.on('error', reject);
    doc.on('error', reject);
    doc.pipe(salida);

    (async () => {
      try {
        await agregarPortada(doc, snapshot);
        await agregarResumen(doc, snapshot);
        await agregarCuadrillas(doc, snapshot);
        await agregarFamilias(doc, snapshot);
        await agregarObras(doc, snapshot);
        await agregarHerramientas(doc, snapshot);
        await agregarIncidentes(doc, snapshot);
        await agregarAdvertencias(doc, snapshot);
        agregarEncabezadosYPies(doc, snapshot);
        doc.end();
      } catch (err) {
        reject(err);
      }
    })();
  });
};
