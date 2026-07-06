'use strict';
import AppDataSource from '../config/database.js';


export class HerramientaRepository {
  static getRepository() {
    return AppDataSource.getRepository('Herramienta');
  }

  // Registro una herramienta nueva asociándola a la cuadrilla que la recibe
  // datos puede incluir tipo_item (herramienta | epp | material | otro)
  static async registrar(datos) {
    const repo = this.getRepository();
    const herramienta = repo.create(datos);
    return repo.save(herramienta);
  }

  // Listo todas las herramientas asignadas a una cuadrilla para su revisión o inventario
  static async listarPorCuadrilla(cuadrillaId) {
    return this.getRepository().find({ where: { cuadrilla_id: cuadrillaId } });
  }

  // Actualizo el estado de una herramienta y agrego observaciones si las hay
  static async actualizarEstado(id, estado, observaciones = null) {
    const repo = this.getRepository();
    await repo.update(id, { estado, observaciones });
    return this.getRepository().findOne({ where: { id } });
  }

  // Genero el balance de herramientas de una cuadrilla agrupando por estado.
  // Marco 'conDiferencias' si hay herramientas dañadas, perdidas o no devueltas para alertar al coordinador.
  static async generarBalance(cuadrillaId) {
    const herramientas = await this.listarPorCuadrilla(cuadrillaId);
    const balance = {
      total: herramientas.length,
      entregadas: herramientas.filter((h) => h.estado === 'entregada').length,
      buenas: herramientas.filter((h) => h.estado === 'buena').length,
      danadas: herramientas.filter((h) => h.estado === 'danada').length,
      perdidas: herramientas.filter((h) => h.estado === 'perdida').length,
      noDevueltas: herramientas.filter((h) => h.estado === 'no_devuelta').length,
      conDiferencias: false,
    };
    balance.conDiferencias = balance.danadas + balance.perdidas + balance.noDevueltas + balance.entregadas > 0;
    return balance;
  }

  // Genero un resumen de herramientas agrupado por cuadrilla para toda una emergencia.
  // Permite al coordinador ver el inventario global sin consultar cuadrilla por cuadrilla.
  static async inventarioTotal() {
    const cuadrillas = await AppDataSource.getRepository('Cuadrilla').find();
    const totales = { total: 0, entregadas: 0, buenas: 0, danadas: 0, perdidas: 0, no_devueltas: 0 };
    const resumen = [];

    for (const cuadrilla of cuadrillas) {
      const herramientas = await this.listarPorCuadrilla(cuadrilla.id);
      if (herramientas.length === 0) continue;
      const entrada = {
        cuadrilla_id: cuadrilla.id,
        cuadrilla_nombre: cuadrilla.nombre,
        total: herramientas.length,
        entregadas:   herramientas.filter((h) => h.estado === 'entregada').length,
        buenas:       herramientas.filter((h) => h.estado === 'buena').length,
        danadas:      herramientas.filter((h) => h.estado === 'danada').length,
        perdidas:     herramientas.filter((h) => h.estado === 'perdida').length,
        no_devueltas: herramientas.filter((h) => h.estado === 'no_devuelta').length,
      };
      entrada.con_diferencias = entrada.danadas + entrada.perdidas + entrada.no_devueltas > 0;
      totales.total        += entrada.total;
      totales.entregadas   += entrada.entregadas;
      totales.buenas       += entrada.buenas;
      totales.danadas      += entrada.danadas;
      totales.perdidas     += entrada.perdidas;
      totales.no_devueltas += entrada.no_devueltas;
      resumen.push(entrada);
    }

    return { resumen, totales };
  }

