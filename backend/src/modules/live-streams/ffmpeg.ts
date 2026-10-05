/**
 * Los dos perfiles de FFmpeg del flujo en directo: ingesta (WebM del navegador por stdin → H.264
 * por RTMP) y empaquetado (RTMP → HLS y, si se pide, la grabación en MP4 fragmentado).
 */
import { join } from "node:path";

/**
 * Ingesta: lee el WebM (VP8/VP9/H.264) o MP4 que manda `MediaRecorder` por stdin y lo publica
 * por RTMP en H.264 de baja latencia, que es lo que admite FLV/RTMP. El escalado a 1280 px de ancho con
 * alto par da una emisión de tamaño fijo aunque el canvas cambie, y cumple el requisito de dimensiones
 * pares de yuv420p. `no_duration_filesize` evita
 * reescribir la cabecera FLV al cerrar, que en un flujo RTMP no se puede rebobinar. La entrada no
 * lleva `-fflags nobuffer`: con ella FFmpeg descarta los primeros paquetes del WebM y no decodifica.
 */
export const ingestArgs = (rtmpUrl: string): string[] => [
  "-hide_banner", "-loglevel", "warning",
  "-fflags", "+genpts",
  "-i", "pipe:0",
  "-an",
  "-vf", "scale=1280:-2",
  "-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency",
  "-pix_fmt", "yuv420p", "-r", "30", "-g", "30", "-keyint_min", "30", "-sc_threshold", "0",
  "-f", "flv", "-flvflags", "no_duration_filesize", rtmpUrl,
];

/**
 * Empaquetado: lee el RTMP sin recodificar y escribe HLS en `outDir`. `-rw_timeout` (µs) hace
 * que FFmpeg termine solo y cierre la playlist cuando el emisor deja de enviar.
 * `temp_file` escribe cada fichero como `.tmp` y lo renombra al terminar.
 * Segmentos de 1 s con un fotograma clave por segundo en la ingesta: cada segmento empieza en uno,
 * así que el reproductor puede ir un segundo por detrás del directo en vez de varios.
 */
export const hlsArgs = (rtmpUrl: string, outDir: string, recordingPath: string | null = null): string[] => [
  "-hide_banner", "-loglevel", "warning",
  "-rw_timeout", "5000000",
  "-i", rtmpUrl,
  "-map", "0", "-c", "copy",
  "-f", "hls", "-hls_time", "1", "-hls_list_size", "6",
  "-hls_flags", "delete_segments+independent_segments+temp_file",
  "-hls_segment_filename", join(outDir, "seg-%05d.ts"),
  join(outDir, "index.m3u8"),
  ...(recordingPath ? recordingArgs(recordingPath) : []),
];

/**
 * Segunda salida del empaquetador: la misma señal sin recodificar en MP4 fragmentado, que sigue
 * siendo legible si el proceso se corta, incluso con SIGKILL gracias a `flush_packets`. Al terminar
 * se remuxa con capítulos y faststart.
 */
const recordingArgs = (path: string): string[] => [
  "-map", "0", "-c", "copy",
  "-f", "mp4", "-movflags", "+frag_keyframe+empty_moov+default_base_moof", "-flush_packets", "1",
  path,
];
