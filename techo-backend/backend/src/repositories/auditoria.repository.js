'use strict';
import AppDataSource from '../config/database.js';

function esFechaIsoValida(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(valor || ''));
}

export class AuditoriaRepository {
  static getRepository() {
    return AppDataSource.getRepository('Auditoria');
  }

  static async crear(datos) {
    const repo = this.getRepository();
    return repo.save(repo.create(datos));
  }

  static async listar({
    modulo = 'todos',
    accion = 'todos',
    busqueda = '',
    fechaDesde = '',
    fechaHasta = '',
    pagina = 1,
    limite = 20,
  } = {}) {
    const paginaSegura = Math.max(1, Number(pagina) || 1);
    const limiteSeguro = Math.min(100, Math.max(1, Number(limite) || 20));

    const consulta = this.getRepository()
      .createQueryBuilder('auditoria')
      .orderBy('auditoria.creado_en', 'DESC')
      .addOrderBy('auditoria.id', 'DESC');

    if (modulo && modulo !== 'todos') {
      consulta.andWhere('auditoria.modulo = :modulo', { modulo });
    }

    if (accion && accion !== 'todos') {
      consulta.andWhere('auditoria.accion = :accion', { accion });
    }

    const texto = String(busqueda || '').trim().toLowerCase();
    if (texto) {
      consulta.andWhere(
        `(
          LOWER(COALESCE(auditoria.entidad_nombre, '')) LIKE :texto OR
          LOWER(COALESCE(auditoria.actor_nombre, '')) LIKE :texto OR
          LOWER(COALESCE(auditoria.actor_rol, '')) LIKE :texto OR
          LOWER(COALESCE(auditoria.descripcion, '')) LIKE :texto OR
          LOWER(COALESCE(auditoria.accion, '')) LIKE :texto
        )`,
        { texto: `%${texto}%` }
      );
    }

    // Interpreta el rango como días civiles de Chile. De esta forma el filtro
    // respeta automáticamente horario de invierno/verano de America/Santiago.
    if (esFechaIsoValida(fechaDesde)) {
      consulta.andWhere(
        `auditoria.creado_en >= ((:fechaDesde || ' 00:00:00')::timestamp AT TIME ZONE 'America/Santiago')`,
        { fechaDesde }
      );
    }

    if (esFechaIsoValida(fechaHasta)) {
      consulta.andWhere(
        `auditoria.creado_en < (((:fechaHasta || ' 00:00:00')::timestamp AT TIME ZONE 'America/Santiago') + INTERVAL '1 day')`,
        { fechaHasta }
      );
    }

    consulta
      .skip((paginaSegura - 1) * limiteSeguro)
      .take(limiteSeguro);

    const [auditorias, total] = await consulta.getManyAndCount();

    return {
      auditorias,
      total,
      pagina: paginaSegura,
      limite: limiteSeguro,
      totalPaginas: Math.max(1, Math.ceil(total / limiteSeguro)),
    };
  }

  static async listarAcciones() {
    const filas = await this.getRepository()
      .createQueryBuilder('auditoria')
      .select('DISTINCT auditoria.accion', 'accion')
      .orderBy('auditoria.accion', 'ASC')
      .getRawMany();

    return filas.map((fila) => fila.accion).filter(Boolean);
  }
}
