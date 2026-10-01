# Verificación de carreras y economía v4

30 de septiembre de 2026.

## Resultado

- `npm test`: 32 pruebas aprobadas (18 de simulación, 12 del sistema de personajes y 2 de cosméticos).
- `npm run build`: TypeScript y Vite aprobados. Permanece el aviso de tamaño del paquete Three.js; no impide compilar.
- `capacitor sync`: recursos web y Preferences sincronizados con los proyectos Android e iOS.
- No se compilaron ni ejecutaron APK/IPA en teléfonos en esta revisión.

## Recorrido probado en Chrome

Prueba independiente de la partida del navegador integrado, en escritorio y con viewport CSS de 390 × 844.

1. Inicio en abril con 120 candidatos y reputación 20.
2. Audición de un perfil: descuenta UYU 5.000, revela informe cualitativo, no muestra voz/técnica exacta y deshabilita otra audición del mismo perfil.
3. Una figura rechaza la propuesta por reputación; caja e integrante no cambian.
4. Búsqueda por nombre, filtro de fama, ofertas y contratación por función. Se conservan 17 integrantes; el saliente vuelve al mercado.
5. Sin vestuarista, el panel no revela diseños. Contratar a Clara Benítez descuenta UYU 30.000 y revela exactamente dos propuestas.
6. Vista previa de la levita en 3D: un corte y una paleta, sin aplicar a todo el elenco ni cobrar confección. Al cerrar vuelve a las propuestas.
7. Elegir el primer diseño descuenta UYU 500.000. Al recargar persisten la caja y la elección, y no permite volver a pagar la misma propuesta.
8. Cinco oficios permiten iniciar la campaña. Abril no permite ensayos ni tablados. Se avanza la planificación hasta julio y se habilita el ensayo de UYU 6.000.
9. La libreta de caja refleja audición, contratación artística, honorarios, confección y ensayo. El total de gastos coincide con la reducción de caja.
10. Mercado, propuestas y tabla de costos sin desbordamiento horizontal en móvil; catálogo en una columna. Se inspeccionaron capturas del probador 3D y las propuestas. 17 modelos cargados y sin errores en consola durante el recorrido.

## Cobertura automatizada relevante

Persistencia de carreras, experiencia y renovación anual; inscripción directa después de la Liguilla; rechazo sin cobro; contratos y reembolsos; contabilidad; distribución 13+3+1; admisión sin vestuario; tablas de concurso con empates; migración v3 conservando resultados e identidades; rechazo de guardados dañados; compatibilidad e independencia de los modelos 3D y las paletas.

Las pruebas de la simulación se ejecutaron fuera del aislamiento de Windows porque `tsx` fallaba allí al consultar el perfil del usuario (`uv_os_get_passwd`). La compilación web funcionó dentro del entorno normal.
