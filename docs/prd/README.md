# Documentos de requisitos de producto

Cada capacidad del Simulador PRL tiene un PRD, y todos siguen la estructura de `_plantilla.md`. El PRD dice
qué tiene que hacer el producto y cómo se comprueba que lo hace. El código y los tests lo implementan.

| PRD | Capacidad | Estado |
| --- | --- | --- |
| [00](00-vision-producto.md) | Visión de producto: usuarios, propósito y principios | Vigente |
| [01](01-formacion-evaluable.md) | Formación evaluable con decisiones, tiempo y veredicto | Implementado |
| [02](02-supervision-webrtc.md) | Supervisión del instructor en directo por WebRTC | Implementado |
| [03](03-difusion-rtmp-hls.md) | Difusión a espectadores por RTMP y HLS | Implementado |
| [04](04-grabacion-capitulos.md) | Grabación de la sesión con capítulos por riesgo | Implementado |
| [05](05-escena-3d.md) | Escena 3D del taller y simulación de las gafas | Implementado |
| [06](06-interfaz-modo-aula.md) | Interfaz en modo aula y sistema visual | Implementado |

## Cómo se mantienen

Un requisito nuevo se escribe primero en su PRD, junto con el criterio que lo acepta, y después se programa.
Cada criterio de aceptación enlaza el test o la comprobación manual que lo demuestra. Las decisiones se anotan
con fecha y motivo en la sección 13 del PRD que afectan.

Los PRD describen cómo es el producto ahora. La evolución queda en el historial de git.
