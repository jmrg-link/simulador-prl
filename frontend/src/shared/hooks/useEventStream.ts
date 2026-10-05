/**
 * Suscripción a un endpoint SSE con validación Zod de cada evento.
 */
import { useEffect, useState } from "react";
import type { z } from "zod";

/** Último valor recibido de un SSE junto a la URL que lo produjo. */
interface Latest<T> {
  url: string;
  value: T;
}

/**
 * Devuelve el último evento válido de `url`, o `undefined` hasta el primero.
 * Con `url` nulo no abre conexión. Los eventos que no cumplen el esquema se descartan.
 */
export const useEventStream = <T>(url: string | null, schema: z.ZodType<T>): T | undefined => {
  const [latest, setLatest] = useState<Latest<T>>();
  useEffect(() => {
    if (!url) return;
    const source = new EventSource(url);
    source.onmessage = (event: MessageEvent<string>) => {
      const parsed = schema.safeParse(JSON.parse(event.data));
      if (parsed.success) setLatest({ url, value: parsed.data });
    };
    return () => source.close();
  }, [url, schema]);
  return latest?.url === url ? latest.value : undefined;
};
