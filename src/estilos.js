import { useState, useEffect } from "react";

export function useDispositivo() {
  const calcular = () => {
    if (typeof window === "undefined") return { tipo: "escritorio", horizontal: false, ancho: 1024 };
    const ancho = window.innerWidth;
    const alto = window.innerHeight;
    const tactil = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const horizontal = ancho > alto;
    let tipo = "escritorio";
    if (ancho < 640) tipo = "movil";
    else if (ancho < 1024 && tactil) tipo = "tablet";
    return { tipo, horizontal, ancho, tactil };
  };

  const [info, setInfo] = useState(calcular);

  useEffect(() => {
    const alCambiar = () => setInfo(calcular());
    window.addEventListener("resize", alCambiar);
    window.addEventListener("orientationchange", alCambiar);
    return () => {
      window.removeEventListener("resize", alCambiar);
      window.removeEventListener("orientationchange", alCambiar);
    };
  }, []);

  return info;
}

export const ESTILOS_BASE = `
  :root {
    --bg: #14171D;
    --bg-soft: #1B1F27;
    --card: rgba(255,255,255,.07);
    --card-alt: rgba(255,255,255,.05);
    --text: #F3F5F8;
    --text-muted: #9AA3B0;
    --border: rgba(255,255,255,.12);
    --border-strong: rgba(255,255,255,.22);
    --gold: #4A9EFF;
    --gold-hover: #6DB3FF;
    --gold-active: #2E7FDD;
    --gold-soft: rgba(74,158,255,.20);
    --text-on-gold: #FFFFFF;
    --gold-text: #7EC1FF;
    --shadow-sm: 0 2px 8px rgba(0,0,0,.35);
    --shadow-md: 0 16px 40px -16px rgba(0,0,0,.55);
    --shadow-lg: 0 24px 56px -20px rgba(0,0,0,.6);
    --radius-card: 28px;
    --radius-control: 16px;
  }

  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: var(--bg);
    overflow-x: hidden;
    max-width: 100%;
    -webkit-text-size-adjust: 100%;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  .app {
    min-height: 100vh;
    min-height: 100dvh;
    background: var(--bg);
    background-image:
      radial-gradient(720px 540px at 92% -8%, var(--gold-soft), transparent 70%),
      radial-gradient(680px 520px at -10% 100%, rgba(255,255,255,.05), transparent 70%);
    background-repeat: no-repeat;
    color: var(--text);
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    overflow-x: hidden;
    /* En iOS, agregada a inicio, el contenido dibuja debajo del notch/barra
       de estado (por viewport-fit=cover + status-bar-style translucent) si
       no se le deja este margen explícito. */
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    padding-left: env(safe-area-inset-left, 0px);
    padding-right: env(safe-area-inset-right, 0px);
  }
  .display { font-family: 'Poppins', system-ui, -apple-system, sans-serif; letter-spacing: 0.005em; font-weight: 600; }
  .logo-marca {
    height: 24px; width: auto; display: block;
    filter: invert(1) brightness(1.1);
  }
  .tarjeta {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    min-width: 0;
    box-shadow: var(--shadow-md);
    backdrop-filter: blur(24px) saturate(160%);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
  }
  .sutil { color: var(--text-muted); }

  input, select, textarea {
    background: var(--card-alt);
    border: 1px solid var(--border);
    border-radius: var(--radius-control);
    padding: 12px;
    color: var(--text);
    width: 100%;
    max-width: 100%;
    font-size: 16px;
    font-family: inherit;
    color-scheme: dark;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    transition: border-color .18s ease, box-shadow .18s ease, background-color .18s ease;
  }
  input::placeholder, textarea::placeholder { color: var(--text-muted); opacity: .8; }
  input:hover, select:hover, textarea:hover { border-color: var(--border-strong); }
  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: var(--gold);
    box-shadow: 0 0 0 4px var(--gold-soft);
  }
  input:focus-visible, select:focus-visible, textarea:focus-visible {
    outline: none;
    border-color: var(--gold);
    box-shadow: 0 0 0 4px var(--gold-soft);
  }

  .btn {
    border: none; cursor: pointer; border-radius: var(--radius-control);
    padding: 14px; font-weight: 600; width: 100%;
    font-size: 16px; min-height: 48px;
    font-family: inherit;
    transition: transform .15s ease, background-color .15s ease, opacity .15s ease;
  }
  .btn-dorado {
    background: var(--gold); color: var(--text-on-gold);
    box-shadow: var(--shadow-md);
  }
  .btn-dorado:hover { background: var(--gold-hover); }
  .btn-dorado:active { background: var(--gold-active); transform: scale(.97); }
  .btn-dorado:disabled { opacity: 0.5; cursor: default; transform: none; }
  .chip {
    background: var(--card-alt); color: var(--text); cursor: pointer;
    border: 1px solid var(--border); border-radius: 999px;
    padding: 10px 16px; font-size: 15px; min-height: 42px;
    font-family: inherit; white-space: nowrap;
    /* Sin esto, un chip con flex:1 dentro de una fila angosta (varios chips
       de pago/estado en un móvil chico) no encoge por debajo del ancho de su
       texto: el conjunto se sale del viewport y, como html/body/.app cortan
       el overflow-x, el resto queda invisible e inalcanzable en vez de
       simplemente achicarse o pasar a otra línea. */
    min-width: 0; overflow: hidden; text-overflow: ellipsis;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    transition: background-color .18s ease, border-color .18s ease, color .18s ease, transform .15s ease;
  }
  .chip:hover { border-color: var(--border-strong); background: var(--bg-soft); }
  .chip:active { transform: scale(.97); }
  .chip-on { background: var(--gold); color: var(--text-on-gold); border-color: var(--gold); font-weight: 600; }
  /* Un chip ya elegido tiene que seguir viéndose elegido con el cursor
     encima. Sin esta regla gana .chip:hover —clase + pseudo-clase pesa más
     que .chip-on sola— y el botón se va al gris oscuro del fondo: en el menú
     de la reserva los servicios elegidos quedaban "azul y negro", el último
     tocado en negro y el resto en azul. En el celular es peor, porque el
     :hover se queda pegado después del toque hasta que se toca otra cosa. */
  .chip-on:hover { background: var(--gold-hover); border-color: var(--gold-hover); color: var(--text-on-gold); }
  /* Refrescar de la cabecera. Círculo de 44px (mínimo cómodo para el pulgar)
     al lado del contador de cortes, para que caiga en el mismo lugar en el
     celular, la tablet y la compu. Mientras carga se deshabilita y gira. */
  .btn-refrescar {
    display: inline-flex; align-items: center; justify-content: center;
    flex: 0 0 auto; width: 44px; height: 44px;
    border-radius: 999px; border: 1px solid var(--border);
    background: var(--card-alt); color: var(--text);
    font-family: inherit; font-size: 20px; line-height: 1; cursor: pointer;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    transition: background-color .18s ease, border-color .18s ease, color .18s ease, transform .15s ease;
  }
  .btn-refrescar:hover { border-color: var(--border-strong); background: var(--bg-soft); }
  .btn-refrescar:active { transform: scale(.94); }
  .btn-refrescar:disabled {
    cursor: default; color: var(--gold-text); border-color: var(--gold); transform: none;
  }
  .btn-refrescar > span { display: block; }
  .btn-refrescar:disabled > span { animation: girar .8s linear infinite; }
  @keyframes girar { to { transform: rotate(360deg); } }

  .btn-borrar {
    background: transparent; cursor: pointer; font-size: 12px;
    padding: 8px 12px; border-radius: 10px; min-height: 36px;
    color: var(--gold-text); border: 1px solid var(--border); font-family: inherit;
    transition: background-color .18s ease, border-color .18s ease, color .18s ease, transform .15s ease;
  }
  .btn-borrar:hover { background: var(--gold-soft); border-color: var(--gold); }
  .btn-borrar:active { transform: scale(.97); }
  .fila {
    display: flex; justify-content: space-between; align-items: center;
    gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border);
    min-width: 0;
  }
  .fila > div { min-width: 0; }

  /* --- Tarjetas grandes de decisión (bienvenida, lealtad, registro) --- */
  .opcion {
    background: var(--card); border: 1px solid var(--border); border-radius: 14px;
    padding: 22px 18px; width: 100%; cursor: pointer; text-align: center;
    color: var(--text); font-family: inherit; display: grid; gap: 6px;
    justify-items: center; min-height: 128px; align-content: center;
    box-shadow: var(--shadow-sm);
  }
  .opcion:active { background: var(--bg-soft); }
  .opcion-oro { border-color: var(--gold); }
  .opcion-emoji { font-size: 34px; line-height: 1; }

  /* --- Barra de pasos de un recorrido de varias pantallas --- */
  .pasos {
    display: flex; align-items: center; gap: 6px;
    font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--text-muted);
  }
  .paso-on { color: var(--text); font-weight: 600; }
  .barra-progreso {
    height: 3px; border-radius: 2px; background: var(--border); overflow: hidden;
  }
  .barra-progreso > i { display: block; height: 100%; background: var(--gold); }

  .atras {
    background: none; border: none; color: var(--text-muted); cursor: pointer;
    font-family: inherit; font-size: 14px; padding: 6px 0; text-align: left;
    min-height: 40px; justify-self: start;
  }
  .verificado {
    border: 1px solid #4E8A5C; background: rgba(78,138,92,0.14);
    border-radius: 10px; padding: 14px; font-size: 14px;
  }
  .aviso-suave {
    border: 1px solid #33586E; background: rgba(51,88,110,0.16);
    border-radius: 10px; padding: 14px; font-size: 14px;
  }

  .contenido {
    width: 100%;
    max-width: 520px;
    margin: 0 auto;
    padding: 0 16px 96px;
    display: grid;
    gap: 16px;
    align-content: start;
  }
  .shell { display: block; }
  .principal { min-width: 0; }
  .lateral { display: block; }
  .marca { display: none; }
  .solo-movil { display: block; }
  .cabecera {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 12px; padding: 14px 16px 4px;
  }
  .banda {
    margin: 8px 16px; padding: 10px 14px; border-radius: var(--radius-control);
    font-size: 14px; color: #FFF;
    box-shadow: var(--shadow-md);
  }
  .barra-tabs {
    display: flex; gap: 8px; padding: 12px 16px;
    overflow-x: auto; -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .barra-tabs::-webkit-scrollbar { display: none; }
  /* Estas pestañas se deslizan horizontalmente a su ancho natural (no se
     encogen): el min-width:0/ellipsis de .chip es para filas que SÍ deben
     ajustarse al ancho de pantalla (ej. método de pago), no para esta, donde
     por default de flexbox (flex-shrink:1) terminaban todas apretadas y
     truncadas ("R..", "T..") en vez de dejarse desplazar. */
  .barra-tabs .chip {
    min-width: auto; flex-shrink: 0; overflow: visible; text-overflow: clip;
  }
  .btn-salir { margin-left: auto; }

  .tira-dias {
    display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }
  .tira-dias::-webkit-scrollbar { display: none; }
  .dia {
    flex: 0 0 auto; min-width: 64px; scroll-snap-align: start;
    border-radius: 16px; padding: 10px 6px; text-align: center;
    cursor: pointer; border: 1px solid var(--border);
    background: var(--card-alt); color: var(--text); font-family: inherit;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    transition: background-color .18s ease, border-color .18s ease, color .18s ease, transform .15s ease, box-shadow .18s ease;
  }
  .dia:hover:not(:disabled) { border-color: var(--border-strong); }
  .dia:active:not(:disabled) { transform: scale(.96); }
  .dia-on {
    background: var(--gold); border-color: var(--gold); color: var(--text-on-gold);
    box-shadow: var(--shadow-md);
  }
  .dia-on:hover:not(:disabled) { border-color: var(--gold-hover); background: var(--gold-hover); }
  .dia:disabled { opacity: 0.3; cursor: default; }

  .rejilla-horas {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
    gap: 8px;
  }
  .hora {
    border: 1px solid var(--border); background: var(--card-alt); color: var(--text);
    border-radius: var(--radius-control); padding: 12px 4px; cursor: pointer;
    font-size: 15px; min-height: 46px; font-family: inherit;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    transition: background-color .18s ease, border-color .18s ease, color .18s ease, transform .15s ease;
  }
  .hora:hover:not(:disabled) { border-color: var(--border-strong); background: var(--card); }
  .hora:active:not(:disabled) { transform: scale(.96); }
  .hora-on { background: var(--gold); color: var(--text-on-gold); border-color: var(--gold); font-weight: 600; }
  .hora-on:hover:not(:disabled) { background: var(--gold-hover); border-color: var(--gold-hover); }
  .hora:disabled { opacity: 0.3; cursor: default; text-decoration: line-through; }

  @media (min-width: 640px) {
    .contenido { max-width: 700px; padding: 0 24px 96px; }
    .cabecera { padding: 18px 24px 4px; }
    .banda { margin: 8px 24px; }
    .barra-tabs { padding: 12px 24px; }
    .rejilla-horas { grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); }
    .dia { min-width: 72px; }
  }

  @media (min-width: 1024px) {
    .shell {
      display: grid;
      grid-template-columns: 236px minmax(0, 1fr);
      align-items: start;
      max-width: 1440px;
      margin: 0 auto;
    }
    .lateral {
      position: sticky; top: 0;
      height: 100vh; height: 100dvh;
      border-right: 1px solid var(--border);
      padding: 24px 14px;
      display: flex; flex-direction: column;
      background: var(--card);
      box-shadow: var(--shadow-sm);
      backdrop-filter: blur(24px) saturate(160%);
      -webkit-backdrop-filter: blur(24px) saturate(160%);
    }
    .marca { display: block; padding: 0 10px 18px; }
    .solo-movil { display: none; }
    .barra-tabs {
      flex-direction: column; align-items: stretch;
      overflow: visible; padding: 0; gap: 3px;
    }
    .barra-tabs .chip {
      width: 100%; text-align: left; border-radius: 12px;
      border-color: transparent; padding: 11px 14px; min-height: 44px;
      background: transparent;
    }
    .barra-tabs .chip:hover { background: var(--bg-soft); border-color: var(--border); }
    .barra-tabs .chip-on {
      background: var(--gold); color: var(--text-on-gold); border-color: var(--gold); font-weight: 600;
      box-shadow: var(--shadow-md);
    }
    .barra-tabs .chip-on:hover { background: var(--gold-hover); border-color: var(--gold-hover); }
    .btn-salir { margin-left: 0; margin-top: auto; color: var(--text-muted); }

    .cabecera {
      padding: 26px 40px 10px;
      max-width: 1080px; margin: 0 auto; width: 100%;
    }
    .banda { margin: 8px auto; max-width: 1000px; }
    .contenido {
      max-width: 1080px;
      padding: 8px 40px 64px;
      grid-template-columns: repeat(auto-fit, minmax(330px, 1fr));
      align-items: start;
    }
    .contenido.columna-unica { max-width: 560px; grid-template-columns: 1fr; }
  }

  @media (min-width: 1600px) {
    .contenido { max-width: 1240px; }
    .cabecera { max-width: 1240px; }
  }

  @media (max-height: 480px) and (orientation: landscape) {
    .contenido { max-width: 860px; grid-template-columns: 1fr 1fr; padding-bottom: 48px; }
    .contenido.columna-unica { max-width: 860px; grid-template-columns: 1fr 1fr; }
    .cabecera { padding-top: 8px; padding-bottom: 0; }
    .cabecera .display { font-size: 18px; }
    .btn-refrescar { width: 38px; height: 38px; font-size: 17px; }
    .cabecera-compacta { padding-top: 8px !important; padding-bottom: 0 !important; }
    .cabecera-compacta .display { font-size: 18px !important; }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation: none !important; transition: none !important; }
  }
`;
