# Bitácora — nucleo-negocios

> Una entrada por sesión de trabajo. Lo más reciente arriba.
> Escrito por `/wrap`. No editar entradas viejas.

---

## 2026-09-01 · 13:06 — El núcleo común a los tres negocios

**Hecho**
- Primer commit del núcleo compartido para la barbería, el carwash y la lavandería. Nace de la decisión del 30-ago (`Andromeda/40-Decisiones/2026-08-30-nucleo-compartido-para-los-tres-negocios.md`).
- `src/dinero.js`: el cálculo de dinero salido de `barberia-app`, pero con los contratos de Flow Barber convertidos en configuración — `crearComisiones({ bonoDiario, empleadosConBono, empleadosSinComision })`. Estaban hardcodeados como `["samir","gerry"]` y `BONO_DIARIO = 300`.
- `src/dinero.test.js`: 35 pruebas contra TRES configuraciones (barbería con bono, negocio sin bono, empleados a sueldo). Con una sola no habría demostrado nada.
- `sql/esquema-base.sql`: las 9 tablas comunes, RLS cerrada por defecto y escritura de `usuarios` restringida a admin.
- `CLAUDE.md` con la regla que decide qué entra: ¿lo necesitan los tres negocios, o solo uno?

**Decisiones**
- El hallazgo que lo justifica: de las 8 tablas base de la barbería, 7 no tienen nada de barbería. Lo único que cambia es la unidad de trabajo (cita / vehículo / bolsa de ropa), y eso queda FUERA del núcleo a propósito.
- Una instancia de Supabase por negocio, no multi-tenant: el aislamiento queda por construcción y no depende de que la RLS esté bien puesta.
- `barberia-app` sigue con su copia de `dinero.js` a propósito. No se toca el build de una app en producción hasta que el núcleo esté validado por el carwash.

**Pendiente**
- **Sin remoto: existe solo en disco.** Un `rm -rf` o un disco muerto y se pierde.
- Sin resolver cómo consumen las apps el paquete: monorepo con workspaces (hay que mover `barberia-app`, que despliega desde su propio repo) o dependencia por git (token privado en Vercel). Decidirlo con el carwash delante, no antes.
- La duplicación con `barberia-app/src/dinero.js` es deuda conocida: hasta que migre, un arreglo hay que aplicarlo en los dos sitios.

**Próximo paso**
- Crear el remoto: `gh repo create barberconflow/nucleo-negocios --private --source=. --remote=origin --push`.
- Después, empezar el carwash consumiendo el núcleo — es el primer consumidor y el que define si el corte está bien hecho.

