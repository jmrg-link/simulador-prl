# PRD-01 · Formación evaluable

| Campo | Valor |
| --- | --- |
| Estado | Implementado |
| Versión | 1.2 |
| Última revisión | 2026-10-05 |
| Proyectos | backend, frontend |

## 1. Contexto

Es el centro del producto descrito en PRD-00: una prueba práctica con una situación de partida, un tiempo
límite, una decisión por cada riesgo y un veredicto al final.

## 2. Problema

Ver un riesgo no sirve de mucho si el alumno no sabe qué hacer con él. Y sin un criterio de aprobado conocido
de antemano, el instructor no puede certificar nada.

## 3. Objetivos

- Evaluar dos cosas en cada riesgo: que el alumno lo identifique y que elija la actuación correcta.
- Dar un veredicto de apto o no apto con un criterio que el alumno conoce antes de empezar.
- Impedir que el alumno vea la respuesta mientras dura la prueba.

## 4. Usuarios y escenarios

El alumno escribe su nombre en el pase de formación y se pone las gafas. Recorre el taller durante tres
minutos y, cuando mantiene la mirada sobre un riesgo, el sistema lo da por identificado y le pide elegir entre
tres actuaciones. Al quitarse las gafas, o cuando se acaba el tiempo, ve su informe.

## 5. Alcance

El escenario «Taller de mantenimiento» tiene cuatro riesgos: una carga suspendida y un cable pelado, de
severidad alta, y un derrame de aceite y un extintor bloqueado, de severidad media.

## 6. Requisitos funcionales

| Id | Requisito |
| --- | --- |
| RF-01 | El briefing muestra la situación de partida, el objetivo, el tiempo disponible, el umbral de aprobado y cómo se puntúa. |
| RF-02 | Un riesgo queda identificado cuando la mirada se mantiene sobre él 1,2 s. Un riesgo ya identificado no vuelve a contar. |
| RF-03 | Al identificar un riesgo, el alumno elige una de tres actuaciones con las teclas 1, 2 o 3 o con los botones. |
| RF-04 | Mientras hay una decisión pendiente, la mirada no identifica riesgos nuevos. |
| RF-05 | El servidor corrige cada decisión. La respuesta correcta no llega al cliente mientras la sesión sigue abierta. |
| RF-06 | Durante la prueba, las métricas dicen si el alumno decidió, pero no si acertó. |
| RF-07 | La prueba dura tres minutos y se cierra sola al terminar. El servidor rechaza los eventos que llegan fuera de tiempo, con 5 s de margen. |
| RF-08 | Cada riesgo vale dos puntos, uno por identificarlo y otro por acertar la actuación. |
| RF-09 | Aprueba quien obtiene el 75 % de los puntos o más y resuelve bien todos los riesgos de severidad alta. |
| RF-10 | El informe muestra el veredicto, la nota y cada criterio con su resultado. Por cada riesgo enseña la ficha, la actuación elegida frente a la correcta y la norma aplicable. |
| RF-11 | Cada riesgo tiene una zona de mirada invisible que envuelve sus piezas con 30 cm de holgura, para que una pieza fina como un cable no exija una puntería exacta. No hay pistas: la prueba sigue siendo de búsqueda. |

## 7. Requisitos no funcionales

| Id | Requisito |
| --- | --- |
| RNF-01 | La corrección es determinista y solo la hace el backend. |
| RNF-02 | Las decisiones se pueden tomar con el teclado, y los lectores de pantalla las anuncian. |
| RNF-03 | El acierto se marca en verde y el error en rojo, con un contraste de al menos 4,5:1 y siempre acompañado de texto. |

## 8. Criterios de aceptación

| Id | Criterio | Verificación |
| --- | --- | --- |
| CA-01 | El escenario que sirve la API no incluye `correctOption`. | `backend/tests/trainings.routes.test.ts` |
| CA-02 | Decidir sobre un riesgo no identificado devuelve 409, igual que decidir dos veces sobre el mismo. | `backend/tests/trainings.routes.test.ts` |
| CA-03 | Con la sesión abierta, `measureCorrect` y `correctOption` valen `null`; al cerrarla aparecen. | `backend/tests/trainings.routes.test.ts` |
| CA-04 | Cuatro riesgos identificados con tres aciertos dan un 88 % y apto. Fallar un riesgo de severidad alta da no apto. | `backend/tests/trainings.routes.test.ts` |
| CA-05 | La mirada sostenida identifica un riesgo, y el contador vuelve a cero si la mirada se aparta. | `frontend/tests/gaze-tracker.test.ts` |
| CA-06 | Una mirada que pasa a 20 cm de un cable lo encuentra, y una que pasa más allá del margen no. | `frontend/tests/gaze-zones.test.ts` |

## 9. Métricas

La nota media, el porcentaje de aptos, el tiempo medio de reacción por riesgo y los riesgos que más se pasan
por alto.

## 10. Dependencias

PRD-05 para la escena y la mirada, PRD-06 para la interfaz, y PostgreSQL con Prisma para guardar los resultados.

## 11. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La carga de los modelos se come parte del tiempo de la prueba. | La cuenta atrás se ve desde el principio y el lienzo avisa de que está cargando. |
| Los relojes del cliente y del servidor no coinciden. | El servidor da 5 s de margen. |

## 12. Fuera de alcance

Varios intentos en la misma sesión, puntos ponderados por severidad y preguntas aleatorias.

## 13. Decisiones

| Fecha | Decisión | Motivo |
| --- | --- | --- |
| 2026-10-05 | La respuesta correcta solo se revela al cerrar la sesión. | En modo aula el alumno ve la misma pantalla que el instructor. |
| 2026-10-05 | En el informe y en el veredicto, lo correcto va en verde y lo incorrecto en rojo. | El resultado se entiende de un vistazo. |
| 2026-10-05 | Zona de mirada más amplia en vez de pistas guiadas. | Se evalúa si el alumno ve el riesgo, no su puntería; una pista cambiaría lo que mide la prueba. |

## 14. Referencias

- Backend: `backend/src/modules/trainings/scenario.ts`, `metrics.ts`, `trainings.service.ts` y `trainings.routes.ts`.
- Frontend: `frontend/src/features/classroom/` (`Briefing`, `SessionDesk`, `Debriefing`, `VerdictPanel`, `HazardCoupon`) y `frontend/src/features/headset/gaze-tracker.ts`.
