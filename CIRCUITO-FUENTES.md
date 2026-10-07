# Circuito de tablados: fuentes y criterios para la agenda

Consulta: **7 de octubre de 2026**. Alcance: antecedentes del carnaval de **Montevideo** para la agenda del prototipo. Este documento distingue evidencia de propuestas de diseño; **no acredita que todas las propuestas estén implementadas**. Complementa [CALENDARIO-FUENTES.md](CALENDARIO-FUENTES.md) y [ECONOMIA-Y-CARRERAS-FUENTES.md](ECONOMIA-Y-CARRERAS-FUENTES.md).

## Cuatro fuentes primarias

### 1. Escenarios populares, comerciales y móviles

La publicación oficial **ABC, n.º 86, enero de 2023**, describe escenarios populares sostenidos por comisiones barriales con apoyo de la Intendencia. Distingue los escenarios comerciales privados y el programa móvil municipal. La recaudación de entradas y comida aparece vinculada al sostenimiento del espacio comunitario: no debe asignarse automáticamente como ingreso de la murga que actúa. Es un antecedente de 2023, no un tarifario vigente ni una nómina para 2027. [IM, ABC 86, página 5 del PDF, apartado «Escenarios populares»](https://montevideo.gub.uy/sites/default/files/biblioteca/abc86.pdf).

**Uso de diseño:** distinguir el tipo de gestión y su función barrial. Los honorarios, seguidores y cansancio de las tarjetas del juego necesitan balance propio; la fuente no justifica que todo escenario popular pague menos, desgaste menos o entregue una recompensa artística específica.

### 2. Apertura, grilla nocturna y alternativa cubierta

El **Tablado del Museo 2026** publicó fechas de apertura desde el **24 de enero**, sin actividad diaria. Su grilla del **27 de febrero** incluía cinco conjuntos con inicios a las 20:00, 20:50, 21:50, 22:50 y 23:50; el cierre del día 28 también anunciaba una actuación a las 00:45. Son horas programadas, no una medición de duración efectiva. Ante lluvia, el organizador anunciaba traslado a su sala de espectáculos. El ómnibus mencionado al final de la noche era para **visitantes**, no evidencia del transporte de los elencos. [Museo del Carnaval, programación propia 2026](https://www.museodelcarnaval.org/programacion-tablado-del-museo-2026/).

**Uso de diseño:** ofertas de actuación con hora concreta, disponibilidad variable y política de lluvia propia. Que varios conjuntos compartan una grilla no prueba cuántos tablados hizo una misma murga esa noche. La apertura del Museo tampoco fija el día de apertura de todos los escenarios.

**Nota de acceso:** el contenido de esta página se recuperó mediante el índice del buscador en esta consulta; la apertura directa devolvió HTTP 403. El índice conservaba la programación y las condiciones anteriores. No se interpretó el error de acceso como una modificación del evento.

### 3. Suspensión documentada por lluvia

El **Municipio B** publicó el **3 de febrero de 2023** la suspensión por lluvia del tablado barrial de Cordón, previsto ese viernes de 18:00 a 23:00. La grilla combinaba murgas con otras expresiones artísticas. Se trataba de una actividad comunitaria de esa edición; el aviso no establece un porcentaje de cancelación, compensaciones, gastos de transporte ni una regla general para todo el circuito. [Municipio B, Tablado barrial en Cordón — suspendido por lluvia](https://municipiob.montevideo.gub.uy/tablado-barrial-en-cord%C3%B3n-suspendido-por-lluvia).

**Uso de diseño:** una suspensión puede existir sin que llueva igual sobre todas las ofertas ni que se cancele automáticamente el Concurso Oficial. Contrastar este caso con la alternativa cubierta del Museo evita una regla uniforme falsa.

### 4. Recorridos en paralelo al Concurso Oficial

La ficha institucional **Concurso Oficial**, actualizada el **23 de marzo de 2026**, explica que las agrupaciones recorren tablados de los barrios mientras se desarrolla el concurso. Describe también el papel de vecinos y organizaciones en los escenarios populares y el fondo que facilita contratar conjuntos. No especifica tiempos de viaje, cantidad de paradas por noche ni un itinerario común. [Intendencia de Montevideo, Concurso Oficial](https://montevideo.gub.uy/area-tematica/cultura-y-tiempo-libre/carnaval-y-llamadas/concurso-oficial).

**Uso de diseño:** representar el circuito como otra agenda durante el carnaval. El traslado entre sedes requiere un margen logístico en el juego, pero sus minutos deben declararse ficticios. Este documento no toma de esa ficha general cuotas de finalistas ni reglas de puntuación.

## Decisiones temporales adoptadas para v9

Los siguientes valores son **balance del juego**, no horarios obligatorios, máximos legales ni mediciones de recorridos reales. Corresponden al contrato funcional acordado para v9; la verificación de la implementación se documenta por separado.

| Decisión de v9 | Regla legible para el jugador |
| --- | --- |
| Apertura | Mantener el desbloqueo en `day = 24`, que representa fines de enero. No habilitar tablados regulares en la admisión de noviembre. |
| Escala temporal | Cada acción de circuito resuelve una noche representativa y avanza una jornada de las 32. No afirmar que reproduce cada noche real de abril a marzo. |
| Carga de agenda | Elegir de una a tres actuaciones por noche, sujetas a compatibilidad. El límite de tres es del juego, no una costumbre universal. |
| Ventana horaria | Ofertas entre las 20:00 y las 00:30, con minutos que continúan después de medianoche. El último horario no es un toque de cierre reglamentario. |
| Actuación | Duración fija de 40 minutos. No deducirla de los intervalos de una grilla con categorías diferentes. |
| Desplazamiento | 20 minutos dentro de una zona y 45 entre zonas ficticias; la primera salida usa 20. Son una abstracción logística, no un cálculo de tráfico. No se agrega otro margen independiente. |
| Compatibilidad | La siguiente actuación debe comenzar después del final de la anterior y el traslado. Bloquear agendas incompatibles en vez de multarlas sorpresivamente. |
| Concurso | Reservar las jornadas oficiales del elenco para su presentación. Es una simplificación de esta campaña; no afirmar que un conjunto real nunca actúa en tablados esa misma noche. |

La interfaz debería ordenar por hora y mostrar cada tramo, no sumar una segunda actuación mediante un multiplicador invisible. Revisar el salto 23:50 → 00:30 sin interpretar que la segunda ocurrió antes. Un mismo escenario no debe poder seleccionarse dos veces en el mismo turno salvo una oferta expresamente distinta, si ese caso llegara a diseñarse.

## Escenarios y lluvia ficticios

V9 usa seis escenarios inventados con tipos **popular** y **comercial**, zonas abstractas, horario, ingreso bruto y costos. Todos estos espacios ficticios se representan al aire libre y sin alternativa cubierta: esa elección limita esta versión, no describe a todos los tablados reales. Una futura oferta protegida tendría que declararse por espacio y no como recompensa automática por tipo de gestión. No asociar los parámetros a los nombres reales de los cuatro casos citados.

El tiempo **simulado** puede ser seco, inestable o lluvia, y queda fijado por temporada y jornada. En seco se realizan las funciones; inestable puede suspender parte del recorrido; lluvia suspende todos los espacios de este catálogo abierto. No es un pronóstico meteorológico real ni una regla del reglamento. Las fuentes anteriores no permiten asignar una probabilidad estadística de lluvia.

La liquidación distingue lo programado de lo realizado. Las suspensiones de v9 se comunican antes de salir: esas paradas no generan ingreso, cachés, transporte, desgaste ni experiencia de actuación. El costo de viaje se calcula entre las funciones efectivamente realizadas. Es una convención del juego, no una condición contractual extraída de las fuentes.

Una noche confirmada debe resolverse una sola vez, incluso si todas sus funciones se cancelan. Guardar la agenda y su resultado evita volver a cargar para cobrar dos veces o conseguir un clima diferente. No añadir compensaciones, multas ni reprogramaciones automáticas sin definir su costo y su impacto en el calendario.

## Límites económicos y de evidencia

Las cuatro fuentes no establecen cachés actuales de murgas, tarifas de transporte ni pagos por suspensión. El precio de una entrada al público no equivale al honorario del conjunto. V9 mantiene separados ingreso bruto, cachés, transporte y saldo neto. El transporte de UYU 3.500 por parada realizada, más UYU 600 por cambio de zona respecto a la actuación anterior realizada, es **balance ficticio**, al igual que los pagos del catálogo.

Lo documentado respalda escenarios diversos, grillas con varios conjuntos, apertura de verano, circulación por barrios y respuestas distintas a la lluvia. No demuestra que todas las murgas hagan tres tablados, que una actuación dure cuarenta minutos o que cruzar entre dos zonas lleve exactamente cuarenta y cinco. Los límites de v9 se fijaron para hacer la agenda comprensible y deben ajustarse mediante pruebas del juego.
