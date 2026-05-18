import { useEffect, useState, useContext } from "react";
import {
  obtenerUsuarios,
  crearUsuario,
  activarUsuario,
  desactivarUsuario,
} from "../services/usuarioService";

import { AuthContext } from "../context/AuthContext";

const GestionUsuarios = () => {
  const { usuario } = useContext(AuthContext);

  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    nombreCompleto: "",
    rut: "",
    correo: "",
    rol: "voluntario",
  });

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      const response = await obtenerUsuarios();

      // Ajusta según tu backend
      setUsuarios(response.data || []);
    } catch (err) {
      console.error(err);
      setError("Error al cargar usuarios");
    }
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await crearUsuario(form);

      setForm({
        nombreCompleto: "",
        rut: "",
        correo: "",
        rol: "voluntario",
      });

      cargarUsuarios();
    } catch (err) {
      console.error(err);
      setError("Error al crear usuario");
    }
  };

  const activar = async (id) => {
    try {
      await activarUsuario(id);
      cargarUsuarios();
    } catch (err) {
      console.error(err);
    }
  };

  const desactivar = async (id) => {
    try {
      await desactivarUsuario(id);
      cargarUsuarios();
    } catch (err) {
      console.error(err);
    }
  };

  // Protección segura
  if (!usuario) {
    return <p>Cargando...</p>;
  }

  if (usuario.rol !== "coordinador") {
    return <p>No autorizado</p>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Gestión de Usuarios</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
        <input
          type="text"
          name="nombreCompleto"
          placeholder="Nombre completo"
          value={form.nombreCompleto}
          onChange={handleChange}
          required
        />

        <input
          type="text"
          name="rut"
          placeholder="RUT"
          value={form.rut}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="correo"
          placeholder="Correo"
          value={form.correo}
          onChange={handleChange}
          required
        />

        <select
          name="rol"
          value={form.rol}
          onChange={handleChange}
        >
          <option value="coordinador">Coordinador</option>
          <option value="jefe_cuadrilla">Jefe de cuadrilla</option>
          <option value="voluntario">Voluntario</option>
        </select>

        <button type="submit">
          Crear Usuario
        </button>
      </form>

      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {usuarios?.map((u) => (
            <tr key={u.id}>
              <td>{u.nombreCompleto}</td>
              <td>{u.correo}</td>
              <td>{u.rol}</td>

              <td>
                {u.activo ? "Activo" : "Desactivado"}
              </td>

              <td>
                {u.activo ? (
                  <button onClick={() => desactivar(u.id)}>
                    Desactivar
                  </button>
                ) : (
                  <button onClick={() => activar(u.id)}>
                    Activar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default GestionUsuarios;
