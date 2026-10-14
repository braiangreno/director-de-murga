# Director de Murga: alcance y pendientes de beta

Auditoría del **14 de octubre de 2026** sobre la campaña v9 y la entrega visual v10. Se revisaron código, documentación y funcionamiento en navegador; esta auditoría no ejecutó pruebas físicas ni consultó nuevas tarifas. La verificación de los ajustes está registrada en [QA-MOVIL-V10.md](QA-MOVIL-V10.md): 85 pruebas aprobadas, compilación web y sincronización de ambos proyectos nativos.

## Qué ya se puede jugar

Hay una campaña completa de abril a marzo en 32 jornadas representativas: elenco de 17 personas, mercado persistente con habilidad oculta, negociación y renovación anual, cinco oficios técnicos, dos propuestas de vestuario tras contratar al vestuarista, desarrollo del espectáculo, ensayos, decisiones de convivencia y financiación barrial. El carnaval incorpora un circuito de tablados con horarios, traslados, cachés, cansancio y suspensiones; después llegan las ruedas, los fallos y el cierre para continuar otro año.

El juego conserva identidad, carreras, cuentas y hasta 50 cierres de temporada. El escenario y el taller usan personajes modulares 3D; el vestuario contratado se refleja en la murga. El guardado automático incluye validación, migraciones y copias internas de recuperación. Esto no equivale todavía a un respaldo que el jugador pueda descargar o trasladar a otro dispositivo.

La evidencia cerrada de v9 comprende 81 pruebas automatizadas, un recorrido de navegador a 390 × 844 CSS px, compilación web y sincronización de Android/iOS; sus límites están en [QA-CIRCUITO-V9.md](QA-CIRCUITO-V9.md). No se acreditó una temporada ejecutada en un APK/IPA ni se midieron rendimiento o batería en teléfonos físicos.

## Alcance de v10

La entrega añade tres perfiles gráficos, reducción de movimiento combinada con la preferencia del sistema y suspensión del renderizado del escenario cuando no resulta visible o utilizable. Las preferencias se guardan aparte; **la campaña sigue usando `State.version = 9` y `director-de-murga-v9`**. No se atribuyen cambios nuevos de economía, contenido o reglas a esta entrega.

| Perfil | Límite de cuadros | Densidad máxima | Sombras |
| --- | ---: | ---: | --- |
| Ahorro | 20 FPS | 1 | No |
| Equilibrado | 30 FPS | 1,25 | Sí |
| Más fluidez | 60 FPS | 1,5 | Sí |

Una densidad menor del dispositivo se respeta. Estos valores son límites de trabajo gráfico; no prometen alcanzar esos FPS ni un consumo concreto. La QA de v10 confirmó persistencia tras recarga, suspensión detrás de paneles y del taller, pausa del escenario fuera de vista y reanudación en navegador. La suspensión de una app instalada y su consumo quedan pendientes de pruebas físicas.

## Prioridad inmediata: una beta Android instalada

El siguiente hito concreto es **instalar un APK de pruebas y completar una temporada en un Android de recursos modestos**, además de una comprobación en otro modelo de gama media. Antes de ampliar sistemas, hace falta observar carga inicial, cámara y paneles, cambios de calidad, temperatura y estabilidad durante una sesión prolongada. Registrar modelo, sistema, perfil gráfico y mediciones; no sustituirlas por una captura del navegador de escritorio.

El recorrido debe incluir salir de la aplicación, bloquear el teléfono, volver, cerrar y reabrir el proceso, y comprobar caja, jornada, contratos, vestuario y ajustes. Verificar también arranque y juego sin red una vez instalada. Una actualización de prueba debe conservar el guardado. En este equipo falta configurar JDK 21 y Android SDK; se encontró Java 11 y Gradle ya está disponible. El equivalente en iOS requiere compilar y probar desde un entorno macOS/Xcode; la sincronización desde Windows no cubre ese trabajo.

La distribución inicial puede ser de prueba: firma, paquetes de publicación y requisitos de tienda se resuelven para el canal elegido. El proyecto conserva scaffolds e iconos propios, pero todavía hay que inspeccionar inicio, splash, áreas seguras y navegación del sistema en dispositivos.

## Trabajo pendiente, por impacto

| Área | Estado observado | Siguiente entrega comprobable |
| --- | --- | --- |
| Audio de murga | No hay runtime ni archivos de audio. La preparación y las actuaciones se representan con indicadores y animación. | Incorporar un conjunto pequeño de percusión, ambiente y respuesta de interfaz, original o con permiso de uso documentado. Controles de silencio y volumen; probar inicio tras interacción, interrupciones y regreso desde segundo plano. No reutilizar canciones o grabaciones por el mero hecho de estar publicadas. |
| Primeros minutos | Existe una guía extensa y el armado del equipo creativo, pero no un acompañamiento de primera campaña. | Una secuencia breve y omisible que explique elenco, técnicos, vestuario, reserva de caja y primer trabajo del espectáculo. Probar que una persona nueva entiende qué preparar y cómo avanzar sin abrir toda la guía ni recibir elecciones automáticas. |
| Respaldo recuperable | Hay guardado automático y recuperación interna; no hay interfaz de exportación/importación. | Permitir descargar y restaurar un respaldo validado de campaña y apariencias. Mostrar antes de reemplazar qué murga y temporada contiene; rechazar archivos inválidos conservando la partida vigente. Probar restauración en otra instalación. |
| Balance y repetición | Hay rutas económicas viables en pruebas, financiación anual fija y situaciones recurrentes. Edad y experiencia avanzan, sin retiro de artistas. | Observar varias primeras campañas y varias temporadas seguidas con jugadores nuevos. Registrar caja por fase, decisiones repetidas, motivos de abandono y dependencia de una única estrategia. Ajustar valores según esos resultados; no agregar retiros, préstamos u otros sistemas sin demostrar su necesidad. |
| Cotizaciones y realismo | Las fuentes distinguen testimonios históricos de importes ficticios. No hay tarifario universal verificado de técnicos, componentes, confección o ensayo. | Contrastar el modelo con murguistas y responsables de producción: calendario, acuerdos, preparación, reparto de ingresos y costos. Fechar cada testimonio o cotización, registrar moneda y qué incluye, y conservar diferencias entre grupos. No presentar una práctica particular como reglamento. |

Para la validación cultural y económica se propone una revisión humana; esta auditoría no contactó a nadie ni encargó recursos. La base existente está en [ECONOMIA-Y-CARRERAS-FUENTES.md](ECONOMIA-Y-CARRERAS-FUENTES.md), [VIDA-DE-MURGA-FUENTES.md](VIDA-DE-MURGA-FUENTES.md), [CALENDARIO-FUENTES.md](CALENDARIO-FUENTES.md) y [CIRCUITO-FUENTES.md](CIRCUITO-FUENTES.md).

## Qué no debe confundirse con un fallo pendiente

El mercado, las renovaciones, el espectáculo y la agenda de tablados ya están implementados: no corresponde anunciarlos otra vez como futuro. Los 32 períodos, seis tablados ficticios, financiación anual, precios y evaluación simplificada son decisiones actuales de diseño. Pueden necesitar ajustes tras probarlas, pero no son normas ni cotizaciones certificadas del carnaval real. La amplitud de contenido no sustituye probar comprensión, estabilidad y disfrute en una primera temporada.
