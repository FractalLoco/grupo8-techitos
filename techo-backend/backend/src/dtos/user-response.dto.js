'use strict';


export class UserResponseDTO {
  constructor(usuario) {
    this.id = usuario.id;
    this.nombre = usuario.nombre;
    this.rut = usuario.rut;
    this.correo = usuario.correo;
    this.rol = usuario.rol;
    this.activo = usuario.activo;
  }

  // Método de fábrica que acepta la entidad completa y devuelve solo lo necesario para el cliente
  static fromEntity(usuario) {
    return new UserResponseDTO(usuario);
  }
}
