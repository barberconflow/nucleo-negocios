# nucleo-negocios

El código común a las apps de los tres negocios propios: la **barbería**
(Flow Barber, en producción), el **carwash** y la **lavandería**.

Decisión que lo originó:
`Andromeda/40-Decisiones/2026-08-30-nucleo-compartido-para-los-tres-negocios.md`

## Qué hay

```
src/dinero.js        cálculo de dinero: métodos de cobro, caja chica vs.
                     cuenta, comisiones y bono diario. Configurable por
                     negocio con crearComisiones({...})
src/dinero.test.js   35 pruebas. Prueban el núcleo con TRES configuraciones
                     distintas — eso es lo que demuestra que sirve para más
                     de un negocio
src/fechas.js        inicio de día/semana/mes y formato de moneda y fecha
sql/esquema-base.sql las 9 tablas comunes + RLS cerrada por defecto
```

## La pregunta que decide todo

Antes de meter cualquier cosa acá:

> **¿Lo necesitan los tres negocios, o solo uno?**

Si es solo uno, va en la app de ese negocio. Un núcleo que acumula casos
particulares deja de ser un núcleo y se convierte en tres apps con pasos
extra.

Lo que **no** entra, por definición: la **unidad de trabajo** de cada negocio
—la cita de la barbería, el vehículo del carwash, la bolsa de ropa con fecha
de entrega de la lavandería—. Eso es justo lo que hace distinto a cada
negocio, y cada app lo define en su propio SQL y su propio código.

## Reglas absolutas

1. **Nada de nombres propios.** Si aparece "samir", "gerry", "topo" o
   "barbería" en este repo, está mal. Los contratos concretos entran por
   configuración: `crearComisiones({ bonoDiario, empleadosConBono, ... })`.
   Esa es la diferencia entre un núcleo y una copia.
2. **`npm test` antes de cada commit.** Este código lo van a usar tres
   negocios: un error acá lo pagan los empleados de los tres, no de uno.
3. **Una regla de negocio se escribe una sola vez.** Si el cálculo de la caja
   está acá y también en una app, en algún momento van a decir cosas distintas
   y nadie se va a enterar hasta que alguien cobre mal.
4. **Toda regla nueva llega con su prueba**, y la prueba se nombra por el
   comportamiento del negocio ("el bono es uno por día"), no por la función.
5. **RLS cerrada por defecto.** Abrir una tabla a `anon` se hace en el SQL del
   vertical, tabla por tabla y con el motivo escrito. Nunca "para que se vea
   en la app".
6. **Un cambio que rompe a un consumidor se avisa acá**, en la tabla de abajo,
   con qué hay que cambiar en las apps.

## Estado

| Negocio | App | ¿Usa el núcleo? |
|---|---|---|
| Barbería (Flow Barber) | `~/Projects/barberia-app` — en producción | **Todavía no.** Tiene su propia copia de `dinero.js`/`fechas.js`, idéntica salvo por la configuración. Es una duplicación consciente y temporal: no se toca el build de una app en producción hasta que el núcleo esté validado por un segundo consumidor. |
| Carwash | sin empezar | Será el primero en consumirlo. |
| Lavandería | sin empezar | El examen: si cuesta menos de la mitad que el carwash, el corte está bien. |

**Deuda conocida:** mientras la barbería tenga su copia, un arreglo en el
cálculo de dinero hay que aplicarlo en los dos sitios. Es exactamente el
problema que este repo existe para eliminar, y se cierra cuando la barbería
migre.

## Pendiente de decidir

**Cómo consumen las apps este paquete.** No está resuelto y hay que resolverlo
antes de que el carwash tenga su primer deploy:

- **Monorepo con workspaces** (`~/Projects/negocios/` con `packages/nucleo` y
  `apps/*`): un `npm install`, los cambios del núcleo se ven al instante en
  las tres apps, y Vercel lo soporta con "root directory" por proyecto. Cuesta
  mover `barberia-app`, que hoy despliega desde su propio repo.
- **Dependencia por git** (`npm i github:barberconflow/nucleo-negocios`): no
  hay que mover nada, pero cada cambio del núcleo son commit + push + bump en
  tres apps, y siendo repo privado hay que darle un token a Vercel.

Decidirlo con el carwash delante, no antes.
