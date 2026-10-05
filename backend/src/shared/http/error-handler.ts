/**
 * Middleware de errores de Express. Express 5 reenvía aquí también las promesas rechazadas
 * de los handlers async, así que ninguna ruta necesita try/catch.
 */
import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "./http-error.ts";

/** Traduce `ZodError` a 400, `HttpError` a su código y cualquier otro error a 500 sin filtrar detalles. */
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ message: "Petición inválida", issues: error.issues });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ message: "Error interno" });
};
