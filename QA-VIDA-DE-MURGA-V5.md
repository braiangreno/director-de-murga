# Verificación de vida de murga v5

1 de octubre de 2026.

## Resultado

- `npm test`: 40 pruebas aprobadas: 26 de simulación, 12 del sistema de personajes y 2 de cosméticos.
- `npm run build`: TypeScript y Vite aprobados. Persiste el aviso de paquete principal superior a 500 kB; no impide compilar.
- `node node_modules/@capacitor/cli/bin/capacitor sync`: recursos de la compilación final y Preferences sincronizados en Android e iOS.
- No se compilaron ni ejecutaron APK/IPA ni se midió rendimiento en teléfonos reales.

## Recorrido en navegador

Chrome, en una partida de prueba independiente de la del navegador integrado. Se revisaron escritorio (1520 × 1016 CSS) y celular (390 × 844 CSS). El tamaño temporal del navegador se restauró al terminar.

1. Se recuperó la partida v4 de jornada 8: caja UYU 537.500, 17 integrantes y vestuario elegido intactos. Apareció la decisión correspondiente a esa fecha y quedaron bloqueadas las acciones que avanzan el calendario.
2. Elegir «Cubrir los traslados» descontó UYU 12.000, dejó el ánimo en 77 y conservó la jornada. Al recargar persistieron la caja de UYU 525.500 y el historial, sin repetir el cobro.
3. El primer festival anticipó UYU 68.200 de recaudación, 12.000 de organización y 56.200 netos. Después de hacerlo, la caja quedó en 581.700, se consumió una jornada y el contador marcó 1/3.
4. La jornada de convivencia descontó UYU 2.500: caja 579.200, ánimo 91 y energía 100. La vista previa siguiente mostró energía 0 porque ya había llegado al máximo.
5. Se conversó con tres candidatos sin cambiar dinero ni jornada. El primer contacto mostró «Primer acercamiento», mantuvo la habilidad oculta y bloqueó repetir la charla durante dos jornadas. Al llegar a tres, otros contactos quedaron deshabilitados. La cuota agotada persistió al recargar.
6. La libreta reflejó ingresos barriales 68.200 y gastos comunitarios 26.500 (decisión 12.000, organización 12.000, convivencia 2.500). Con los demás gastos previos, cerró exactamente en caja 579.200.
7. Segundo y tercer festival: netos 59.000 y 61.800, caja final 700.000. El cuarto quedó bloqueado por el límite anual. Los tablados seguían cerrados.
8. Avanzar a octubre presentó «Un cuplé divide al grupo». La opción gratuita «Conversarlo entre todos» mantuvo la caja y la jornada, consumió energía y agregó una segunda elección al historial.
9. Se corrigió un contador que ofrecía tres charlas en octubre pese al cierre del mercado. La interfaz final muestra cero; las pruebas también cubren el cierre y la reapertura del año siguiente.
10. Sin desbordamiento horizontal en las nuevas pantallas. Las tarjetas de decisión se apilan en celular. Cambiar de panel vuelve al inicio del contenido, y el fondo permanece inmóvil mientras el modal está abierto.
11. Inspección visual de decisiones, actividades y escenario 3D. Los 17 modelos cargaron con distribución 13/3/1; sin errores de consola durante el recorrido. El director continúa delante del coro y la batería detrás.

## Cobertura automatizada añadida

Cuotas y espera de contactos; persistencia del vínculo al contratar y recargar; rechazo de figuras pese a mejorar vínculos; contabilidad y límite de festivales; topes de energía, ánimo y lealtad; decisiones obligatorias con alternativa gratuita; protección contra aplicar dos veces la misma elección; temporada completa con seis decisiones y competencias; renovación de contadores; migración v4 sin alterar campos anteriores; migración v3 con su conversión histórica única; rechazo de guardados comunitarios incoherentes.

Los efectos positivos de las decisiones se limitan al máximo de 100 por integrante, explicado en la interfaz. Sus importes y consecuencias son parámetros de juego, no tarifas oficiales. Fuentes y límites en [VIDA-DE-MURGA-FUENTES.md](VIDA-DE-MURGA-FUENTES.md).

Las pruebas y la sincronización nativa se ejecutaron fuera del aislamiento porque `tsx`/Capacitor necesitan consultar el perfil de Windows. La compilación web funcionó en el entorno normal.
