// =============================================
// LO QUE UN CLIENTE PUEDE PEDIR POR WHATSAPP, SIN AGENTE DE POR MEDIO.
//
// Hoy: salir de las promociones ("BAJA") o volver a entrar ("ALTA"). Lo
// necesitan los tres negocios en cuanto mandan una plantilla de Marketing:
// Meta exige que el cliente pueda contestar BAJA y que se le haga caso.
//
// Puro (sin red): cada app decide qué hace con la intención (guardarla,
// contestar, avisar al dueño). Solo cuenta si el mensaje es ESA palabra sola,
// con signos o espacios alrededor: "no puedo darme de baja de la cita" no es
// una baja de promociones, y un mensaje con un código de confirmación que
// diga "baja" en medio tampoco.
// =============================================

const quitarAcentos = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");

// "baja" | "alta" | null
export function intencionBaja(texto) {
  const t = quitarAcentos(texto).toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  if (/^(baja|stop|no mas|darme de baja|dar de baja|cancelar suscripcion|unsubscribe)$/.test(t)) return "baja";
  if (/^(alta|start)$/.test(t)) return "alta";
  return null;
}
