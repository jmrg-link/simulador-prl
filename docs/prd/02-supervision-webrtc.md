# PRD-02 · Supervisión en directo por WebRTC

| Campo | Valor |
| --- | --- |
| Estado | Implementado |
| Versión | 1.1 |
| Última revisión | 2026-10-05 |
| Proyectos | backend, frontend |

## 1. Contexto

Aplica el primer principio de PRD-00: el instructor ve lo que ve el alumno, con el menor retardo posible.

## 2. Problema

El instructor tiene que poder intervenir mientras el alumno actúa. Con varios segundos de retardo llega tarde.

## 3. Objetivos

- Menos de un segundo de retardo entre la vista del alumno y la del instructor.
- Si el alumno se desconecta y vuelve, la imagen se recupera sola.

## 4. Usuarios y escenarios

El instructor recibe la vista del alumno en cuanto se abre la sesión, en el modo aula o desde otro equipo de
la red.

## 5. Alcance

El backend hace la señalización por WebSocket y el vídeo viaja directamente entre navegadores. Cada sesión de
formación es una sala con un emisor y uno o varios espectadores.

## 6. Requisitos funcionales

| Id | Requisito |
| --- | --- |
| RF-01 | El emisor siempre hace la oferta, con una conexión por espectador; el espectador solo responde. |
| RF-02 | Si el emisor llega después que los espectadores, recibe a los que ya esperaban. |
| RF-03 | Un segundo emisor en la misma sala se rechaza con el código 4409. |
| RF-04 | Cuando el emisor se va, los espectadores lo saben, y reconectan solos cuando vuelve. |
| RF-05 | El servidor valida cada mensaje que entra; uno inválido recibe un error y la conexión sigue abierta. |

## 7. Requisitos no funcionales

| Id | Requisito |
| --- | --- |
| RNF-01 | El WebSocket comparte puerto con la API y rechaza con 403 cualquier `Origin` que no esté en la lista. |
| RNF-02 | Las conexiones caídas se detectan con ping y pong y se cierran. |
| RNF-03 | Si un cliente se cierra mientras aún conecta, ni el navegador ni el proxy registran errores. |

## 8. Criterios de aceptación

| Id | Criterio | Verificación |
| --- | --- | --- |
| CA-01 | La oferta y la respuesta llegan a su destinatario a través del servidor. | `backend/tests/signaling.gateway.test.ts` |
| CA-02 | Un `Origin` no permitido recibe 403 antes del handshake. | `backend/tests/signaling.gateway.test.ts` |
| CA-03 | El segundo emisor de una sala se cierra con 4409. | `backend/tests/signaling.gateway.test.ts` |
| CA-04 | Se cumplen las reglas de reenvío y la de llegada tardía del emisor. | `backend/tests/signaling.service.test.ts` |
| CA-05 | El cliente acepta los mensajes válidos del servidor y descarta los de tipo desconocido. | `frontend/tests/signaling-messages.test.ts` |

## 9. Métricas

El tiempo hasta que el instructor ve la primera imagen y el número de reconexiones por sesión.

## 10. Dependencias

PRD-05, porque el lienzo de la escena es la fuente del vídeo.

## 11. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Una conexión por espectador no escala a una audiencia grande. | Para audiencias grandes está la difusión HLS de PRD-03. |
| Redes con NAT simétrico o cortafuegos corporativos. | Fuera de la red local harán falta servidores STUN y TURN. |

## 12. Fuera de alcance

Un servidor de reenvío selectivo (SFU), el audio y los servidores STUN y TURN.

## 14. Referencias

- Backend: `backend/src/modules/signaling/` y `backend/src/shared/ws/upgrade-router.ts`.
- Frontend: `frontend/src/shared/signaling/`, `frontend/src/features/broadcast/` y `frontend/src/features/instructor/`.
