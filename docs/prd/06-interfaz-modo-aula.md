# PRD-06 · Interfaz en modo aula y sistema visual

| Campo | Valor |
| --- | --- |
| Estado | Implementado |
| Versión | 1.1 |
| Última revisión | 2026-10-05 |
| Proyectos | frontend |

## 1. Contexto

En el aula, alumno e instructor comparten pantalla (PRD-00). La interfaz guía la sesión completa y da a cada uno
su información sin cambiar de vista.

## 2. Problema

Repartir el flujo en pestañas obliga a abrir varias ventanas y corta la emisión al cambiar de vista. Un panel
genérico, además, no transmite que se está haciendo una inspección.

## 3. Objetivos

- Un único recorrido guiado: briefing, recorrido y evaluación.
- Alumno e instructor lado a lado, cada uno con lo que necesita.
- Un lenguaje visual propio que se mantenga igual en la interfaz, en la emisión y en la escena 3D.

## 4. Usuarios y escenarios

Instructor y alumno en el aula, frente a un monitor o un proyector. La página ocupa todo el ancho de la ventana
y también funciona en móvil.

## 5. Alcance

La cabecera con las fases, el briefing, la mesa de sesión con el puesto del alumno y el del instructor, el
informe y la página del espectador.

## 6. Requisitos funcionales

| Id | Requisito |
| --- | --- |
| RF-01 | La cabecera marca la fase actual con pestañas de billete. |
| RF-02 | El puesto del instructor tiene selector de señal (WebRTC o HLS), estado de la grabación, enlace del directo y talonario de riesgos. |
| RF-03 | A 1440 × 900 se ven los cuatro cupones del talonario sin hacer scroll. |
| RF-04 | El talonario no muestra el nombre de un riesgo hasta que se identifica, e indica si la decisión está pendiente o registrada. |
| RF-05 | El informe empieza con el panel de veredicto: el sello de apto o no apto y cada criterio con su valor y si se cumplió. |
| RF-06 | La página ocupa todo el ancho de la ventana y no se desborda en horizontal en móvil. |

## 7. Requisitos no funcionales: sistema visual

El concepto es el talonario de inspección. Cada riesgo es un cupón de un talonario de billetes, en azul de
compañía y rojo de reactor, con papel de cupón sobre cartulina y las cifras en el morado del papel carbón. En el
talonario no se borra nada: un riesgo se sella como identificado o se anula si se pasó por alto.

| Id | Requisito |
| --- | --- |
| RNF-01 | La paleta vive en los tokens del tema (`frontend/src/index.css`): `navy`, `navy-soft`, `jet`, `jet-deep`, `jet-light`, `coupon`, `stock`, `rule`, `carbon`, `carbon-copy`, `ok`, `ok-tint` y `jet-tint`. La interfaz, el grafismo en Canvas y los realces 3D leen los mismos tokens. |
| RNF-02 | El estado de un riesgo usa el morado carbón si se identificó y el rojo si se pasó por alto o se está mirando. |
| RNF-03 | El resultado de una evaluación usa el verde para correcto o apto y el rojo para incorrecto o no apto, siempre con texto además del color. |
| RNF-04 | Tipografía: Archivo variable al 68 % de anchura y peso 800 en titulares, al 78 % con 0,08em de espaciado en rótulos y al 100 % en el texto de lectura. Toda cifra va en Martian Mono con números tabulares. |
| RNF-05 | Todas las esquinas son rectas. La forma la dan las muescas de 9 px, la perforación de 8 px y las pestañas achaflanadas 6 px. |
| RNF-06 | Solo los documentos llevan sombra, y siempre la misma, la de una hoja de papel. En los elementos con muescas la sombra va en el contenedor padre. |
| RNF-07 | Cada pantalla tiene una sola acción en rojo relleno. |
| RNF-08 | En el grafismo de emisión, sobre un lienzo lógico de 1280 × 720, ningún rótulo baja de 22 px. En la interfaz, ningún texto baja de 0,6875rem. |
| RNF-09 | Todo texto cumple el contraste AA, y el foco se ve con un contorno rojo de 2 px. |
| RNF-10 | Los iconos son propios: trazo de 1,75 px, terminaciones cuadradas y rejilla de 24 px. |
| RNF-11 | Ninguna función tiene comentarios en su cuerpo. Cada declaración lleva encima su JSDoc en español, y el lint lo exige. |

## 8. Criterios de aceptación

| Id | Criterio | Verificación |
| --- | --- | --- |
| CA-01 | El lint rechaza los comentarios dentro de funciones y las declaraciones sin JSDoc con descripción. | `pnpm run lint` |
| CA-02 | A 1440 × 900, los cuatro cupones caben con la misma altura. | Comprobación manual |
| CA-03 | A 390 px de ancho no hay desbordamiento horizontal. | Comprobación manual |
| CA-04 | El verde y el rojo superan 4,5:1 sobre sus fondos. | Cálculo de contraste |

## 9. Métricas

Cuánto se tarda en empezar la prueba desde la primera carga y cuántos errores de uso hay en el primer intento.

## 10. Dependencias

React 19, Tailwind 4 con el tema definido en CSS, y las fuentes Archivo y Martian Mono servidas desde el propio proyecto.

## 13. Decisiones

| Fecha | Decisión | Motivo |
| --- | --- | --- |
| 2026-10-05 | Modo aula en una sola pantalla en vez de una vista por papel. | Cambiar de vista cortaba la emisión. |
| 2026-10-05 | El verde se usa solo para resultados de evaluación. | El veredicto y cada decisión se leen de un vistazo. |

## 14. Referencias

`frontend/src/App.tsx`, `frontend/src/features/classroom/`, `frontend/src/shared/ui/` y `frontend/src/index.css`.
