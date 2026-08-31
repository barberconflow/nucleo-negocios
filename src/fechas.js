// Helpers de fecha y formato, comunes a cualquier negocio.
// Todos aceptan una fecha explícita para poder probarlos sin depender de hoy.

export const hoy = () => new Date();

export const inicioDia = (d = hoy()) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };

export const inicioSemana = (d = hoy()) => { const x = inicioDia(d); const dia = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dia); return x; };

export const inicioMes = (d = hoy()) => { const x = inicioDia(d); x.setDate(1); return x; };

// La configuración regional por defecto es México, que es donde están los tres
// negocios. Se cambia por negocio, no se toca este archivo.
export const LOCALE_POR_DEFECTO = "es-MX";

export const fmt = (n, locale = LOCALE_POR_DEFECTO) =>
  "$" + Number(n || 0).toLocaleString(locale, { maximumFractionDigits: 0 });

export const fmtFecha = (iso, locale = LOCALE_POR_DEFECTO) =>
  new Date(iso).toLocaleDateString(locale, {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
