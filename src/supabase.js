// El cliente de Supabase, igual en las tres apps. Cada negocio tiene su
// PROPIO proyecto de Supabase (decisión del 30-ago: el aislamiento es por
// construcción); lo único compartido es cómo se crea el cliente.
import { createClient } from "@supabase/supabase-js";

export function crearCliente(url, key) {
  if (!url || !key) {
    console.error("Faltan las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY");
  }
  return createClient(url, key);
}
