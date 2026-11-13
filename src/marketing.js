// =============================================
// REGLAS PURAS DEL MARKETING AUTOMÁTICO. Sin red ni base: se prueban en
// marketing.test.js. Las usa la app de cada negocio al mandar campañas.
//
//   ahoraEn              fecha, día de la semana, hora y semana ISO en una zona
//   tocaHoy              ¿esta campaña puede mandar en este momento? (calendario)
//   describirCalendario  el calendario de una campaña en palabras
//   motivoTope           ¿esta persona ya recibió suficiente marketing? (N/día, M/semana)
//   venceBeneficio       hasta cuándo vale la promo, contando desde la última visita
//   fechaParaCliente     "2026-10-30" → "30 de octubre" (u "hoy")
//   textoLoopy           el texto de una notificación a la tarjeta, con {nombre} etc.
//
// Todo recibe la zona horaria como dato: cada negocio pone la suya.
// =============================================

export const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export function ahoraEn(zona, d = new Date()) {
  const partes = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(d).map(p => [p.type, p.value]));
  const fecha = `${partes.year}-${partes.month}-${partes.day}`;
  const dia = new Date(`${fecha}T12:00:00Z`);
  const dow = dia.getUTCDay();
  // Semana ISO: la del jueves de esta semana.
  const jueves = new Date(dia); jueves.setUTCDate(dia.getUTCDate() + 3 - ((dow + 6) % 7));
  const enero4 = new Date(Date.UTC(jueves.getUTCFullYear(), 0, 4));
  const semana = 1 + Math.round(((jueves - enero4) / 864e5 - 3 + ((enero4.getUTCDay() + 6) % 7)) / 7);
  return { fecha, dow, hora: Number(partes.hour), minuto: Number(partes.minute), semana };
}

// Una campaña manda solo en sus días, cada N semanas (semanas ISO pares si
// N = 2) y dentro de su horario. Sin días = todos los días.
export function tocaHoy(c, ahora) {
  const dias = Array.isArray(c.dias_semana) && c.dias_semana.length ? c.dias_semana : null;
  if (dias && !dias.includes(ahora.dow)) return false;
  const cada = Math.max(1, Number(c.cada_semanas) || 1);
  if (cada > 1 && ahora.semana % cada !== 0) return false;
  return ahora.hora >= (c.hora_desde ?? 10) && ahora.hora < (c.hora_hasta ?? 20);
}

export function describirCalendario(c) {
  const dias = Array.isArray(c.dias_semana) && c.dias_semana.length
    ? [...c.dias_semana].sort().map(d => DIAS[d]).join(", ") : "todos los días";
  const cada = Number(c.cada_semanas) > 1 ? ` · cada ${c.cada_semanas} semanas` : "";
  return `${dias}${cada} · ${c.hora_desde ?? 10}–${c.hora_hasta ?? 20} h`;
}

// enviados = fechas (ISO) de los mensajes de marketing que esta persona ya
// recibió en los últimos 7 días, sin contar campañas de prueba. `zona` decide
// qué es "hoy".
export function motivoTope(enviados, { diario = 1, semanal = 2, zona = "UTC" } = {}, ahora = new Date()) {
  const hoy = ahoraEn(zona, ahora).fecha;
  const semana = (enviados || []).filter(f => ahora - new Date(f) < 7 * 864e5);
  if (semana.filter(f => ahoraEn(zona, new Date(f)).fecha === hoy).length >= diario) return "ya recibió uno hoy";
  if (semana.length >= semanal) return `ya recibió ${semana.length} esta semana`;
  return null;
}

// ---------- Beneficios de las olas de seguimiento ----------
// `venceDia` cuenta desde el día de la última visita: 15 = "vale hasta 15
// días después". Fechas como texto YYYY-MM-DD.
const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
  "septiembre", "octubre", "noviembre", "diciembre"];

export function venceBeneficio(ultimaVisita, venceDia) {
  if (!ultimaVisita || !Number.isFinite(Number(venceDia))) return null;
  const d = new Date(`${String(ultimaVisita).slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(venceDia));
  return d.toISOString().slice(0, 10);
}

// "2026-10-30" → "30 de octubre"; el mismo día que `hoy` → "hoy".
export function fechaParaCliente(fecha, hoy) {
  if (!fecha) return "";
  if (fecha === hoy) return "hoy";
  return `${Number(fecha.slice(8, 10))} de ${MESES_LARGOS[Number(fecha.slice(5, 7)) - 1]}`;
}

// ---------- Texto de una notificación a la tarjeta de lealtad ----------
// {nombre}, {faltan}, {estampas} y {vence}. Loopy recomienda menos de 90
// caracteres para que no se corte; corta a 240.
export const LARGO_RECOMENDADO = 90;
export const LARGO_MAXIMO = 240;

export const primerNombre = (n) => {
  const p = String(n || "").trim().split(/\s+/)[0];
  return p && p.toLowerCase() !== "sin" ? p : "";
};

// "{nombre}, te faltan {faltan} para tu premio" → "Ana, te faltan 2 …". Sin
// nombre se quita junto con la coma que lo sigue, para que no quede ", te…".
export function textoLoopy(plantilla, { nombre, estampas, meta = 10, pendientes = 0, vence = "" } = {}) {
  const n = primerNombre(nombre);
  const faltan = Math.max(0, Number(meta) - Number(estampas || 0));
  let t = String(plantilla || "");
  if (!n) t = t.replace(/\{nombre\}\s*,?\s*/gi, "");
  t = t
    .replace(/\{nombre\}/gi, n)
    .replace(/\{faltan\}/gi, String(faltan))
    .replace(/\{estampas\}/gi, String(Math.max(Number(estampas || 0), Number(pendientes || 0))))
    .replace(/\{vence\}/gi, String(vence || ""))
    .replace(/\s{2,}/g, " ")
    .trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}
