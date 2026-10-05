# PRD-03 · Difusión a espectadores por RTMP y HLS

| Campo | Valor |
| --- | --- |
| Estado | Implementado |
| Versión | 1.1 |
| Última revisión | 2026-10-05 |
| Proyectos | backend, frontend |

## 1. Contexto

La supervisión por WebRTC de PRD-02 solo admite unos pocos espectadores. La difusión permite que cualquier
equipo de la red siga la sesión.

## 2. Problema

Hay compañeros o responsables que quieren ver la sesión sin estar en el aula, y no se puede cargar el equipo
del alumno con una conexión por cada uno.

## 3. Objetivos

- Un enlace que se pueda compartir y que abra el directo en cualquier equipo de la red.
- Que la audiencia crezca apoyándose en la caché HTTP, a cambio de unos segundos de retardo.

## 4. Usuarios y escenarios

El instructor copia el enlace del directo y lo abre otro equipo. La página del espectador enseña el vídeo, el
nombre del alumno y cuántos riesgos lleva identificados.

## 5. Alcance

El navegador envía el vídeo al backend por WebSocket. El backend lo publica por RTMP firmado en un servidor RTMP
embebido, lo empaqueta en HLS y lo sirve en la página `/directo/<id>`.

## 6. Requisitos funcionales

| Id | Requisito |
| --- | --- |
| RF-01 | La ingesta arranca sola cuando el alumno se pone las gafas. |
| RF-02 | El servidor manda `ready` antes de aceptar vídeo, para que no se pierda la cabecera del contenedor. |
| RF-03 | La emisión pasa por `STARTING`, `LIVE` y `ENDED`, y cada cambio se notifica por SSE. |
| RF-04 | Las URL RTMP van firmadas y caducan. Publicar o leer sin firma se rechaza. |
| RF-05 | Si la página se abrió por `localhost`, el enlace de difusión usa la IP de la red local. |
| RF-06 | La página del espectador tiene modo de pantalla completa. |

## 7. Requisitos no funcionales

| Id | Requisito |
| --- | --- |
| RNF-01 | Retardo objetivo de 2 a 3 s, con un fotograma clave por segundo, segmentos de 1 s y el reproductor a 1,5 s del directo. |
| RNF-02 | La playlist se guarda en caché 1 s y los segmentos se marcan como inmutables. |
| RNF-03 | La ingesta sale siempre a 1280 px de ancho con un alto par, mida lo que mida el lienzo. |
| RNF-04 | Las órdenes de FFmpeg funcionan con la versión del contenedor (5.1) y con la del host (9.0). |

## 8. Criterios de aceptación

| Id | Criterio | Verificación |
| --- | --- | --- |
| CA-01 | El servidor RTMP acepta la firma generada, y la rechaza cuando caduca. | `backend/tests/rtmp-signature.test.ts` |
| CA-02 | La ingesta escala a un ancho fijo con alto par, y ninguna entrada usa `nobuffer`. | `backend/tests/ffmpeg.test.ts` |
| CA-03 | Vite y nginx reenvían al backend todas sus rutas públicas. | `frontend/tests/proxy-routes.test.ts` |
| CA-04 | Una emisión llega a `LIVE` y su HLS se reproduce desde otro equipo por la IP de la red. | Comprobación manual |

## 9. Métricas

El retardo medido entre la vista del alumno y el directo HLS, y el número de espectadores a la vez.

## 10. Dependencias

FFmpeg, ffprobe, el servidor RTMP embebido y la escena de PRD-05 como fuente del vídeo.

## 11. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Con la pestaña del alumno en segundo plano, el navegador frena el lienzo y la emisión se corta. | La pestaña del alumno tiene que quedar visible. |
| Con `-fflags nobuffer`, FFmpeg no decodifica el WebM del navegador. | Un test impide usar esa opción. |

## 12. Fuera de alcance

HLS de baja latencia con segmentos parciales, y una CDN.

## 13. Decisiones

| Fecha | Decisión | Motivo |
| --- | --- | --- |
| 2026-10-05 | La difusión arranca siempre con la sesión. | La misma señal alimenta la grabación de PRD-04. |

## 14. Referencias

- Backend: `backend/src/modules/live-streams/`.
- Frontend: `frontend/src/features/live/`, `frontend/src/shared/share-url.ts`, `frontend/vite.config.ts` y `frontend/nginx/default.conf.template`.
