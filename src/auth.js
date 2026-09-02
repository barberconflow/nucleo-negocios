// Quién entró: el correo de la sesión contra la tabla `usuarios`.
//
// Esto es solo separación de INTERFAZ (qué pestañas se pintan). La separación
// de verdad —qué puede leer y escribir cada quien— la hacen las políticas RLS
// en la base de cada negocio.

// Devuelve la fila de `usuarios` que corresponde al correo, o null si no
// tiene acceso. Ignora mayúsculas y espacios, y a los usuarios inactivos.
export function resolverUsuario(usuarios, correo) {
  const c = String(correo || "").trim().toLowerCase();
  if (!c) return null;
  return (usuarios || []).find(
    u => String(u.email || "").trim().toLowerCase() === c && u.activo
  ) || null;
}
