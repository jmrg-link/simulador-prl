/**
 * Proceso FFmpeg con parada en escalera y lectura de la duración de un archivo con ffprobe.
 * Lo comparten la ingesta en directo y el posprocesado de las grabaciones.
 */
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";

const SECOND_SIGINT_MS = 1_500;
const SIGKILL_MS = 3_000;

/** Registra una línea de FFmpeg; la del final esperado como información y el resto como aviso. */
const logLine = (label: string, line: string, expectedEnd: RegExp | undefined): void => {
  if (expectedEnd?.test(line)) console.info(`[${label}] fin de la señal de entrada`);
  else console.warn(`[${label}] ${line}`);
};

/** Envía `signal` si el proceso sigue vivo. */
const signal = (child: ChildProcess, name: NodeJS.Signals): void => {
  if (child.exitCode === null && child.signalCode === null) child.kill(name);
};

/** Proceso FFmpeg en marcha. */
export class FfmpegProcess {
  readonly #child: ChildProcess;
  /** Se resuelve con el código de salida (o `null` si lo mató una señal). */
  readonly exited: Promise<number | null>;

  /**
   * Lanza FFmpeg. Su stderr se reenvía a consola con `label` como prefijo.
   *
   * @param ffmpegPath - Binario de FFmpeg.
   * @param args - Argumentos, sin el binario.
   * @param label - Prefijo de las líneas de log.
   * @param expectedEnd - Mensaje con el que FFmpeg anuncia un final esperado; se registra como
   * información y no como aviso.
   */
  constructor(ffmpegPath: string, args: string[], label: string, expectedEnd?: RegExp) {
    this.#child = spawn(ffmpegPath, args, { stdio: ["pipe", "ignore", "pipe"] });
    this.#child.stdin?.on("error", () => undefined);
    this.#child.stderr?.on("data", (data: Buffer) => logLine(label, data.toString().trimEnd(), expectedEnd));
    this.exited = new Promise((resolve) => {
      this.#child.once("error", (error) => {
        console.error(`[${label}] no se pudo lanzar FFmpeg: ${error.message}`);
        resolve(null);
      });
      this.#child.once("exit", (code) => resolve(code));
    });
  }

  /** Escribe en stdin; descarta en silencio si el proceso ya cerró la entrada. */
  write(chunk: Buffer): void {
    if (this.#child.stdin?.writable) this.#child.stdin.write(chunk);
  }

  /** Cierra stdin para que FFmpeg vacíe y termine por sí mismo. */
  endInput(): void {
    this.#child.stdin?.end();
  }

  /**
   * Detiene el proceso: SIGINT para que cierre los ficheros limpiamente, un segundo SIGINT
   * si sigue bloqueado en una lectura de red, y SIGKILL como último recurso.
   */
  async stop(): Promise<void> {
    signal(this.#child, "SIGINT");
    const second = setTimeout(() => signal(this.#child, "SIGINT"), SECOND_SIGINT_MS);
    const kill = setTimeout(() => signal(this.#child, "SIGKILL"), SIGKILL_MS);
    await this.exited;
    clearTimeout(second);
    clearTimeout(kill);
  }
}

/**
 * Duración de un archivo multimedia en milisegundos.
 *
 * @throws Error si ffprobe falla o no devuelve una duración.
 */
export const probeDurationMs = async (ffprobePath: string, file: string): Promise<number> => {
  const { stdout } = await promisify(execFile)(ffprobePath, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  const seconds = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(seconds)) throw new Error(`ffprobe no devolvió duración para ${file}`);
  return Math.round(seconds * 1000);
};
