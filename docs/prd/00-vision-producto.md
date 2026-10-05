# PRD-00 · Visión de producto

| Campo | Valor |
| --- | --- |
| Estado | Vigente |
| Versión | 1.1 |
| Última revisión | 2026-10-05 |
| Proyectos | backend, frontend |

## 1. Contexto

El Simulador PRL es un prototipo de formación práctica en prevención de riesgos laborales con gafas de
realidad virtual. El alumno recorre un puesto de trabajo, señala los riesgos con la mirada y elige qué hacer
con cada uno. Mientras tanto el instructor ve su vista en directo, y la sesión se graba para repasarla después.

## 2. Problema

La formación en PRL suele quedarse en la teoría, y practicar en el puesto real tiene el inconveniente obvio de
que un error allí hace daño. No hay un sitio donde equivocarse sin consecuencias, recibir una nota objetiva y
revisar luego con el instructor qué pasó.

## 3. Objetivos

- El alumno practica la identificación de riesgos y la elección de la actuación correcta sin peligro.
- El instructor ve lo mismo que el alumno, en el momento en que ocurre.
- Cada sesión acaba con una evaluación objetiva y un vídeo para el repaso.

## 4. Usuarios y escenarios

El alumno es un trabajador que hace la práctica con el visor puesto; en el prototipo el visor se simula en el
navegador y la cabeza se gira con el ratón o el teclado. El instructor es el técnico de prevención que supervisa
la sesión y dirige el repaso. Además, cualquier persona de la red puede seguir la sesión como espectadora con un
enlace.

Una sesión normal tiene tres partes: el briefing, un recorrido de tres minutos y el debriefing con el vídeo.

## 5. Alcance

Hay un único escenario, un taller de mantenimiento con cuatro riesgos. Se usa en modo aula: alumno e instructor
comparten pantalla, pero se comunican por la red igual que si estuvieran en equipos distintos.

## 6. Principios de producto

1. El instructor ve lo que ve el alumno, así que todo lo importante tiene que estar dentro de la emisión.
2. Cada riesgo explica qué es, qué puede pasar, qué hay que hacer y qué norma lo exige.
3. La conexión, la grabación, el tiempo y el progreso están siempre a la vista.
4. Alguien que lo usa por primera vez llega al final sin instrucciones externas.
5. La evaluación la corrige el servidor, y el alumno no puede ver la respuesta antes de tiempo.

## 7. Requisitos no funcionales transversales

| Id | Requisito |
| --- | --- |
| RNF-00.1 | Interfaz en español de España, con el registro de un técnico de prevención y sin alarmismo. |
| RNF-00.2 | Accesibilidad WCAG 2.2 AA: contraste AA, todo operable con teclado y una alternativa textual a la escena 3D. |
| RNF-00.3 | La normativa se cita del texto consolidado de boe.es y solo cuando se ha comprobado. |
| RNF-00.4 | El producto no muestra clientes, testimonios ni métricas inventados. |
| RNF-00.5 | La marca es propia y neutra: «Simulador PRL». |

## 12. Fuera de alcance

Gafas físicas, más de un escenario, cuentas de usuario y despliegue público.

## 14. Referencias

- Contrato de la API, compartido entre los dos proyectos: `backend/src/modules/*` y `frontend/src/shared/api/schemas.ts`.
- Escenario y contenido didáctico: `backend/src/modules/trainings/scenario.ts`.
