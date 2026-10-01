# QA — identidad e historia de la murga (v6)

Fecha: 2026-10-01. Fuente: este repositorio, servido en `http://localhost:5174/`.

## Verificación automática

- `npm test`: 50 pruebas aprobadas (36 de simulación, 12 de personajes y 2 de cosméticos).
- `npm run build`: TypeScript y Vite completados. Permanece el aviso de tamaño del paquete JavaScript, que incluye Three.js.
- `capacitor sync`: copia y sincronización completadas para Android e iOS. No se compilaron APK/IPA ni se probaron dispositivos físicos en esta revisión.
- La simulación prueba 52 cierres anuales: retiene las últimas 50 fichas, conserva los contadores y permite cargar el guardado dentro del límite de tamaño.

## Partida comprobada en Chrome

Se usó una pestaña de QA y controles normales del juego, sin editar el estado interno ni el almacenamiento desde herramientas de navegador.

1. Una partida v5 migró a v6 conservando temporada, jornada, elenco, contrataciones, vestuario, caja, reputación y decisiones. La historia comenzó vacía, sin inventar campañas previas.
2. El formulario rechazó un nombre con etiquetas HTML. Normalizó los espacios de «Los del Andén» y guardó el barrio «La Teja». Cambiar la identidad no consumió dinero, energía ni jornadas.
3. El nombre apareció en el escenario, las pantallas de gestión, el premio y la clasificación. Persistió al recargar.
4. Se completaron admisión, primera rueda, segunda rueda y Liguilla. El historial mostró el índice de admisión por separado y mantuvo reservadas las notas del concurso hasta los fallos.
5. La campaña terminó campeona: 88,9 + 88,8 + 88,9 = 266,6 puntos. La admisión (95,8) no se sumó al concurso.
6. El cierre guardó ingresos de $333.000, gastos de $1.267.000, saldo anual de −$934.000 y caja final de $266.000 UYU. Conservó la identidad y los 17 integrantes de ese año.
7. Al pasar a la temporada 2, la caja fue $1.069.500: $266.000 de remanente + $850.000 de financiación ficticia − $46.500 de renovaciones. Estos movimientos no cambiaron las cuentas archivadas de la temporada 1.
8. Los contadores registraron una temporada, una Liguilla y un título archivados. La comparación del elenco mostró la ganancia anual de experiencia y fama (en esta partida, +2,0 XP redondeados y +8 de fama).
9. Se cambió el nombre de la temporada 2 a «Los del Andén Renovada». El cierre anterior siguió siendo «Los del Andén». Tras recargar, persistieron ambos nombres, la ficha histórica, los contadores y la caja; no se repitió la renovación.

## Presentación

- Inspección visual de escritorio y de un viewport de 390 × 844 píxeles CSS.
- Formulario, portada, finanzas y ficha histórica sin desbordamiento horizontal de página ni de diálogo en tamaño móvil.
- Se verificaron los accesos desde El barrio y La temporada, las secciones desplegables y el elenco histórico.
- No hubo errores de consola en la comprobación final. El escenario conservó su canvas 3D.
- Se restauró el tamaño normal del navegador al terminar.

La comprobación móvil corresponde al navegador redimensionado; quedan pendientes la interacción táctil y el rendimiento en Android/iPhone físicos.
