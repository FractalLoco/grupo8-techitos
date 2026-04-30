const express = require("express");
const enrutador = express.Router();

const verificarToken = require("../middleware/verificarToken");
const verificarRol = require("../middleware/verificarRol");

const {
  crearUsuario,
  listarUsuarios,
  buscarPorId,
  actualizarUsuario,
  eliminarUsuario,
  cambiarEstadoActivo,
  desactivarUsuario,
} = require("../models/usuarioModel");

enrutador.post(
  "/usuarios",
  verificarToken,
  verificarRol("coordinador"),
  async (req, res) => {
    try {
      const { nombre, rut, correo, password, rol } = req.body;

      const usuario = await crearUsuario(nombre, rut, correo, password, rol);

      res.status(201).json({
        mensaje: "Usuario creado correctamente (requiere activación)",
        usuario,
      });
    } catch (error) {
      res.status(500).json({
        mensaje: "Error al crear usuario",
        error: error.message,
      });
    }
  },
);

enrutador.get("/usuarios", verificarToken, async (req, res) => {
  try {
    const usuarios = await listarUsuarios();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al listar usuarios",
      error: error.message,
    });
  }
});

enrutador.get("/usuarios/:id", verificarToken, async (req, res) => {
  try {
    const usuario = await obtenerUsuarioPorId(req.params.id);

    if (!usuario) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado",
      });
    }

    res.json(usuario);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al obtener usuario",
      error: error.message,
    });
  }
});

enrutador.patch(
  "/usuarios/:id",
  verificarToken,
  verificarRol("coordinador"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, correo, rol } = req.body;

      const usuario = await actualizarUsuario(id, nombre, correo, rol);

      if (!usuario) {
        return res.status(404).json({
          mensaje: "Usuario no encontrado",
        });
      }

      res.json({
        mensaje: "Usuario actualizado correctamente",
        usuario,
      });
    } catch (error) {
      res.status(500).json({
        mensaje: "Error al actualizar usuario",
        error: error.message,
      });
    }
  },
);

enrutador.delete(
  "/usuarios/:id",
  verificarToken,
  verificarRol("coordinador"),
  async (req, res) => {
    try {
      const usuario = await eliminarUsuario(req.params.id);

      if (!usuario) {
        return res.status(404).json({
          mensaje: "Usuario no encontrado",
        });
      }

      res.json({
        mensaje: "Usuario eliminado definitivamente",
        usuario,
      });
    } catch (error) {
      res.status(500).json({
        mensaje: "Error al eliminar usuario",
        error: error.message,
      });
    }
  },
);

enrutador.patch(
  "/usuarios/:id/desactivar",
  verificarToken,
  verificarRol("coordinador"),
  async (req, res) => {
    try {
      const usuario = await desactivarUsuario(req.params.id);

      if (!usuario) {
        return res.status(404).json({
          mensaje: "Usuario no encontrado",
        });
      }

      res.json({
        mensaje: "Usuario desactivado correctamente",
        usuario,
      });
    } catch (error) {
      res.status(500).json({
        mensaje: "Error al desactivar usuario",
        error: error.message,
      });
    }
  },
);

enrutador.patch(
  "/usuarios/:id/estado",
  verificarToken,
  verificarRol("coordinador"),
  async (req, res) => {
    try {
      const { activo } = req.body;

      const usuario = await cambiarEstadoActivo(req.params.id, activo);

      if (!usuario) {
        return res.status(404).json({
          mensaje: "Usuario no encontrado",
        });
      }

      res.json({
        mensaje: `Usuario ${activo ? "activado" : "desactivado"} correctamente`,
        usuario,
      });
    } catch (error) {
      res.status(500).json({
        mensaje: "Error al cambiar estado",
        error: error.message,
      });
    }
  },
);

module.exports = enrutador;
