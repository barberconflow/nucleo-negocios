import { describe, it, expect } from "vitest";
import {
  ingresoReal, esCortesia, saldos, suma, sumaIngreso, totales,
  crearComisiones, repartirDescuento, aplicarCupon,
} from "./dinero.js";

const HOY = new Date("2026-08-30T14:00:00");
const aLas = (h) => new Date(`2026-08-30T${String(h).padStart(2, "0")}:00:00`).toISOString();
const AYER = new Date("2026-08-29T11:00:00").toISOString();

// Las tres configuraciones reales que tiene que soportar el núcleo.
const BARBERIA = crearComisiones({
  bonoDiario: 300,
  empleadosConBono: ["samir", "gerry"],
  empleadosSinComision: ["topo"],
});
// Un negocio normal: comisión y nada más.
const SIN_BONO = crearComisiones();
// Todo el mundo a sueldo, sin comisión por trabajo.
const A_SUELDO = crearComisiones({ empleadosSinComision: ["ana", "beto"] });

// ---------------------------------------------------------------

describe("ingreso de una venta", () => {
  it("la cortesía no mete dinero, aunque tenga precio", () => {
    expect(ingresoReal({ metodo: "cortesia", precio: 250 })).toBe(0);
    expect(esCortesia({ metodo: "cortesia" })).toBe(true);
  });

  it("el resto de métodos meten su precio", () => {
    for (const metodo of ["efectivo", "tarjeta", "transferencia"]) {
      expect(ingresoReal({ metodo, precio: 250 })).toBe(250);
    }
  });

  it("una venta sin precio no rompe la suma", () => {
    expect(ingresoReal({ metodo: "efectivo" })).toBe(0);
    expect(ingresoReal({ metodo: "efectivo", precio: null })).toBe(0);
  });
});

// ---------------------------------------------------------------
// Lo que hace que el núcleo sirva para tres negocios: la configuración.

describe("configuración por negocio", () => {
  it("un negocio sin bono paga siempre el porcentaje", () => {
    expect(SIN_BONO.pagosDelDia([
      { precio: 250, pct: 50 },
      { precio: 250, pct: 50 },
    ])).toEqual([125, 125]);
  });

  it("sin bono, nadie 'tiene bono' aunque se le pregunte por nombre", () => {
    expect(SIN_BONO.tieneBonoDiario("samir")).toBe(false);
    expect(BARBERIA.tieneBonoDiario("samir")).toBe(true);
  });

  it("reconoce a los empleados de cada negocio, sin importar mayúsculas ni espacios", () => {
    expect(BARBERIA.tieneBonoDiario("  GERRY ")).toBe(true);
    expect(BARBERIA.tieneBonoDiario("Ivan")).toBe(false);
    expect(BARBERIA.tieneBonoDiario(null)).toBe(false);
    expect(BARBERIA.esEmpleadoSinComision("TOPO")).toBe(true);
    expect(A_SUELDO.esEmpleadoSinComision("Ana")).toBe(true);
    expect(A_SUELDO.esEmpleadoSinComision("Samir")).toBe(false);
  });

  it("el porcentaje por defecto se puede cambiar por negocio", () => {
    const alTreinta = crearComisiones({ pctPorDefecto: 30 });
    const datos = { ventas: [], servicios: [] };
    // El servicio no está en el catálogo: cae al porcentaje por defecto.
    expect(alTreinta.comisionesDelDia(datos, "Ana", [{ precio: 1000, servicio: "?" }], [], HOY)
      .comisiones).toEqual([300]);
    expect(SIN_BONO.comisionesDelDia(datos, "Ana", [{ precio: 1000, servicio: "?" }], [], HOY)
      .comisiones).toEqual([500]);
  });
});

// ---------------------------------------------------------------
// El bono diario es la regla más cara de equivocar.

describe("comisión normal", () => {
  it("aplica el porcentaje pactado", () => {
    expect(BARBERIA.comisionNormal({ precio: 250, pct: 50 })).toBe(125);
    expect(BARBERIA.comisionNormal({ precio: 400, pct: 40 })).toBe(160);
  });
});