  // Devuelvo el catálogo completo agrupado por nombre y tipo_item.
  // Cada entrada tiene los conteos por estado para que el coordinador vea el inventario global.
  static async catalogoInventario() {
    const herramientas = await this.getRepository().find();
    const movimientos = await AppDataSource.getRepository('MovimientoHerramienta').find();

    // Agrupa por nombre (normalizado) + tipo_item. Cada ítem combina dos fuentes:
    // - tabla herramientas: estado de lo asignado a cuadrillas (buenas, dañadas, etc.)
    // - tabla movimientos: stock del almacén (entrada_stock) y lo que está en préstamo (salida activa)
    const mapaItems = {};
    const asegurarItem = (nombre, tipoItem) => {
      const tipo = tipoItem || 'herramienta';
      const key = `${nombre.toLowerCase()}__${tipo}`;
      if (!mapaItems[key]) {
        mapaItems[key] = {
          nombre,
          tipo_item: tipo,
          total: 0,
          entregadas: 0,
          buenas: 0,
          danadas: 0,
          perdidas: 0,
          no_devueltas: 0,
          stock_almacen: 0,
          en_prestamo: 0,
          disponible: 0,
        };
      }
      return mapaItems[key];
    };

    for (const h of herramientas) {
      const item = asegurarItem(h.nombre, h.tipo_item);
      item.total += 1;
      if (h.estado === 'entregada')   item.entregadas += 1;
      if (h.estado === 'buena')       item.buenas += 1;
      if (h.estado === 'danada')      item.danadas += 1;
      if (h.estado === 'perdida')     item.perdidas += 1;
      if (h.estado === 'no_devuelta') item.no_devueltas += 1;
    }

    for (const m of movimientos) {
      const item = asegurarItem(m.nombre_item, m.tipo_item);
      const cant = Number(m.cantidad) || 1;
      if (m.tipo_movimiento === 'entrada_stock') item.stock_almacen += cant;
      else if (m.tipo_movimiento === 'salida' && m.estado === 'activo') item.en_prestamo += cant;
    }

    // Disponible = lo que hay en el almacén menos lo que está prestado.
    for (const item of Object.values(mapaItems)) {
      item.disponible = Math.max(0, item.stock_almacen - item.en_prestamo);
    }

    const catalogo = Object.values(mapaItems).sort((a, b) =>
      a.tipo_item.localeCompare(b.tipo_item) || a.nombre.localeCompare(b.nombre)
    );

    // Resumen por tipo para las tarjetas de la UI
    const porTipo = {};
    for (const item of catalogo) {
      if (!porTipo[item.tipo_item]) {
        porTipo[item.tipo_item] = {
          total: 0, buenas: 0, danadas: 0, perdidas: 0, no_devueltas: 0,
          stock_almacen: 0, en_prestamo: 0, disponible: 0,
        };
      }
      porTipo[item.tipo_item].total         += item.total;
      porTipo[item.tipo_item].buenas        += item.buenas;
      porTipo[item.tipo_item].danadas       += item.danadas;
      porTipo[item.tipo_item].perdidas      += item.perdidas;
      porTipo[item.tipo_item].no_devueltas  += item.no_devueltas;
      porTipo[item.tipo_item].stock_almacen += item.stock_almacen;
      porTipo[item.tipo_item].en_prestamo   += item.en_prestamo;
      porTipo[item.tipo_item].disponible    += item.disponible;
    }

    return { catalogo, porTipo };
  }

  static async resumenPorEmergencia(emergenciaId) {
    const cuadrillas = await AppDataSource.getRepository('Cuadrilla').find({
      where: { emergencia_id: emergenciaId },
    });

    const totales = { total: 0, entregadas: 0, buenas: 0, danadas: 0, perdidas: 0, no_devueltas: 0 };
    const resumen = [];

    for (const cuadrilla of cuadrillas) {
      const herramientas = await this.listarPorCuadrilla(cuadrilla.id);
      const entrada = {
        cuadrilla_id: cuadrilla.id,
        cuadrilla_nombre: cuadrilla.nombre,
        total: herramientas.length,
        entregadas: herramientas.filter((h) => h.estado === 'entregada').length,
        buenas: herramientas.filter((h) => h.estado === 'buena').length,
        danadas: herramientas.filter((h) => h.estado === 'danada').length,
        perdidas: herramientas.filter((h) => h.estado === 'perdida').length,
        no_devueltas: herramientas.filter((h) => h.estado === 'no_devuelta').length,
      };
      entrada.con_diferencias = entrada.danadas + entrada.perdidas + entrada.no_devueltas > 0;

      totales.total += entrada.total;
      totales.entregadas += entrada.entregadas;
      totales.buenas += entrada.buenas;
      totales.danadas += entrada.danadas;
      totales.perdidas += entrada.perdidas;
      totales.no_devueltas += entrada.no_devueltas;

      resumen.push(entrada);
    }

    return { resumen, totales };
  }
}
