async function run() {
  const loginRes = await fetch('http://localhost:3000/api/auth/iniciar-sesion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rut: '12345678-9', contrasena: 'admin123' }),
  });

  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    console.error('Login failed', loginRes.status, loginData);
    process.exit(1);
  }

  const token = loginData.data?.token || loginData.token || loginData.accessToken;
  if (!token) {
    console.error('Token no encontrado', loginData);
    process.exit(1);
  }

  const emergenciaRes = await fetch('http://localhost:3000/api/emergencias', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      nombre: 'Emergencia de prueba',
      descripcion: 'Emergencia creada por asistente',
      lat: -33.45,
      lng: -70.66,
    }),
  });

  const emergenciaData = await emergenciaRes.json();
  console.log('CREATE status', emergenciaRes.status, JSON.stringify(emergenciaData, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
