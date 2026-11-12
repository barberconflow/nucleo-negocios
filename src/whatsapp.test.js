import { describe, it, expect } from "vitest";
import { intencionBaja } from "./whatsapp.js";

describe("BAJA y ALTA por WhatsApp", () => {
  it("BAJA sola se reconoce, en cualquier forma", () => {
    for (const t of ["BAJA", "baja", " Baja. ", "STOP", "No más", "NO MAS!!", "darme de baja", "Unsubscribe"]) {
      expect(intencionBaja(t)).toBe("baja");
    }
  });

  it("ALTA la deshace", () => {
    expect(intencionBaja("Alta")).toBe("alta");
    expect(intencionBaja("ALTA 🙌")).toBe("alta");
    expect(intencionBaja("start")).toBe("alta");
  });

  it("un código de confirmación con 'baja' en medio no es una baja", () => {
    expect(intencionBaja("Confirmo mi lavado — si no envío esto, pierdo mi lugar 💦 (código BAJA1)")).toBe(null);
    expect(intencionBaja("baja (código A1B2C)")).toBe(null);
  });

  it("no confunde frases normales con una baja", () => {
    for (const t of ["no puedo ir, doy de baja mi cita", "bajas hoy?", "hola", "", null, undefined, "no", "más tarde", "alta calidad"]) {
      expect(intencionBaja(t)).toBe(null);
    }
  });
});