describe("comisión con el bono del día", () => {
  it("paga el bono cuando el porcentaje da menos", () => {
    expect(BARBERIA.comisionConBono({ precio: 250, pct: 50 })).toBe(250);
  });

  it("nunca paga más de lo que costó el servicio", () => {
    expect(BARBERIA.comisionConBono({ precio: 200, pct: 50 })).toBe(200);
  });

  it("manda el porcentaje cuando da más que el bono", () => {
    expect(BARBERIA.comisionConBono({ precio: 800, pct: 50 })).toBe(400);
  });

  it("el bono nunca hace que el empleado cobre menos que su porcentaje", () => {
    const casos = [
      { precio: 100, pct: 50 }, { precio: 250, pct: 50 },
      { precio: 700, pct: 60 }, { precio: 1200, pct: 45 },
    ];
    for (const c of casos) {
      expect(BARBERIA.comisionConBono(c)).toBeGreaterThanOrEqual(BARBERIA.comisionNormal(c));
    }
  });
});

describe("reparto del bono en un día completo", () => {
  it("un día sin trabajos no paga nada", () => {
    expect(BARBERIA.pagosDelDia([])).toEqual([]);
  });

  it("con un solo trabajo, ese se lleva el bono", () => {
    expect(BARBERIA.pagosDelDia([{ precio: 250, pct: 50 }])).toEqual([250]);
  });

  it("EL BONO ES UNO POR DÍA, no uno por trabajo", () => {
    const pagos = BARBERIA.pagosDelDia([
      { precio: 250, pct: 50 },
      { precio: 250, pct: 50 },
      { precio: 250, pct: 50 },
    ]);
    expect(pagos.filter(p => p === 250)).toHaveLength(1);
    expect(pagos).toEqual([250, 125, 125]);
  });

  it("el bono cae en el trabajo más barato, que es donde más suma", () => {
    expect(BARBERIA.pagosDelDia([
      { precio: 900, pct: 50 },
      { precio: 200, pct: 50 },
    ])).toEqual([450, 200]);
  });

  it("si empatan, el bono se lo lleva el más viejo del día", () => {
    const pagos = BARBERIA.pagosDelDia([
      { precio: 250, pct: 50 },
      { precio: 250, pct: 50 },
    ]);
    expect(pagos[0]).toBe(250);
    expect(pagos[1]).toBe(125);
  });

  it("si nadie gana con el bono, todos cobran su porcentaje", () => {
    expect(BARBERIA.pagosDelDia([
      { precio: 900, pct: 50 },
      { precio: 800, pct: 50 },
    ])).toEqual([450, 400]);
  });

  it("el bono nunca hace perder plata frente al porcentaje solo", () => {
    const dia = [
      { precio: 150, pct: 50 }, { precio: 250, pct: 50 },
      { precio: 400, pct: 40 }, { precio: 1000, pct: 50 },
    ];
    const conBono = BARBERIA.pagosDelDia(dia).reduce((a, b) => a + b, 0);
    const soloPct = dia.map(BARBERIA.comisionNormal).reduce((a, b) => a + b, 0);
    expect(conBono).toBeGreaterThanOrEqual(soloPct);
    expect(conBono - soloPct).toBeLessThanOrEqual(BARBERIA.bonoDiario);
  });
});

// ---------------------------------------------------------------

const datosCon = (ventas) => ({
  ventas,
  servicios: [
    { nombre: "Corte", comision_pct: 50 },
    { nombre: "Delineado", comision_pct: 50 },
    { nombre: "Lavado premium", comision_pct: 40 },
  ],
  gastos: [], retiros: [], pagos: [],
});

