'use strict';
import AppDataSource from '../config/database.js';

export class UsuarioRepository {
  // Obtengo el repositorio de TypeORM cada vez que lo necesito para asegurarme de usar la conexión activa
  static getRepository() {
    return AppDataSource.getRepository('Usuario');
  }

  // Busco un usuario por su RUT, que es el identificador de inicio de sesión en el sistema
  static async buscarPorRut(rut) {
    return this.getRepository().findOne({ where: { rut } });
  }

  // Busco un usuario por correo, lo uso para validar duplicados al registrar
  static async buscarPorCorreo(correo) {
    return this.getRepository().findOne({ where: { correo } });
  }

  // Busco un usuario por ID excluyendo la contraseña de la respuesta por seguridad
  static async buscarPorId(id) {
    return this.getRepository().findOne({
      where: { id },
      select: ['id', 'nombre', 'rut', 'correo', 'rol', 'activo', 'creado_en'],
    });
  }

  // Creo y guardo un nuevo usuario en la base de datos
  static async crear(datos) {
    const repo = this.getRepository();
    const usuario = repo.create(datos);
    return repo.save(usuario);
  }

  // Listo usuarios con paginación para no sobrecargar la respuesta en volúmenes grandes
  static async listar({ limite = 50, pagina = 1 } = {}) {
    const desplazamiento = (pagina - 1) * limite;
    return this.getRepository().find({
      skip: desplazamiento,
      take: limite,
      order: { creado_en: 'DESC' },
      select: ['id', 'nombre', 'rut', 'correo', 'rol', 'activo', 'creado_en'],
    });
  }

  // Cuento el total de usuarios registrados, útil para calcular páginas en el frontend
  static async contar() {
    return this.getRepository().count();
  }

  // Actualizo los datos de un usuario y devuelvo el registro actualizado sin la contraseña
  static async actualizar(id, datos) {
    const repo = this.getRepository();
    await repo.update(id, datos);
    return this.buscarPorId(id);
  }

  // Reemplazo la contraseña almacenada por un nuevo hash generado con bcrypt
  static async cambiarContrasena(id, nuevoHash) {
    const repo = this.getRepository();
    await repo.update(id, { contrasena: nuevoHash });
    return this.buscarPorId(id);
  }

  // Activo o desactivo la cuenta de un usuario; el coordinador usa esto para habilitar nuevos registros
  static async cambiarEstadoActivo(id, activo) {
    const repo = this.getRepository();
    await repo.update(id, { activo });
    return this.buscarPorId(id);
  }

  // Elimino el usuario solo si existe; devuelvo sus datos antes de borrarlo por si se necesitan
  static async eliminar(id) {
    const repo = this.getRepository();
    const usuario = await this.buscarPorId(id);
    if (usuario) {
      await repo.delete(id);
    }
    return usuario;
  }

  // Filtro usuarios por rol, útil para listar solo coordinadores, jefes o voluntarios
  static async buscarPorRol(rol) {
    return this.getRepository().find({
      where: { rol },
      order: { nombre: 'ASC' },
      select: ['id', 'nombre', 'rut', 'correo', 'rol', 'activo'],
    });
  }

  // Devuelvo los voluntarios activos que aún no están asignados a ninguna cuadrilla
  static async buscarDisponibles() {
    return this.getRepository().find({
      where: { rol: 'voluntario', activo: true },
      select: ['id', 'nombre', 'rut', 'correo'],
    });
  }
}
