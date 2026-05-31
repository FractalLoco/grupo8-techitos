'use strict';

// DTO de respuesta de usuario: filtra los campos que puedo enviar al cliente.
// Lo uso para asegurarme de que la contraseña y otros datos internos nunca lleguen al frontend.
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
