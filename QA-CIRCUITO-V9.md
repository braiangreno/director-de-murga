# Verificación de la agenda de tablados v9

Fecha: 7 de octubre de 2026. Proyecto: `Carnaval/director-de-murga`.

## Resultado

81 pruebas automatizadas aprobadas: 67 de simulación y 14 de personajes/apariencias. `npm run mobile:sync` completó TypeScript, compilación Vite y sincronización de Android e iOS. No se compiló un APK/IPA ni se ejecutó el juego en teléfonos físicos.

Vite conserva la advertencia por el tamaño del paquete principal: 891,86 kB, 249,55 kB gzip. La revisión no acredita FPS, consumo de batería o tiempos de carga en dispositivos reales.

## Pruebas automatizadas relevantes

- Una a tres paradas únicas, orden automático, incompatibilidades por horario y traslado, e inicio después de medianoche.
- Preparación gratuita, recarga del plan, presupuesto insuficiente, limpieza al avanzar con otra actividad y rechazo sin modificar el estado original.
- Bloqueos por calendario, contratos, producción, decisiones, presentación oficial y temporada terminada.
- Ingresos, cachés, transporte entre zonas, energía por función escénica, experiencia y seguidores solo por actuaciones realizadas.
- Cancelaciones parciales deterministas y caja conservadora cuando una función rentable podría suspenderse.
- Suspensión total: una jornada, cero ingresos, gastos y desgaste; sin efectos duplicados.
- Acciones antiguas popular/comercial delegadas al mismo ejecutor.
- Migración v8 sin inventar noches ni duplicar dinero; conciliación de historial y totales heredados con las cuentas.
- Rechazo de guardados con rutas, clima, fechas o liquidaciones adulterados; cierre anual que conserva las cuentas antes de reiniciar la agenda.
- Regresiones del mercado, contratos, producción, archivo y campañas de 52 temporadas.

## Recorrido de navegador

Chrome de pruebas en `http://localhost:5174/`, usando controles visibles. No se editaron guardados ni se invocaron funciones internas desde el navegador. La partida de la pestaña del usuario en el navegador de la app no se utilizó para estas pruebas.

1. Migración desde v8: temporada 3, jornada 1, 17 integrantes confirmados, producción iniciada, caja de $1.926.600 UYU. La agenda se pudo consultar en abril, con selección y salida deshabilitadas.
2. Se recorrió la preparación mediante descanso y decisiones gratuitas. La admisión de noviembre no habilitó tablados. El elenco superó la admisión con índice 55,1 del prototipo.
3. Jornada visible 25, tiempo inestable: se seleccionaron Ronda del Este, Plaza del Candil y Azotea del Sur en ese orden. La agenda los ordenó por hora: Plaza → Azotea → Ronda. Los demás botones quedaron bloqueados al llegar a tres.
4. Una recarga conservó las tres paradas y la caja. La previsión mostró $61.000 de ingresos, $45.900 de cachés, $11.700 de transporte, saldo potencial $3.400 y caja necesaria de $2.200 ante suspensiones.
5. Se realizaron dos funciones y se suspendió Azotea. El comprobante mostró $36.000 cobrados, $30.600 de cachés, $7.600 de transporte y saldo −$2.200. La caja quedó en $1.924.400; avanzó una jornada, vació el plan y bloqueó el circuito por Primera rueda.
6. Tras la primera rueda, se seleccionó Parque de las Luces antes que Patio del Puente. El recorrido quedó ordenado a las 20:15 y 00:30 (+1), con final 01:10 (+1). Agregar Plaza quedó impedido por incompatibilidad con Patio.
7. Jornada visible 27, tiempo seco: se realizaron ambas funciones. El comprobante mostró $50.000 cobrados, $30.600 de cachés y $7.600 de transporte: +$11.800, caja $1.936.200 y energía 60/100.
8. La decisión pendiente pudo abrirse desde la agenda. Después de resolverla, se preparó una parada y se eligió descanso desde la sede: avanzó al día oficial, vació la selección y conservó la caja, sin ejecutar la salida abandonada.
9. El recorrido de prueba terminó eliminado en segunda rueda, al no haber desarrollado ni ensayado el espectáculo. La recarga conservó ambos comprobantes y los $1.936.200; el circuito quedó bloqueado por fin de temporada.

La suspensión total por lluvia y el reinicio del historial anual se verificaron en pruebas automatizadas, no mediante este recorrido de navegador. Durante la sesión se capturaron dos mensajes de cierre de un canal de respuesta asíncrona del navegador; no se atribuyeron a una función del juego ni se presentó esta sesión como una consola completamente limpia.

## Interfaz

Se inspeccionaron capturas de presupuesto en escritorio, ruta después de medianoche en móvil y comprobante de suspensión parcial en móvil. A 390 × 844 CSS px, documento y viewport midieron 390 px, y el panel 357 px, sin desborde horizontal. Los botones de la agenda midieron 44 px de alto. Se restauró el tamaño normal al terminar.

La vista previa expresa el saldo y desgaste **si se cumplen todas las funciones**, distinguiéndolos de la liquidación real. El enlace «Ver plan» y el salto al comprobante mantienen margen frente a la cabecera fija. Los escenarios, horarios, clima y costos son ficticios; las referencias y sus límites están en [CIRCUITO-FUENTES.md](CIRCUITO-FUENTES.md).
