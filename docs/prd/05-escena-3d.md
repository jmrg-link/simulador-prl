# PRD-05 · Escena 3D y simulación de las gafas

| Campo | Valor |
| --- | --- |
| Estado | Implementado |
| Versión | 1.1 |
| Última revisión | 2026-10-05 |
| Proyectos | frontend |

## 1. Contexto

Como no hay gafas físicas, el navegador simula lo que el alumno vería con el visor puesto. Que el entorno sea
creíble forma parte de la formación (PRD-00).

## 2. Problema

Una escena hecha con figuras geométricas no se parece a un puesto de trabajo, y la práctica pierde valor.

## 3. Objetivos

- Un taller que parezca real por sus materiales, su iluminación y objetos que se reconocen.
- La sensación de ponerse unas gafas y mirar alrededor.

## 4. Usuarios y escenarios

El alumno ve en tercera persona cómo el operario se coloca el visor. Después la vista pasa a primera persona, y
el alumno gira la cabeza con el ratón o con las flechas.

## 5. Alcance

Los modelos salen de scripts de Blender exportados a glTF, con assets CC0 de Poly Haven. La escena se ilumina con
un HDRI, y el grafismo de emisión se pinta dentro del mismo lienzo.

## 6. Requisitos funcionales

| Id | Requisito |
| --- | --- |
| RF-01 | En la secuencia de entrada, el operario sostiene el visor, se lo pone y la cámara pasa a su vista. |
| RF-02 | En la vista inmersiva, la cabeza se gira arrastrando el ratón o con las flechas del teclado. |
| RF-03 | Cada riesgo es un nodo `Hazard_<id>` del modelo, y su `<id>` coincide con el del catálogo del backend. |
| RF-04 | El riesgo que se está mirando se resalta en rojo, y el ya identificado en morado. |
| RF-05 | El HUD de la lente (viñeta y retícula con su progreso) y el grafismo de emisión se pintan dentro del lienzo y nunca se desenfocan. |
| RF-06 | La vista del alumno tiene un botón de pantalla completa. |
| RF-07 | Mientras se descargan los modelos, el lienzo muestra un aviso de carga. |

## 7. Requisitos no funcionales

| Id | Requisito |
| --- | --- |
| RNF-01 | Materiales PBR con texturas reales y tone mapping Neutral, para que los colores de seguridad no cambien. |
| RNF-02 | Modelos comprimidos con meshopt y texturas WebP, con un peso total por debajo de 10 MB. |
| RNF-03 | Imagen nítida con multimuestreo 4×. Si hay profundidad de campo, es sutil, porque la pantalla de un visor real es nítida entera. |
| RNF-04 | Los modelos se regeneran igual cada vez con un solo comando, y se versionan. |
| RNF-05 | Los lectores de pantalla tienen una descripción textual de la escena. |

## 8. Criterios de aceptación

| Id | Criterio | Verificación |
| --- | --- | --- |
| CA-01 | `pnpm run assets` regenera los tres modelos y el HDRI. | Comprobación manual |
| CA-02 | En la vista inmersiva, mantener la mirada sobre la carga suspendida la identifica. | Comprobación manual |
| CA-03 | Se filtran los avisos conocidos de las dependencias, y los demás siguen apareciendo. | `frontend/tests/three-console.test.ts` |

## 9. Métricas

El tiempo de carga de la escena y los fotogramas por segundo en la vista inmersiva.

## 10. Dependencias

Blender 5.2 para regenerar los modelos, three.js y su integración con React.

## 11. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Un hueco entre objetos deja la retícula sin nada que mirar. | Los riesgos se modelan sin huecos en el centro de la vista. |
| La versión estable de la integración con React todavía usa un reloj marcado como obsoleto. | El aviso se filtra hasta pasar a la siguiente versión mayor. |

## 12. Fuera de alcance

Un avatar fotorrealista con rostro, gafas físicas y seguimiento de posición.

## 14. Referencias

- Modelos: `frontend/blender/*.py` y `frontend/public/models/`, que incluye la lista de assets CC0 usados.
- Escena: `frontend/src/features/headset/scene/` y `frontend/src/features/headset/HeadsetSimulator.tsx`.