describe("recálculo de la comisión del día", () => {
  it("el primer trabajo del día se lleva el bono", () => {
    const { comisiones, correcciones } = BARBERIA.comisionesDelDia(
      datosCon([]), "Samir", [{ precio: 250, servicio: "Corte" }], [], HOY
    );
    expect(comisiones).toEqual([250]);
    expect(correcciones).toEqual([]);
  });

  it("CORRIGE lo ya guardado cuando el bono se muda al trabajo nuevo", () => {
    // Guardado con el bono: 400 al 50% = 200 normal, con bono cobró 300.
    const datos = datosCon([
      { id: 7, empleado: "Samir", servicio: "Corte", precio: 400, comision: 300, fecha: aLas(10) },
    ]);
    // Entra uno de 250: ahí el bono suma 125, contra los 100 del de 400.
    const { comisiones, correcciones } = BARBERIA.comisionesDelDia(
      datos, "Samir", [{ precio: 250, servicio: "Corte" }], [], HOY
    );
    expect(comisiones).toEqual([250]);
    expect(correcciones).toEqual([{ id: 7, comision: 200 }]);
  });

  it("no corrige nada cuando el bono se queda donde estaba", () => {
    const datos = datosCon([
      { id: 7, empleado: "Samir", servicio: "Corte", precio: 250, comision: 250, fecha: aLas(10) },
    ]);
    const { comisiones, correcciones } = BARBERIA.comisionesDelDia(
      datos, "Samir", [{ precio: 100, servicio: "Delineado" }], [], HOY
    );
    expect(correcciones).toEqual([]);
    expect(comisiones).toEqual([50]);
  });

  it("lo de ayer no entra en el día de hoy", () => {
    const datos = datosCon([
      { id: 1, empleado: "Samir", servicio: "Corte", precio: 250, comision: 250, fecha: AYER },
    ]);
    const { comisiones, correcciones } = BARBERIA.comisionesDelDia(
      datos, "Samir", [{ precio: 250, servicio: "Corte" }], [], HOY
    );
    expect(comisiones).toEqual([250]);
    expect(correcciones).toEqual([]);
  });

  it("los productos no cuentan como trabajos del día", () => {
    const datos = datosCon([
      { id: 1, empleado: "Samir", producto_id: 5, precio: 300, comision: 0, fecha: aLas(9) },
    ]);
    expect(BARBERIA.comisionesDelDia(datos, "Samir", [{ precio: 250, servicio: "Corte" }], [], HOY)
      .comisiones).toEqual([250]);
  });

  it("al borrar un trabajo, el ignorado sale y el bono se reasigna", () => {
    const datos = datosCon([
      { id: 1, empleado: "Samir", servicio: "Delineado", precio: 200, comision: 200, fecha: aLas(9) },
      { id: 2, empleado: "Samir", servicio: "Corte", precio: 250, comision: 125, fecha: aLas(11) },
    ]);
    expect(BARBERIA.comisionesDelDia(datos, "Samir", [], [1], HOY)
      .correcciones).toEqual([{ id: 2, comision: 250 }]);
  });

  it("un servicio fuera del catálogo cae al porcentaje por defecto", () => {
    expect(BARBERIA.comisionesDelDia(
      datosCon([]), "Samir", [{ precio: 1000, servicio: "Servicio inventado" }], [], HOY
    ).comisiones).toEqual([500]);
  });

  it("sirve igual para el carwash: mismo cálculo, otro catálogo", () => {
    const datos = datosCon([]);
    // Lavado premium al 40%: 500 * 40% = 200.
    expect(SIN_BONO.comisionesDelDia(
      datos, "Ana", [{ precio: 500, servicio: "Lavado premium" }], [], HOY
    ).comisiones).toEqual([200]);
  });
});

// ---------------------------------------------------------------

describe("caja chica y cuenta bancaria", () => {
  const base = {
    ventas: [
      { metodo: "efectivo", precio: 250 },
      { metodo: "efectivo", precio: 150 },
      { metodo: "tarjeta", precio: 400 },
      { metodo: "transferencia", precio: 300 },
      { metodo: "cortesia", precio: 250 },
    ],
    gastos: [{ fuente: "caja", monto: 100 }, { fuente: "cuenta", monto: 200 }],
    retiros: [
      { estado: "aprobado", monto: 50 },
      { estado: "pendiente", monto: 999 },
      { estado: "rechazado", monto: 777 },
    ],
    pagos: [{ fuente: "caja", monto: 30 }, { fuente: "cuenta", monto: 40 }],
  };

  it("el efectivo va a caja y lo demás a la cuenta", () => {
    const { cajaChica, enCuenta } = saldos(base);
    expect(cajaChica).toBe(220);  // 250+150 −100 −50 −30
    expect(enCuenta).toBe(460);   // 400+300 −200 −40
  });

  it("LA CORTESÍA NO SUMA A NINGUNA DE LAS DOS", () => {
    const antes = saldos(base);
    const despues = saldos({ ...base, ventas: [...base.ventas, { metodo: "cortesia", precio: 5000 }] });
    expect(despues.cajaChica).toBe(antes.cajaChica);
    expect(despues.enCuenta).toBe(antes.enCuenta);
  });

  it("solo los retiros APROBADOS salen de la caja", () => {
    expect(saldos(base).retirado).toBe(50);
  });

  it("un pago sin fuente se descuenta de la caja (compatibilidad hacia atrás)", () => {
    expect(saldos({ ...base, pagos: [{ monto: 80 }] }).pagadoEmpleadosCaja).toBe(80);
  });

  it("un negocio sin movimientos da cero, no NaN", () => {
    const { cajaChica, enCuenta } = saldos({});
    expect(cajaChica).toBe(0);
    expect(enCuenta).toBe(0);
  });

  it("un monto nulo no contamina la suma con NaN", () => {
    expect(saldos({
      ventas: [{ metodo: "efectivo", precio: 100 }],
      gastos: [{ fuente: "caja", monto: null }],
    }).cajaChica).toBe(100);
  });

  it("un cobro mixto reparte: la parte en efectivo a caja y el resto a la cuenta", () => {
    const { cajaChica, enCuenta } = saldos({ ventas: [{ metodo: "mixto", precio: 300, parte_efectivo: 100 }] });
    expect(cajaChica).toBe(100);
    expect(enCuenta).toBe(200);
  });

  it("un cobro mixto nunca mete a caja más que el precio ni menos de cero", () => {
    expect(saldos({ ventas: [{ metodo: "mixto", precio: 300, parte_efectivo: 999 }] }))
      .toMatchObject({ cajaChica: 300, enCuenta: 0 });
    expect(saldos({ ventas: [{ metodo: "mixto", precio: 300, parte_efectivo: -50 }] }))
      .toMatchObject({ cajaChica: 0, enCuenta: 300 });
  });

  it("una transferencia a un empleado que sigue PENDIENTE todavía no salió de la cuenta", () => {
    const { enCuenta, pagadoEmpleadosCuenta } = saldos({
      ventas: [{ metodo: "tarjeta", precio: 1000 }],
      pagos: [
        { fuente: "cuenta", monto: 300, estado: "pendiente" },
        { fuente: "cuenta", monto: 200, estado: "rechazado" },
        { fuente: "cuenta", monto: 100, estado: "aprobado" },
      ],
    });
    expect(pagadoEmpleadosCuenta).toBe(100);
    expect(enCuenta).toBe(900);
  });
});

