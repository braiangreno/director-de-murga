# QA — creación del espectáculo (v7)

Fecha: 2026-10-07. Proyecto: este repositorio. Vista local: `http://localhost:5174/`.

## Pruebas automáticas y compilación

- `npm test`: 59 pruebas aprobadas, incluidas 45 de simulación y 14 de personajes/cosméticos.
- `npm run build`: TypeScript y Vite completados. Continúa el aviso de paquete JavaScript mayor de 500 kB, que incluye Three.js.
- `capacitor sync`: copia y sincronización correctas para Android e iOS. No se generaron APK/IPA ni se probó hardware nativo.
- Las pruebas cubren costos, avance de una sola jornada, contratos técnicos, bloqueo por decisiones y presentaciones, enfoque de ensayo, límite por texto/arreglos, planificación confirmada, progreso completo y bonus artístico acotado.
- Una campaña por cada temática alcanza el 100% dentro de las 32 jornadas sin saltar decisiones ni concurso. Las estrategias previas siguen siendo jugables.
- Migración v6 con una temporada archivada y otra en curso: preserva caja, identidad, carreras y notas reservadas; el espectáculo de los archivos anteriores queda sin registro (`show: null`). Se verifican copias independientes, reinicio anual y el límite de 50 fichas dentro del tamaño de guardado admitido.

## Comprobación en navegador

Chrome, mediante controles normales del juego. No se editó el almacenamiento ni el estado interno desde el navegador.

1. Se retomó una partida de QA en temporada 1, jornada visible 14/32, con $700.000 UYU, energía 94 y reputación 20. El nuevo sistema comenzó sin atribuir trabajo anterior.
2. El formulario rechazó etiquetas HTML. Mientras había un título o tema sin guardar, quedaron bloqueados los trabajos y el selector de ensayo para evitar perder ese borrador al actuar.
3. Se guardó «El barrio de las preguntas» con el tema satírico. Los espacios exteriores se normalizaron; guardar no cambió caja, energía ni jornada.
4. Desarrollar texto y arreglos del saludo dejó avances 54 y 50, descontó exactamente $9.000 y dos jornadas, sin desgaste del elenco. El plan quedó confirmado.
5. Elegir el saludo como foco no avanzó el tiempo. Ensayarlo costó $6.000 y una jornada: su ensayo llegó a 36, mientras las otras partes permanecieron en cero. La recarga conservó título, tema, foco, avances y caja.
6. En la admisión quedaron deshabilitados trabajo técnico y ensayo, con explicación visible. La presentación siguió funcionando y su índice se mantuvo separado del concurso.
7. Un trabajo que llegó a la jornada de lluvia abrió la decisión del grupo. Después de resolverla, una pasada general elevó el ensayo de saludo/cuplé/retirada de 36/0/0 a 48/12/12.
8. Se desarrollaron las tres partes y se completaron ambas ruedas. Las notas continuaron reservadas hasta el cierre. Esta estrategia de QA quedó eliminada en segunda rueda: desarrollar material por sí solo no garantiza clasificar.
9. Al pasar al año siguiente se archivaron título, tema y preparación: saludo 54/50/48, cuplé 54/50/12 y retirada 54/50/12 (texto/arreglos/ensayo). Caja del cierre: $661.000. La siguiente campaña comenzó con $1.464.500 tras financiación y renovación.
10. La temporada 2 empezó con la propuesta inicial, preparación cero y un plan editable. Los trabajos quedaron bloqueados hasta contratar e iniciar la producción. Una recarga conservó ese estado.

## Presentación y límites

- Revisados el panel en escritorio y el enfoque de ensayo en 390 × 844 píxeles CSS; sin desbordamiento horizontal de página ni diálogo.
- Revisados etiquetas, costos, motivos de bloqueo, progreso por sección y apertura de la ficha archivada.
- La comprobación final de consola no mostró errores. El escenario 3D volvió a mostrarse al cerrar el panel.
- Se restauró el tamaño normal del navegador.
- Este incremento gestiona la producción mediante avances; no genera letras, melodías ni grabaciones.
- Quedan pendientes pruebas táctiles, rendimiento, suspensión/reanudación y compilación/distribución en Android e iPhone físicos.
