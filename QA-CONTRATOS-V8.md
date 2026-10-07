# Verificación de contratos v8

Fecha: 7 de octubre de 2026. Proyecto: `Carnaval/director-de-murga`.

## Resultado

72 pruebas automatizadas aprobadas: 58 de simulación y 14 de personajes/apariencias. `npm run mobile:sync` completó TypeScript, compilación Vite y sincronización Capacitor Android/iOS. No se compiló un APK/IPA ni se probaron teléfonos físicos.

Se conserva la advertencia de Vite por el tamaño del paquete principal: 876,53 kB, 245,00 kB gzip. No se acreditan tiempos de carga, FPS o consumo de batería en dispositivos reales.

## Casos automatizados relevantes

- Cambio de año: archivo anterior intacto, crecimiento anual una sola vez, financiación y 17 acuerdos pendientes sin cobro automático.
- Disposición basada en reputación, fama de referencia, lealtad, confianza y ánimo; independencia respecto del talento oculto.
- Tres ofertas, rechazo de una figura incorporada anteriormente y posibilidad de conversar.
- Firma individual y por lote, sin adelantar jornadas, pagos únicos y rechazo sin alterar caja.
- Sustitución de la plaza seleccionada, conservando 17 integrantes y la distribución 13 + 3 + 1.
- Bloqueo de producción, acciones y desarrollo creativo mientras haya pendientes.
- Migración v7 sin recobrar acuerdos pagados; recarga de firmas parciales y rechazo de IDs pendientes inválidos.
- Reserva de una ruta financiable sin repetir candidatos, ofertas que respetan esa reserva y reintegros técnicos/de confección disponibles.
- Ejecución de un plan de 17 reemplazos con presupuesto exacto, y regresión de 52 temporadas con firmas y reemplazos explícitos.

## Recorrido de navegador

Chrome de pruebas sobre `http://localhost:5174/`, mediante controles visibles. No se editaron guardados ni se invocaron funciones internas desde el navegador. La pestaña del usuario en el navegador de la app no formó parte de esta verificación.

1. La partida v7 abrió en temporada 2, abril, con $1.464.500 UYU y 17 acuerdos confirmados. Se conservaron identidad y saldo.
2. Se contrataron los cinco oficios barriales por $130.000 y se recorrió el año hasta la eliminación en segunda rueda, resolviendo los dilemas visibles.
3. La temporada 3 abrió con $2.184.500, 17 pendientes y referencia estándar de $110.000: la financiación se sumó sin descontar renovaciones.
4. La oferta preferencial de Lucía Rodríguez cambió a $6.200. Una charla elevó la confianza de 30 a 45 y activó su espera entre contactos, sin pasar de abril.
5. La firma dejó $2.178.300, una confirmada y 16 pendientes. La recarga conservó esos valores; Lucía apareció en la lista confirmada y dejó de tener tarjeta de renovación.
6. «Buscar reemplazo» en Bruno Silva abrió el mercado con esa plaza seleccionada y el aviso de acuerdo pendiente. Ana Pereira se incorporó por $22.000: dos confirmadas, 15 pendientes, $2.156.300.
7. Con los cinco técnicos contratados, el inicio seguía deshabilitado por los 15 acuerdos restantes. La firma estándar conjunta confirmó esos 15 por $99.700. El saldo final fue $1.926.600.
8. El inicio se habilitó después de completar las 17 plazas. Se inició la producción y una nueva recarga mantuvo temporada 3, jornada 1, elenco confirmado y saldo.
9. El registro de errores del navegador estaba vacío al revisar la recarga final.

## Interfaz y evidencia visual

Capturas inspeccionadas durante el recorrido: panel de acuerdos en escritorio, resumen a tamaño móvil y tarjeta con oferta preferencial, precio de firma, conversación y reemplazo.

Se redujo el texto del resumen tras la primera captura móvil. A 390 × 844 CSS px, documento y viewport midieron 390 px; panel y contenido desplazable, 357 px. No hubo desborde horizontal. Los botones y selectores del panel de acuerdos midieron al menos 44 px de alto. Se restauró el tamaño normal del navegador al finalizar.

La reserva asegura una ruta conservadora para completar acuerdos pendientes; no calcula un óptimo económico ni reserva dinero para todo el espectáculo. Tarifas, ofertas y decisiones personales son reglas ficticias del juego.
