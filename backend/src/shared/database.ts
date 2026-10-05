/**
 * Cliente Prisma sobre PostgreSQL. Prisma 7 exige un driver adapter; aquí `@prisma/adapter-pg`.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

/** Crea el único cliente de base de datos de la aplicación. */
export const createDatabase = (connectionString: string): PrismaClient =>
  new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

export type { PrismaClient };
