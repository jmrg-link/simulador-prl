# PRD-04 · Grabación de la sesión con capítulos

| Campo | Valor |
| --- | --- |
| Estado | Implementado |
| Versión | 1.1 |
| Última revisión | 2026-10-05 |
| Proyectos | backend, frontend |

## 1. Contexto

El debriefing de PRD-01 mejora mucho si alumno e instructor pueden saltar al momento exacto de cada riesgo.

## 2. Problema

Sin grabación, el repaso depende de lo que cada uno recuerde. Con una grabación sin índice, hay que buscar cada
momento a mano.

## 3. Objetivos

- Que toda sesión quede grabada sin que nadie tenga que activarlo.
- Que el vídeo tenga un capítulo por cada riesgo identificado y se pueda descargar.

## 4. Usuarios y escenarios

Al terminar la sesión, el informe muestra el vídeo. El instructor salta al capítulo de un riesgo para comentar
con el alumno la decisión que tomó.

## 5. Alcance

El servidor graba a partir de la misma señal que la difusión, al terminar remuxa el archivo con capítulos y el
informe lo reproduce.

## 6. Requisitos funcionales

| Id | Requisito |
| --- | --- |
| RF-01 | Mientras dura la emisión, el empaquetador escribe un MP4 fragmentado junto al HLS, sin recodificar. |
| RF-02 | Al terminar, la grabación pasa a `PROCESSING`, se remuxa con capítulos y queda en `READY`. |
| RF-03 | El vídeo tiene un capítulo «Inicio de la formación» y uno por cada riesgo identificado, en el instante en que se identificó. |
| RF-04 | El informe consulta el estado de la grabación hasta que está lista o ha fallado, y muestra cuál de las dos. |
| RF-05 | El informe enseña el vídeo con una lista de capítulos para saltar entre ellos y un enlace de descarga. |
| RF-06 | Solo se sirven los MP4 terminados. Los archivos temporales no son accesibles. |

## 7. Requisitos no funcionales

| Id | Requisito |
| --- | --- |
| RNF-01 | El MP4 que se está escribiendo se puede leer aunque el proceso se corte, incluso con `SIGKILL`. |
| RNF-02 | El MP4 final se sirve con soporte de `Range` (206), que el reproductor necesita para saltar entre capítulos. |
| RNF-03 | Al reiniciar el backend, las grabaciones que quedaron a medias se marcan como fallidas. |

## 8. Criterios de aceptación

| Id | Criterio | Verificación |
| --- | --- | --- |
| CA-01 | Los capítulos salen ordenados y encadenados, y se descarta lo que cae después del final del vídeo. | `backend/tests/chapters.test.ts` |
| CA-02 | El archivo de capítulos escapa los caracteres especiales de su formato. | `backend/tests/chapters.test.ts` |
| CA-03 | La grabación se escribe como MP4 fragmentado con vaciado inmediato. | `backend/tests/ffmpeg.test.ts` |
| CA-04 | Una sesión real termina en `READY` con su MP4 y sus capítulos, y desde el informe se reproduce y se descarga. | Comprobación manual |

## 9. Métricas

El tiempo desde que acaba la sesión hasta que la grabación está en `READY`, y el porcentaje de grabaciones que fallan.

## 10. Dependencias

La señal de PRD-03, FFmpeg, ffprobe y espacio en disco o en un volumen.

## 11. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El instante del evento y el del vídeo no coinciden del todo. | Los capítulos se calculan desde el momento real en que empezó la grabación. |
| El disco se llena. | Queda fuera del prototipo: no hay rotación de grabaciones. |

## 12. Fuera de alcance

La rotación y el borrado automático de grabaciones, y los capítulos para riesgos que no se identificaron.

## 14. Referencias

- Backend: `backend/src/modules/recordings/`, `backend/src/shared/media/ffmpeg-process.ts` y `backend/src/modules/live-streams/ffmpeg.ts`.
- Frontend: `frontend/src/features/classroom/SessionRecording.tsx`.
