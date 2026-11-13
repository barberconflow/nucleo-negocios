import { describe, it, expect } from "vitest";
import {
  ahoraEn, tocaHoy, describirCalendario, motivoTope, venceBeneficio, fechaParaCliente, textoLoopy, decidirReporte,
} from "./marketing.js";

// Zona de prueba sin horario de verano (UTC-5 todo el año).
const ZONA = "America/Cancun";
// 20 oct 2026 es martes. 15:00 UTC = 10:00 en UTC-5.
const martes10 = new Date("2026-10-20T15:00:00Z");

describe("ahoraEn", () => {
  it("usa la hora de la zona, no la de UTC", () => {
    expect(ahoraEn(ZONA, new Date("2026-10-21T02:30:00Z"))).toMatchObject({ fecha: "2026-10-20", dow: 2, hora: 21, minuto: 30 });
  });
  it("semana ISO", () => {
    expect(ahoraEn(ZONA, martes10).semana).toBe(43);
    expect(ahoraEn(ZONA, new Date("2027-01-01T18:00:00Z")).semana).toBe(53);
  });
});

describe("tocaHoy: una campaña manda solo en su calendario", () => {
  const a = ahoraEn(ZONA, martes10);
  it("sin días = todos los días, dentro del horario", () => {
    expect(tocaHoy({ hora_desde: 10, hora_hasta: 20 }, a)).toBe(true);
    expect(tocaHoy({ hora_desde: 11, hora_hasta: 20 }, a)).toBe(false);
  });
  it("solo los días elegidos", () => {
    expect(tocaHoy({ dias_semana: [2], hora_desde: 10, hora_hasta: 20 }, a)).toBe(true);
    expect(tocaHoy({ dias_semana: [1], hora_desde: 10, hora_hasta: 20 }, a)).toBe(false);
  });
  it("cada 2 semanas: solo semanas pares", () => {
    expect(tocaHoy({ dias_semana: [2], cada_semanas: 2, hora_desde: 10 }, a)).toBe(false); // semana 43
    expect(tocaHoy({ dias_semana: [2], cada_semanas: 2, hora_desde: 10 }, ahoraEn(ZONA, new Date("2026-10-27T15:00:00Z")))).toBe(true);
  });
  it("describe el calendario", () => {
    expect(describirCalendario({ dias_semana: [1], cada_semanas: 2, hora_desde: 12, hora_hasta: 20 })).toBe("lun · cada 2 semanas · 12–20 h");
  });
});

describe("motivoTope: 1 al día y 2 por semana, sumando canales", () => {
  const op = { zona: ZONA };
  it("nada recibido: pasa", () => {
    expect(motivoTope([], op, martes10)).toBeNull();
  });
  it("ya recibió uno hoy (día de la zona)", () => {
    expect(motivoTope(["2026-10-20T13:30:00Z"], op, martes10)).toMatch(/hoy/);
  });
  it("uno ayer a las 23:00 de la zona no cuenta como hoy", () => {
    expect(motivoTope(["2026-10-20T04:00:00Z"], op, martes10)).toBeNull();
  });
  it("dos en la semana: ya no", () => {
    expect(motivoTope(["2026-10-15T16:00:00Z", "2026-10-18T16:00:00Z"], op, martes10)).toMatch(/2 esta semana/);
  });
  it("lo de hace más de 7 días no cuenta", () => {
    expect(motivoTope(["2026-10-01T16:00:00Z", "2026-10-02T16:00:00Z"], op, martes10)).toBeNull();
  });
  it("los topes se configuran por negocio", () => {
    expect(motivoTope(["2026-10-20T13:30:00Z"], { ...op, diario: 2 }, martes10)).toBeNull();
  });
});

describe("beneficios de las olas", () => {
  it("vence contando desde la última visita", () => {
    expect(venceBeneficio("2026-10-15", 15)).toBe("2026-10-30");
    expect(venceBeneficio("2026-10-20T20:00:00+00:00", 15)).toBe("2026-11-04");
    expect(venceBeneficio(null, 15)).toBeNull();
  });
  it("la fecha se le dice al cliente en palabras, o 'hoy'", () => {
    expect(fechaParaCliente("2026-11-04", "2026-10-22")).toBe("4 de noviembre");
    expect(fechaParaCliente("2026-10-22", "2026-10-22")).toBe("hoy");
    expect(fechaParaCliente(null, "2026-10-22")).toBe("");
  });
});

describe("textoLoopy: el texto de la tarjeta", () => {
  it("rellena nombre, faltan y estampas", () => {
    expect(textoLoopy("{nombre}, te faltan {faltan} para tu premio ({estampas} de 10)", { nombre: "Ana López", estampas: 8 }))
      .toBe("Ana, te faltan 2 para tu premio (8 de 10)");
  });
  it("sin nombre quita la coma y pone mayúscula", () => {
    expect(textoLoopy("{nombre}, te faltan {faltan}", { nombre: "", estampas: 8 })).toBe("Te faltan 2");
    expect(textoLoopy("{nombre}, hola", { nombre: "Sin nombre" })).toBe("Hola");
  });
  it("las estampas guardadas cuentan si son más que las de la tarjeta", () => {
    expect(textoLoopy("llevas {estampas}", { estampas: 1, pendientes: 3 })).toBe("Llevas 3");
  });
  it("{vence} y {faltan} nunca bajan de cero", () => {
    expect(textoLoopy("vale hasta el {vence}, faltan {faltan}", { estampas: 12, meta: 10, vence: "hoy" })).toBe("Vale hasta el hoy, faltan 0");
  });
});

describe("decidirReporte: cuándo sale el reporte de la noche", () => {
  it("si ya salió hoy, no vuelve a salir", () => {
    expect(decidirReporte({ yaSalio: true, hora: 22 })).toEqual({ mandar: false, motivo: "ya salió hoy" });
  });
  it("con servicios abiertos espera", () => {
    expect(decidirReporte({ abiertos: 2, hora: 21, minuto: 0 }).mandar).toBe(false);
    expect(decidirReporte({ abiertos: 2, hora: 21, minuto: 0 }).motivo).toBe("2 servicio(s) abierto(s)");
  });
  it("sin nada abierto sale sin aviso", () => {
    expect(decidirReporte({ abiertos: 0, hora: 21 })).toEqual({ mandar: true, conAviso: false });
  });
  it("en el último intento sale aunque queden abiertos, con aviso", () => {
    expect(decidirReporte({ abiertos: 1, hora: 23, minuto: 45 })).toEqual({ mandar: true, conAviso: true });
    expect(decidirReporte({ abiertos: 1, hora: 22, minuto: 45, ultimoIntento: { hora: 22, minuto: 45 } })).toEqual({ mandar: true, conAviso: true });
    expect(decidirReporte({ abiertos: 1, hora: 22, minuto: 30, ultimoIntento: { hora: 22, minuto: 45 } }).mandar).toBe(false);
  });
});
