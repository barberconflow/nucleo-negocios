// ---------- El cálculo de dinero, común a cualquier negocio ----------
//
// Salió de barberia-app, donde estaba mezclado con los contratos concretos de
// Flow Barber (los nombres "samir" y "gerry", el bono de 300). Aquí eso es
// CONFIGURACIÓN, que es lo único que lo hace servir también para el carwash y
// la lavandería: las reglas son las mismas, los números no.
//
// Si tocas algo de este archivo, `npm test` antes de commitear. Un error acá
// lo pagan los empleados de tres negocios, no de uno.

import { hoy, inicioDia, inicioSemana, inicioMes } from "./fechas.js";

// ---------- Métodos de cobro ----------
// Efectivo entra a caja chica; tarjeta y transferencia van a la cuenta
// bancaria. La cortesía es el servicio regalado (premio de lealtad, cortesía
// comercial): cuenta como trabajo hecho y paga comisión, pero no entra dinero.
export const METODOS = [
  ["efectivo", "💵 Efectivo"],
  ["tarjeta", "💳 Tarjeta"],
  ["transferencia", "🏦 Transfer."],
  ["cortesia", "🎁 Cortesía"],
];

export const esCortesia = (v) => v.metodo === "cortesia";

// Dinero que realmente entró por una venta (la cortesía no suma).
export const ingresoReal = (v) => (esCortesia(v) ? 0 : Number(v.precio || 0));

// ---------- Sumas ----------

export const suma = (lista, campo = "precio") =>
  lista.reduce((a, x) => a + Number(x[campo] ?? 0), 0);

export const sumaIngreso = (lista) => lista.reduce((a, v) => a + ingresoReal(v), 0);

export const desde = (lista, fecha) => lista.filter(x => new Date(x.fecha) >= fecha);

// ---------- Saldos: caja chica y cuenta bancaria ----------
//
// Los dos números que el dueño cuadra a mano al cerrar el día. Iguales en los
// tres negocios: entra plata por servicios, sale por gastos, retiros y pagos
// a empleados; cada movimiento sale de la caja o de la cuenta.
//
// Pago mixto (nació en la barbería, v44): UNA venta con `metodo = 'mixto'`,
// `parte_efectivo` a caja y el resto (precio − parte_efectivo) a la cuenta.
// El resto no se guarda, así nunca puede dejar de cuadrar.
export const esMixto = (v) => v.metodo === "mixto";

// Cuánto de una venta entró a caja chica y cuánto a la cuenta bancaria.
export const entroACaja = (v) => {
  const precio = Number(v.precio || 0);
  if (v.metodo === "efectivo") return precio;
  if (esMixto(v)) return Math.min(precio, Math.max(0, Number(v.parte_efectivo || 0)));
  return 0;
};
export const entroACuenta = (v) => {
  const precio = Number(v.precio || 0);
  if (v.metodo === "tarjeta" || v.metodo === "transferencia") return precio;
  if (esMixto(v)) return precio - entroACaja(v);
  return 0;
};

// Un pago a empleado cuenta como dinero que salió solo si está HECHO. Donde
// la transferencia la hace únicamente el dueño, el encargado la deja
// `pendiente` hasta que él la marca hecha. Sin `estado` = hecho (los negocios
// que no usan aprobación, y los pagos de antes de que existiera).
export const pagoHecho = (p) => (p.estado || "aprobado") === "aprobado";

export function saldos(datos) {
  // Solo los retiros APROBADOS salen de la caja chica.
  const retirado = suma((datos.retiros || []).filter(r => r.estado === "aprobado"), "monto");
  // Un pago sin `fuente` se considera hecho en efectivo: así se descontaban
  // todos antes de que existiera la opción de pagar desde la cuenta.
  const hechos = (datos.pagos || []).filter(pagoHecho);
  const pagadoEmpleadosCaja = suma(hechos.filter(p => (p.fuente || "caja") === "caja"), "monto");
  const pagadoEmpleadosCuenta = suma(hechos.filter(p => p.fuente === "cuenta"), "monto");

  const ventas = datos.ventas || [];
  const gastos = datos.gastos || [];

  const cajaChica = ventas.reduce((a, v) => a + entroACaja(v), 0)
    - suma(gastos.filter(g => g.fuente === "caja"), "monto") - retirado - pagadoEmpleadosCaja;
  const enCuenta = ventas.reduce((a, v) => a + entroACuenta(v), 0)
    - suma(gastos.filter(g => g.fuente === "cuenta"), "monto") - pagadoEmpleadosCuenta;

  return { cajaChica, enCuenta, retirado, pagadoEmpleadosCaja, pagadoEmpleadosCuenta };
}

export function totales(datos, ahora = hoy()) {
  return {
    ventasHoy: desde(datos.ventas || [], inicioDia(ahora)),
    ventasSem: desde(datos.ventas || [], inicioSemana(ahora)),
    ventasMes: desde(datos.ventas || [], inicioMes(ahora)),
    gastosMes: suma(desde(datos.gastos || [], inicioMes(ahora)), "monto"),
    ...saldos(datos),
  };
}