describe("sumas del resumen", () => {
  it("suma cuenta todo, sumaIngreso descuenta la cortesía", () => {
    const ventas = [{ metodo: "efectivo", precio: 250 }, { metodo: "cortesia", precio: 250 }];
    expect(suma(ventas)).toBe(500);
    expect(sumaIngreso(ventas)).toBe(250);
  });

  it("totales agrupa por día, semana y mes sin depender de la fecha real", () => {
    const t = totales({
      ventas: [
        { metodo: "efectivo", precio: 100, fecha: aLas(10) },
        { metodo: "efectivo", precio: 200, fecha: AYER },
      ],
      gastos: [],
    }, HOY);
    expect(t.ventasHoy).toHaveLength(1);
    expect(t.ventasSem).toHaveLength(2);  // 29 y 30 de agosto caen en la misma semana
  });
});

describe("repartirDescuento: el descuento se reparte por precio, con centavos exactos", () => {
  it("dos servicios de 200 y 100 con $50: 33.33 y 16.67", () => {
    expect(repartirDescuento([200, 100], 50)).toEqual([33.34, 16.66]);
  });
  it("la suma siempre es exactamente el descuento", () => {
    for (const [precios, d] of [[[89, 150, 60], 100], [[33, 33, 33], 10], [[0.01, 0.02], 0.02], [[120], 50]]) {
      const r = repartirDescuento(precios, d);
      expect(Math.round(r.reduce((a, b) => a + b, 0) * 100) / 100).toBe(Math.min(d, precios.reduce((a, b) => a + b, 0)));
      r.forEach((x, i) => expect(x).toBeLessThanOrEqual(precios[i]));
    }
  });
  it("un descuento mayor al total se queda en el total; sin filas o sin descuento, ceros", () => {
    expect(repartirDescuento([60, 29], 100)).toEqual([60, 29]);
    expect(repartirDescuento([], 50)).toEqual([]);
    expect(repartirDescuento([100, 50], 0)).toEqual([0, 0]);
  });
});

describe("aplicarCupon: mínimo de compra igual al cupón", () => {
  it("un lavado de $89 no alcanza para un cupón de $100", () => {
    expect(aplicarCupon({ total: 89, monto: 100 })).toEqual({ descuento: 0, motivo: "cupon_minimo", faltan: 11 });
  });
  it("de $100 para arriba se descuenta el cupón completo", () => {
    expect(aplicarCupon({ total: 100, monto: 100 })).toEqual({ descuento: 100 });
    expect(aplicarCupon({ total: 250, monto: 50 })).toEqual({ descuento: 50 });
  });
  it("sin la regla del mínimo se descuenta hasta el total", () => {
    expect(aplicarCupon({ total: 89, monto: 100, minimoCompra: false })).toEqual({ descuento: 89 });
  });
});
