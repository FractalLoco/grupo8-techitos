'use strict';
import AppDataSource from '../config/database.js';

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