// ---------- Comisiones ----------
//
// `crearComisiones(config)` devuelve el juego de funciones ya atado a las
// reglas de UN negocio. Cada app lo llama una vez con sus propios contratos:
//
//   const comisiones = crearComisiones({
//     bonoDiario: 300,
//     empleadosConBono: ["samir", "gerry"],
//     empleadosSinComision: ["topo"],
//     pctPorDefecto: 50,
//   });
//
// Un negocio sin bonos ni sueldos fijos lo llama sin argumentos y le funciona
// igual: `crearComisiones()`.
//
// Sobre el BONO DIARIO (contrato de Flow Barber, pero la mecánica es general):
// un trabajo de cada día se paga con un monto fijo en vez del % normal. Es una
// GARANTÍA a favor del empleado, y de ahí salen sus reglas:
//   · Es UNO por día, no uno por trabajo.
//   · Nunca paga menos que la comisión normal: si el % da más, manda el %.
//   · Nunca paga más de lo que costó el servicio.
//   · Se asigna al trabajo donde MÁS suma, o sea el de comisión normal más
//     baja. Ponerlo en el caro —donde el % ya paga casi lo mismo—
//     desperdiciaría la garantía.
//
// El día se arma trabajo por trabajo, así que la comisión NO se decide de una
// vez al guardar: cada vez que entra uno nuevo se recalcula el día COMPLETO y
// se corrigen los ya guardados que hayan quedado mal. Ver `comisionesDelDia`.
export function crearComisiones(config = {}) {
  const {
    bonoDiario = 0,
    empleadosConBono = [],
    empleadosSinComision = [],
    pctPorDefecto = 50,
  } = config;

  const normaliza = (nombre) => (nombre || "").trim().toLowerCase();
  const enLista = (lista, nombre) => lista.map(normaliza).includes(normaliza(nombre));

  const tieneBonoDiario = (nombre) => bonoDiario > 0 && enLista(empleadosConBono, nombre);
  const esEmpleadoSinComision = (nombre) => enLista(empleadosSinComision, nombre);

  // Comisión normal (el % pactado) de una fila {precio, pct}.
  const comisionNormal = (fila) => Math.round(fila.precio * fila.pct) / 100;

  // Cuánto pagaría esa fila si le tocara el bono: al menos su % normal, y como
  // mucho lo que costó el servicio.
  const comisionConBono = (fila) =>
    Math.max(comisionNormal(fila), Math.min(bonoDiario, fila.precio));

  // Reparte el pago de un día completo: todos a su % normal salvo uno, al que
  // se le asigna el bono. Gana el bono el trabajo donde más sube la comisión;
  // si empatan, el más viejo del día.
  // `filas`: [{precio, pct}] en orden cronológico.
  function pagosDelDia(filas) {
    const normales = filas.map(comisionNormal);
    if (bonoDiario <= 0) return normales;
    let elegido = 0;
    let mejorGanancia = -Infinity;
    filas.forEach((f, i) => {
      const ganancia = comisionConBono(f) - normales[i];
      if (ganancia > mejorGanancia) { mejorGanancia = ganancia; elegido = i; }
    });
    return normales.map((n, i) => (i === elegido ? comisionConBono(filas[i]) : n));
  }

  // Trabajos (no productos) que el empleado ya tiene registrados hoy, del más
  // viejo al más nuevo.
  const trabajosDeHoy = (datos, empleado, ahora = hoy()) => {
    const ini = inicioDia(ahora);
    return (datos.ventas || [])
      .filter(v => v.empleado === empleado && !v.producto_id && new Date(v.fecha) >= ini)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  };

  // Recalcula el día completo con lo ya guardado MÁS lo que se va a insertar:
  //  · `comisiones`: una por cada uno de `nuevos`, en el mismo orden.
  //  · `correcciones`: [{id, comision}] de los trabajos de hoy ya guardados
  //    cuya comisión cambió al recalcular.
  // `nuevos`: [{precio, servicio}]. `ignorados`: ids a sacar de la cuenta
  // (el que se está borrando ahora mismo, que `datos` todavía trae).
  function comisionesDelDia(datos, empleado, nuevos, ignorados = [], ahora = hoy()) {
    const pctDe = (servicio) =>
      Number((datos.servicios || []).find(x => x.nombre === servicio)?.comision_pct ?? pctPorDefecto);

    const previos = trabajosDeHoy(datos, empleado, ahora).filter(v => !ignorados.includes(v.id));
    const todos = [
      ...previos.map(v => ({ precio: Number(v.precio), pct: pctDe(v.servicio) })),
      ...nuevos.map(n => ({ precio: Number(n.precio), pct: pctDe(n.servicio) })),
    ];
    const pagos = pagosDelDia(todos);

    const correcciones = previos
      .map((v, i) => ({ id: v.id, actual: Number(v.comision), correcta: pagos[i] }))
      .filter(c => c.correcta !== c.actual)
      .map(({ id, correcta }) => ({ id, comision: correcta }));

    return { correcciones, comisiones: pagos.slice(previos.length) };
  }

  return {
    bonoDiario,
    tieneBonoDiario,
    esEmpleadoSinComision,
    comisionNormal,
    comisionConBono,
    pagosDelDia,
    trabajosDeHoy,
    comisionesDelDia,
  };
}
