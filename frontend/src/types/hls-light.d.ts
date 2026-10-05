/**
 * hls.js 1.7.3 exporta `hls.js/light` sin declaraciones propias; la API es la misma que la del
 * paquete completo, así que se reexportan sus tipos.
 */
declare module "hls.js/light" {
  export { default } from "hls.js";
  export * from "hls.js";
}
