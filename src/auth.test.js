import { describe, it, expect } from "vitest";
import { resolverUsuario } from "./auth.js";

const usuarios = [
  { email: "dueno@negocio.mx", nombre: "Dueño", rol: "admin", activo: true },
  { email: "Encargada@Negocio.MX", nombre: "Encargada", rol: "encargado", activo: true },
  { email: "exempleado@negocio.mx", nombre: "Ex", rol: "empleado", activo: false },
];

describe("resolverUsuario", () => {
  it("encuentra al usuario por su correo", () => {
    expect(resolverUsuario(usuarios, "dueno@negocio.mx")?.rol).toBe("admin");
  });
  it("ignora mayúsculas y espacios en ambos lados", () => {
    expect(resolverUsuario(usuarios, "  encargada@negocio.mx ")?.rol).toBe("encargado");
  });
  it("un usuario desactivado ya no entra", () => {
    expect(resolverUsuario(usuarios, "exempleado@negocio.mx")).toBeNull();
  });
  it("sin correo o sin lista no revienta: null", () => {
    expect(resolverUsuario(usuarios, "")).toBeNull();
    expect(resolverUsuario(null, "dueno@negocio.mx")).toBeNull();
  });
});
