'use strict';

// DTO de login: encapsula los datos que el usuario envía para iniciar sesión.
// Lo uso para mantener tipado consistente antes de pasarlos al servicio de autenticación.
export class LoginDTO {
  constructor(rut, contrasena) {
    this.rut = rut;
    this.contrasena = contrasena;
  }

  // Extraigo el RUT y la contraseña directamente del cuerpo de la solicitud HTTP
  static fromRequest(body) {
    return new LoginDTO(body.rut, body.contrasena);
  }
}
