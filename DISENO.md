# Director de Murga

Documento de diseño del prototipo. La revisión vigente es **v11, del 15 de octubre de 2026**: añade respaldos de partida y recuperación sobre los ajustes visuales de v10 y la campaña de v9. **El esquema de simulación y la clave de guardado siguen en v9**; las preferencias del dispositivo se almacenan aparte. Las secciones de versiones anteriores describen la evolución del juego y no sustituyen el estado actual. Los valores de balance están en `src/simulation.ts` y las prioridades de beta, en [BETA-PENDIENTES.md](BETA-PENDIENTES.md).

## Revisión vigente v11: conservar y trasladar la partida

### Elegir, revisar y confirmar

**Ajustes → Partidas y respaldos** muestra la murga actual y permite exportar, seleccionar un archivo o consultar la copia anterior. La vista previa presenta únicamente identidad, temporada, jornada, caja, cantidad de integrantes y fecha del respaldo; no revela habilidades ni puntajes reservados. Elegir o cancelar un archivo solo modifica esa selección. **Restaurar esta partida** es la confirmación que autoriza reemplazar campaña y apariencias. Antes se conserva la partida visible como copia previa; volver a ella exige revisar y confirmar otra restauración.

El archivo JSON tiene formato `director-de-murga-backup` y versión **1**, con `exportedAt`, `campaign` y `cosmetics`. El tamaño máximo es **5 MiB de UTF-8**. Se validan estructura, fecha, versión, campaña y opciones cosméticas antes de aceptar la selección. Las campañas antiguas compatibles pasan por el migrador existente y resultan en v9. El archivo contiene los datos internos necesarios para continuar jugando; la vista previa no los expone. Las preferencias gráficas quedan fuera del respaldo y se conservan en el dispositivo receptor.

### Guardado y recuperación

Mientras se procesa una operación se bloquean acciones y cierres del panel. Antes de restaurar se esperan las colas de campaña y apariencias. Un registro de recuperación, independiente del guardado de campaña, conserva los valores anteriores y distingue dos fases: `prepared`, cuyas escrituras incompletas se revierten, y `committed`, que conserva la restauración aplicada y solo requiere borrar ese registro. Cada escritura se comprueba mediante lectura. Al iniciar, la recuperación ocurre antes de cargar la campaña.

El estado en memoria se reemplaza únicamente tras el resultado `applied`. Si falla terminar la limpieza de una restauración ya confirmada, se reintenta; si sigue fallando, el juego explica que la partida ya fue restaurada, bloquea nuevas acciones y permite exportar lo visible antes de reintentar. Un fallo al leer la campaña o las apariencias durante el arranque detiene la carga: no se trata como ausencia de guardado ni habilita una campaña inicial que pueda sobrescribirlo.

### Transferencia y verificación

En web se solicita la descarga de un archivo; en nativo se escribe una copia temporal en caché con Filesystem y se abre el menú de Share. Son mecanismos de entrega al usuario, sin sincronización en la nube. Cerrar el menú de compartir no garantiza que se haya guardado el archivo. La sincronización v11 incluye Filesystem 8.1.5, Share 8.0.3 y Preferences 8.0.1.

La suite alcanzó **109 pruebas aprobadas**, con 15 nuevas de respaldo/recuperación y 9 de carga; también pasaron compilación web y sincronización Android/iOS. El panel se inspeccionó en escritorio y a 390 × 844 CSS px, sin desborde y con controles de 46/48 px. La prueba de selección de archivo en Chrome quedó impedida porque la extensión denegó `setFiles` sin permiso de acceso a URL de archivo. No se eludió el bloqueo ni se ejecutó la importación por interfaz. La exportación solicitó una descarga sin error de aplicación, pero venció la espera de su evento y no se confirmó el archivo mediante la herramienta.

Por ello sigue pendiente el recorrido completo exportar → conservar archivo → importar → confirmar → recargar → volver a la copia previa. Siete comprobaciones simuladas de exportación nativa se registran aparte, sin sumarlas a las 109 ni presentarlas como prueba de un teléfono. No hay APK/IPA compilado o ejecutado en esta entrega. El detalle corresponde a [QA-RESPALDOS-V11.md](QA-RESPALDOS-V11.md).

## Base funcional v10: ajustes para jugar en móvil

El jugador puede elegir calidad para escenario y taller: Ahorro limita a 20 FPS y densidad de píxel máxima 1, sin sombras; Equilibrado limita a 30 FPS y densidad 1,25, con sombras; Más fluidez limita a 60 FPS y densidad 1,5. La densidad nunca se fuerza por encima de la del dispositivo. Son topes, no garantías de FPS ni de ahorro de batería.

Reducir movimiento se combina con la preferencia del sistema operativo: cualquiera de las dos detiene las animaciones, manteniendo disponibles cámara y personalización. El escenario suspende el renderizado mientras un panel o el taller lo cubren, al quedar fuera de vista, cuando la aplicación está oculta o ante pérdida de contexto gráfico. Al volver, retoma la presentación sin avanzar la jornada de gestión.

Esta revisión no modifica candidatos, contratos, preparación, calendario, circuito, concurso ni cuentas. La campaña conserva `State.version = 9` y `director-de-murga-v9`; los ajustes visuales no se incorporan al historial de la murga. El registro de esta entrega está en [QA-MOVIL-V10.md](QA-MOVIL-V10.md): 85 pruebas aprobadas, recorrido de ajustes y pausas en navegador, compilación y sincronización nativa. La verificación anterior de campaña está en [QA-CIRCUITO-V9.md](QA-CIRCUITO-V9.md). Ninguna de esas comprobaciones acredita por sí sola ejecución en teléfonos físicos.

## Base funcional v9: agenda de tablados

### Elegir una noche representativa

`State.circuit` contiene la selección actual, el historial de salidas del año y los totales económicos heredados de versiones anteriores. El catálogo `CIRCUIT_VENUES` ofrece **seis escenarios ficticios**, populares y comerciales, con hora, zona, ingreso bruto, seguidores y desgaste por función del elenco. No usa nombres reales para atribuir honorarios, cancelaciones o rentabilidad a un espacio existente. La evidencia y sus límites se documentan en [CIRCUITO-FUENTES.md](CIRCUITO-FUENTES.md).

La agenda se puede consultar antes de la apertura. Para preparar y ejecutar una salida se requiere temporada activa, producción iniciada, contratos del elenco resueltos y `day >= 24`. Las jornadas de presentación oficial y las decisiones pendientes bloquean la salida. Reservar esas jornadas únicamente al concurso es una simplificación de esta campaña, no una prohibición real para todas las murgas.

`setCircuitPlan` permite seleccionar **de una a tres paradas**, sin repetir escenario, y las ordena por hora. Preparar, modificar o vaciar la selección no cobra ni avanza el calendario. `performCircuit` confirma la noche y consume **una jornada**, independientemente de cuántas actuaciones se realicen. Se conservan las 32 jornadas representativas: el recorrido no crea un calendario diario adicional.

### Horarios y logística

Todos los siguientes tiempos e importes son **parámetros ficticios de balance**, no duraciones reglamentarias, tarifas vigentes ni recorridos medidos de Montevideo.

| Concepto | Regla de v9 |
| --- | --- |
| Duración de actuación | 40 minutos por parada. |
| Primera salida | 20 minutos de traslado representado. |
| Entre funciones en la misma zona | 20 minutos. |
| Entre funciones en zonas distintas | 45 minutos. |
| Costo de transporte | UYU 3.500 por actuación realizada. |
| Cambio de zona | UYU 600 adicionales si difiere de la actuación anterior efectivamente realizada. |

El inicio de la siguiente función debe permitir terminar la anterior y trasladarse. Las combinaciones incompatibles se rechazan sin cobrar; no se multa al jugador después de aceptar una ruta imposible. Los horarios posteriores a medianoche se almacenan como minutos mayores que 1.440 para preservar el orden de la noche. No se agrega un margen de montaje separado de los tiempos anteriores.

`getCircuitPreview` devuelve la ruta y una estimación de ingreso, cachés, transporte, saldo neto y energía **suponiendo que se realizan todas las funciones seleccionadas**. Esa estimación no garantiza la recaudación si hay suspensiones. También informa `requiredCash`: el máximo déficit acumulado que podría exigir el recorrido con el clima previsto. Con tiempo inestable considera todos los subconjuntos posibles de funciones realizadas, evitando que una parada rentable suspendida deje sin caja para pagar otra. No es una retención ni un cobro adicional.

### Clima y liquidación de la salida

`getCircuitForecast` devuelve **seco, inestable o lluvia**, fijado por temporada y jornada. No consulta un servicio meteorológico ni cambia al recargar. En seco se realizan las paradas; con tiempo inestable se suspende una parte; con lluvia se suspenden todas. Esta última regla corresponde a los **seis espacios abiertos sin alternativa cubierta del catálogo ficticio**. La investigación sí documenta escenarios reales con traslado a sala, por lo que no debe presentarse como regla universal del carnaval.

Las suspensiones se resuelven **antes de partir**. Cada parada cancelada registra cero ingreso, cachés y transporte; no produce desgaste, XP ni otros efectos de actuación. Los viajes se calculan entre las paradas realizadas, omitiendo las canceladas. Cada función realizada registra su ingreso bruto, los cachés del elenco y transporte; el saldo neto modifica la caja una sola vez.

Confirmar una noche totalmente suspendida consume la jornada sin ingresos ni gastos de circuito. El historial conserva las paradas previstas, cuáles se realizaron o cancelaron, clima y liquidación. Cualquier avance de jornada vacía el plan anterior, de modo que un segundo clic no puede volver a cobrar la misma salida. Una ejecución bloqueada por agenda, caja o disponibilidad no liquida ni consume la jornada.

### Guardado v9 y continuidad económica

La clave activa es **`director-de-murga-v9`**. Agenda e historial se guardan dentro de `circuit`, con copias independientes de las paradas y sus resultados. Al pasar de temporada se inicia un circuito vacío. El detalle de cada noche pertenece al año en curso; los cierres anuales conservan las cuentas agregadas, sin incorporar un archivo permanente de cada itinerario.

La migración **v8 → v9** conserva la partida, la caja y el libro de cuentas. Añade `plan: []` e `history: []`, y copia los ingresos y costos de actuaciones ya contabilizados a `legacyIncome` y `legacyCosts`. Esos totales permiten conciliar la actividad anterior con las nuevas salidas; **no reconstruyen escenarios, clima ni actuaciones desconocidas**, ni acreditan dinero otra vez. Se preservan avances del espectáculo, contratos pendientes, carreras, decisiones, resultados y archivos. Las claves previas y el guardado cosmético mantienen su tratamiento anterior.

## Base funcional v8 conservada en v9: acordar la continuidad del elenco

### El cierre anual y el nuevo armado

`nextSeason` requiere una campaña terminada. Primero archiva el cierre con su caja, cuentas, espectáculo y trayectorias; después suma la financiación ficticia anual, actualiza edad, experiencia y fama y abre el armado de abril. Los 17 IDs del elenco pasan a `State.pendingRenewals`. **No se cobra ninguna renovación en el cambio de año**, ni se promete que todas las personas aceptarán continuar. La referencia de honorarios se actualiza con fama y experiencia públicas, sin usar la capacidad artística oculta.

El año inicial comienza con sus 17 acuerdos confirmados. A partir del siguiente armado, iniciar la producción requiere resolver todas las plazas además de contratar los cinco oficios técnicos. Mientras quede algún contrato pendiente se bloquean las acciones que avanzan el calendario y el desarrollo del espectáculo. Se puede negociar, conversar dentro del cupo, contratar técnicos, elegir vestuario y buscar reemplazos sin adelantar la jornada, respetando la reserva de presupuesto para completar el elenco.

### Oferta, aceptación y cobro

`getRenewalQuote` devuelve el honorario, la disposición a aceptar y una explicación pública para cada oferta. La renovación estándar toma el **15% del honorario de referencia** del integrante. La generosa aplica **×1,20** y la preferencial **×1,45** sobre esa base; el resultado se redondea hacia arriba a centenas de UYU. Estas cifras, los niveles de oferta y las condiciones de aceptación son **balance ficticio del videojuego**, no convenios laborales, tarifas oficiales ni una descripción universal de cómo negocian las murgas reales. Los cachés por actuación siguen siendo un gasto separado.

La continuidad pondera reputación de la murga, expectativas asociadas a la fama del integrante, vínculo construido, lealtad, ánimo y compromiso económico de la oferta. La habilidad interna no interviene. Una oferta mayor puede mejorar la disposición, pero no garantiza aceptación ni sustituye la caja necesaria. Las expectativas de reputación se recalculan al actualizar la fama en el cambio anual.

`renewMember` cobra únicamente una oferta aceptada, la registra en `accounts.recruitment` y retira ese ID de pendientes. No consume jornada, no modifica las notas del concurso ni concede experiencia. Repetir la firma de alguien ya confirmado no vuelve a cobrar. Rechazos por condiciones, presupuesto o momento inválido conservan el estado económico y no deshacen el cierre del año anterior.

`renewAllWilling` procesa ofertas **estándar** en el orden del elenco. Recalcula la caja y la reserva para las otras plazas antes de cada firma, omite a quienes rechazan o no pueden pagarse sin comprometer esa ruta y puede completar solo una parte del plantel. No aplica automáticamente las contraofertas seleccionadas en tarjetas individuales. `getRenewalSummary` informa confirmados, pendientes y referencia estándar del saldo pendiente: esa estimación no es un cargo ni una garantía de aceptación. `getSeasonRenewalCost` anticipa la referencia con las carreras del próximo año si la temporada terminó; durante un armado devuelve la de los pendientes actuales.

### Conversar o reemplazar

`contactMember` admite candidatos del mercado y componentes actuales con contrato pendiente; `contactCandidate` se conserva como entrada compatible. Ambos comparten **tres conversaciones por jornada** y la espera de **dos jornadas** para repetir persona. Son gratuitas y no adelantan el calendario. Con contratos pendientes no se puede usar descanso u otra actividad para renovar ese cupo: después de agotarlo, quedan la oferta económica o el reemplazo.

Contratar a un candidato de la misma función resuelve la plaza saliente y deja al nuevo integrante confirmado mediante su pago de incorporación; no exige cobrarle además una renovación. La persona liberada vuelve al mercado con su identidad y carrera. Las firmas artísticas anteriores no se reembolsan al reemplazar a alguien.

### Protección de presupuesto durante las negociaciones

`getContractReserve` calcula una ruta viable y conservadora para las plazas pendientes, usando renovaciones aceptables o candidatos distintos de la misma función. Devuelve si esa ruta existe, su costo y pasos con integrante saliente, oferta, honorario y candidato cuando corresponda. Solo utiliza condiciones públicas y vínculos; no recomienda según talento. No pretende encontrar una combinación óptima ni obliga a seguir sus sustituciones.

Mientras hay pendientes, cada gasto neto positivo se contrasta con la ruta que quedaría **después** de la operación. Si la caja resultante no alcanza para resolver el resto, o no se encuentra una ruta aceptable, la operación se rechaza sin cobrar. Esto alcanza renovaciones individuales y conjuntas, incorporaciones, audiciones, técnicos y confección. Una cotización de mercado considera la plaza concreta que se reemplaza. La reserva no es un cargo, no bloquea fondos en otra cuenta y no firma contratos automáticamente.

Los reintegros siguen permitidos. Mientras no se inició la producción, cambiar una selección técnica devuelve el honorario anterior; cambiar de vestuarista devuelve también la confección pagada y borra esa propuesta. La protección se limita a las **plazas pendientes**: no incluye los cinco técnicos, el traje ni la preparación posterior, y deja de aplicarse cuando el elenco está confirmado. Por eso no equivale a una garantía general de solvencia de la temporada.

### Contratos incorporados en v8 y compatibilidad

La clave histórica **`director-de-murga-v8`** incorporó los contratos pendientes, ahora conservados en v9. Sus IDs forman parte de la partida, de modo que una recarga conserva firmas parciales y sus cobros. El validador exige IDs únicos del elenco actual y admite pendientes únicamente en temporada 2 o posterior, jornada interna 0, estado activo y producción sin iniciar. No acepta que una campaña avanzada conserve contratos sin resolver.

La migración **v7 → v8** preserva todos los campos anteriores y añade **`pendingRenewals: []`**: los acuerdos existentes permanecen confirmados y no se cobran por segunda vez. Conserva dinero, contabilidad, avances del espectáculo, decisiones, resultados, archivo e identidades. No suma financiación ni aplica otra bonificación anual. Las migraciones desde versiones anteriores mantienen sus pasos previos. Las claves antiguas se conservan como respaldo y las apariencias siguen guardadas aparte, por ID.

## Base funcional v7 conservada en v9: crear el espectáculo

### Título, tema y tres partes

`State.show` guarda el título, tema, foco de ensayo, estado de bloqueo y progreso de saludo, cuplé y retirada. Cada parte registra tres avances de 0 a 100: **texto, arreglos e interpretación ensayada**. Esta división es una simplificación del videojuego, no un formato obligatorio para todas las murgas.

El título admite de 2 a 60 caracteres normalizados, sin etiquetas ni controles. La propuesta inicial es **«Una voz en la esquina»**. Las tres temáticas son ficticias:

| Tema | Propuesta | Afinidad de desarrollo |
| --- | --- | --- |
| Barrio | La esquina y su gente | Avance equilibrado de texto y arreglos. |
| Memoria | Las voces que vuelven | Mayor afinidad con arreglos corales. |
| Sátira | El ministerio del disparate | Mayor afinidad con escritura. |

`configureShow` permite guardar el plan sin gastar dinero ni avanzar el calendario. El **primer desarrollo técnico o ensayo realizado** confirma el título y el tema para esa temporada. Una tarea bloqueada o rechazada no los fija. El foco de ensayo se puede cambiar después; una temporada terminada no admite cambios de planificación ni nuevo trabajo.

### Trabajo técnico y ensayo

`developShow` trabaja texto o arreglos de una parte. Requiere los 17 acuerdos del elenco, los cinco puestos técnicos contratados y producción iniciada, caja suficiente y una jornada disponible. Una decisión pendiente o una presentación oficial impiden adelantar trabajo por esta vía. Se puede desarrollar antes de julio; los ensayos del elenco mantienen su apertura desde julio.

| Actividad | Costo de balance | Tiempo | Efecto |
| --- | --- | --- | --- |
| Desarrollar texto de una parte | UYU 4.000 | Una jornada | Aumenta su texto según letrista y afinidad temática. |
| Trabajar arreglos de una parte | UYU 5.000 | Una jornada | Aumenta sus arreglos según arreglador y afinidad temática. |
| Ensayar, con foco general o individual | UYU 6.000 | Una jornada | Aumenta la interpretación preparada y mantiene los efectos habituales de práctica, experiencia y cansancio del elenco. |

Los importes son parámetros del juego, no tarifas actuales de técnicos o locales. El trabajo técnico no produce práctica, experiencia ni desgaste del elenco; su costo se registra una vez en `accounts.rehearsals`, bajo el rubro **Trabajo creativo, ensayos y logística**. No sustituye los honorarios de contratación ni cobra una mejora de nivel adicional.

El balance de desarrollo usa **50 puntos base**, más **0, 5 o 10** según el perfil técnico contratado. Barrio añade 2 tanto a texto como a arreglos; memoria añade 4 a arreglos y sátira 4 a texto. Cada operación se limita al avance restante hasta 100, y una tarea completa queda deshabilitada.

`setRehearsalFocus` elige repaso general o una parte sin gastar recursos ni jornada. Un ensayo general suma **hasta 12** a cada parte; uno enfocado suma **hasta 36** a la elegida. La interpretación de cada sección tiene un techo de `20 + 0,8 × min(texto, arreglos)`: ensayar sin suficiente material llega a un límite, aunque la práctica general del elenco continúe. Ese techo y los topes de 100 reducen el incremento efectivo cuando corresponde.

### Avance visible y efecto acotado

`getShowSummary` muestra plan, foco y los nueve avances. El indicador conjunto es su promedio, redondeado a un decimal. Describe trabajo acumulado; no es una nota del jurado ni una medición exacta de la capacidad de las personas.

Los arreglos y ensayos pueden aportar **hasta +4 al valor interno de voces** y el texto **hasta +4 al de textos**, antes de las ponderaciones y límites habituales. No equivalen a ocho puntos de concurso garantizados ni modifican resultados ya registrados. Permanecen vigentes el cansancio, la armonía, los aportes técnicos y el resto de la preparación. Elegir sátira, memoria o barrio no expresa una preferencia política del jurado.

Las tareas representan gestión creativa. No generan letras reales, melodías, grabaciones ni nuevas prendas. El vestuario continúa con sus dos propuestas contratadas y su propia confección.

### Archivo del espectáculo incorporado en v7

La clave histórica `director-de-murga-v7` incorporó los campos del espectáculo, ahora conservados en v9. El título, tema, foco, bloqueo y avances sobreviven a la recarga. Al pasar de año se copia al cierre un `ShowSnapshot` con título, tema, avance total y las tres secciones; no comparte objetos mutables con el espectáculo siguiente. El plan del nuevo año vuelve a la propuesta inicial, foco general, sin bloqueo y con los nueve avances en cero.

La migración **v6 → v7** conserva identidad, carrera, elenco, candidatos, cuentas, decisiones, resultados y el resto de la partida. Añade el espectáculo inicial sin atribuirle trabajo que v6 no registraba. Los archivos anteriores reciben **`show: null`**, presentado como falta de registro, no como preparación cero de aquel año ni pérdida de su historia. Las notas ya obtenidas no se recalculan por migrar.

Los nuevos archivos mantienen la publicación de resultados y el límite de 50 cierres definidos en v6. La migración no suma financiación, no cobra técnicos y no reinicia la temporada. Las claves anteriores permanecen respaldadas y las apariencias siguen en su guardado independiente.

## Base funcional v6 conservada en v9: identidad y trayectoria

### Una murga con nombre propio

`State.identity` contiene el nombre y el barrio o localidad. Ambos admiten de 2 a 40 caracteres, con espacios normalizados, sin etiquetas ni caracteres de control. Los valores iniciales son **La Vereda** y **Montevideo**. La opción **Tu murga** permite modificarlos sin consumir jornada, caja ni recursos artísticos. No cambia las identidades de integrantes, sus apariencias ni el catálogo de vestuario.

La identidad se presenta en la sede, las conversaciones de mercado, la comunidad y los resultados. La interfaz trata los textos como contenido, no como HTML. Cambiar el nombre actual no renombra rivales ni reescribe los años archivados: cada cierre conserva su propia identidad.

### Informe de la temporada y archivo anual

`getSeasonReport` devuelve un informe público del año actual: estado de la campaña, identidad, caja, cuentas, reputación, seguidores y elenco con sus datos públicos. Las notas de las ruedas, su total, promedio y puesto permanecen ocultos hasta los fallos; la admisión conserva su tratamiento separado y no se suma al concurso.

Un `nextSeason` exitoso archiva la temporada que terminó **antes** de sumar financiación y aplicar bonificaciones de experiencia o fama del nuevo año. Así, la caja y las carreras del cierre corresponden al año archivado. Una campaña en curso no genera un cierre ni incrementa contadores. Desde v8, las renovaciones se negocian y cobran después, en el nuevo armado; su aceptación no condiciona la existencia del archivo anterior.

El paso de año también constituye el cierre público del carnaval: si el jugador eliminado en segunda rueda no había visitado el epílogo, las notas de ese año quedan publicadas en su archivo. Esto no descubre las notas del nuevo año ni crea una tercera actuación que no ocurrió.

Cada entrada conserva los siguientes datos:

- Temporada, nombre y barrio o localidad de ese cierre, resultado y condición de inscripción directa.
- Caja final y libro de cuentas anterior a los movimientos del año siguiente.
- Reputación, seguidores, rondas cumplidas y resultados publicados.
- Identificador, nombre, función, XP y fama de los integrantes de aquel elenco. No incluye su voz, habilidad o carisma internos.

`getSeasonHistory` entrega copias de los últimos **50 cierres**, ordenados por temporada. Los cambios posteriores de nombre, contratos, dinero o miembros no alteran esos registros. Los contadores de temporadas completadas, campeonatos y finales abarcan todo el período registrado, incluso cuando las entradas más antiguas dejan de caber en el archivo. El panel debe distinguir ese total del número de archivos retenidos.

### Comparación del elenco y de la caja

`getRosterProgress` compara a cada integrante actual con **el mismo ID en el último cierre archivado**. Muestra XP y fama actuales y sus diferencias públicas. Una incorporación sin referencia en ese cierre, o una partida sin archivos, devuelve diferencias `null`: la interfaz indica que falta una referencia, en vez de inventar un cero o atribuir toda la experiencia a este año. La comparación incluye lo ocurrido desde ese cierre, también la bonificación del cambio de temporada. No ordena ni recomienda personas por habilidades internas.

Los ingresos de actividad incluyen actuaciones, aportes barriales y premios del juego. Los gastos agrupan contratos, confección, audiciones, mejoras, ensayo, actuaciones y convivencia. **`accounts.opening` queda fuera de ingresos operativos y gastos**: identifica capital inicial o financiación más remanente, no dinero ganado actuando. La caja de cierre y el resultado operativo se muestran como conceptos diferentes. Estos cálculos son contabilidad simplificada del juego, sin introducir tarifas reales nuevas.

### Identidad y continuidad incorporadas en v6

La clave histórica `director-de-murga-v6` introdujo `identity`, `history` y contadores de carrera con `sinceSeason`, conservados ahora en v9 junto a los campos de v5. El archivo guarda copias independientes y se incorpora una sola vez al cierre. La interfaz consume las APIs públicas, que no exponen capacidades artísticas ocultas; el guardado local completo sigue conteniendo los datos internos necesarios para la simulación.

La migración **v5 → v6** conserva los datos anteriores y agrega identidad inicial, historial vacío y contadores desde la temporada en curso. No deduce campeonatos pasados ni inventa planteles, balances o progresos que el guardado antiguo no registró. El primer cierre posterior a la actualización inicia el archivo real. Las comparaciones sin referencia siguen siendo desconocidas.

Las claves anteriores quedan respaldadas. Las migraciones más antiguas conservan sus pasos previos: **v4 → v5** incorpora comunidad sin cambiar dinero; **v3 → v4** contiene la conversión histórica de calendario y economía documentada más abajo. Ninguno de esos ajustes debe atribuirse al cambio directo de v5 a v6. Las apariencias mantienen su clave separada y los mismos IDs.

## Base funcional v5 conservada en v9: la vida de la murga

La campaña conserva el armado de abril, 32 jornadas representativas, 120 candidatos persistentes y un elenco de 17 integrantes. El mercado abre hasta terminar septiembre; se ensaya desde julio, la admisión ocurre en noviembre y el circuito de tablados empieza a fines de enero. Son fechas comprimidas de esta simulación. Las cinco contrataciones técnicas, la economía en UYU, las carreras entre temporadas y las propuestas de vestuario introducidas en v4 siguen vigentes.

### Barrio, ánimo y financiación

**El barrio** permite consultar el ánimo colectivo, los seguidores, la reputación, las conversaciones disponibles y el historial de decisiones. El ánimo también se muestra por integrante; no representa su habilidad artística. Ensayo, actuaciones, descanso, convivencia y decisiones producen efectos distintos. Su promedio modifica de forma acotada la preparación del conjunto, sin revelar una nota futura del concurso.

- **Festival del barrio (`fundraiser`).** Hasta tres por temporada, antes de la apertura de tablados y fuera de las jornadas reservadas a preparación de admisión e inscripción. Consume una jornada y energía, exige caja para la organización y genera recaudación, seguidores y ánimo. La interfaz anticipa el saldo neto; la contabilidad separa ingresos brutos y gastos. No es una actuación del circuito comercial ni una fuente ilimitada de dinero.
- **Encuentro del elenco (`community`).** Consume una jornada y un gasto de comida y materiales. Mejora ánimo, energía, lealtad y vínculo con el grupo; no aumenta habilidades ni experiencia artística por sí mismo. Los incrementos respetan los topes de cada recurso.
- **Conversar (`contactMember`, con compatibilidad `contactCandidate`).** Tres contactos gratuitos por jornada; dos jornadas de espera para volver a hablar con la misma persona. Desde v8 incluye componentes con renovación pendiente, compartiendo el cupo con candidatos. No adelanta el calendario. El vínculo influye de forma limitada en la negociación junto con reputación y oferta económica. No revela habilidad ni elimina las expectativas de la persona.

Los valores y límites anteriores son reglas del juego. [VIDA-DE-MURGA-FUENTES.md](VIDA-DE-MURGA-FUENTES.md) documenta festivales, financiación comunitaria, otros empleos y trabajo creativo colectivo. Las fuentes describen casos; no fijan estos cupos, efectos o costos ni un procedimiento universal para ensayar con lluvia.

### Seis decisiones del año

Cada situación tiene dos opciones con costo, ánimo y energía visibles. Siempre existe una alternativa sin gasto. La decisión detiene las acciones que adelantan el calendario hasta que se resuelve, pero elegir no consume la jornada: después se puede ensayar, descansar o realizar otra actividad permitida. Cerrar el panel conserva la decisión pendiente y su aviso en la sede.

| Jornada visible | Índice interno `day` | Situación implementada | Alternativas |
| --- | --- | --- | --- |
| 8 | 7 | El ensayo y el trabajo | Reorganizar el horario o cubrir traslados. |
| 14 | 13 | Un cuplé divide al grupo | Conversarlo entre todos o pagar una instancia de trabajo. |
| 21 | 20 | Lluvia en el local | Adaptar la reunión a distancia o alquilar un espacio alternativo. |
| 24 | 23 | La última prueba de escena | Resolver ajustes con el equipo o sumar apoyo. |
| 28 | 27 | Cuidarnos en carnaval | Reservar un descanso común u organizar comida y recuperación. |
| 31 | 30 | El último acuerdo | Hacer una ronda de palabra o preparar un encuentro con más logística. |

Son situaciones ficticias con consecuencias de balance; no sanciones oficiales ni sucesos atribuidos a artistas reales. Ninguna posición política del cuplé garantiza puntos. Los eventos propuestos en el documento de fuentes son inspiración y no una lista adicional de funciones implementadas.

### Caja, persistencia y cambio de temporada

La libreta de caja incorpora `communityIncome` y `communityCosts`: recaudación de festivales por un lado, organización, encuentros y opciones pagadas por otro. Estos movimientos participan en el mismo balance que contratos, confección, ensayos y actuaciones; no son premios externos a la contabilidad.

Estos campos fueron introducidos en **v5**, con clave histórica `director-de-murga-v5`, y ahora se conservan dentro del guardado v9: ánimo, vínculos, última conversación de cada persona, cuota diaria, festivales utilizados, decisión pendiente e historial de decisiones. La resolución y sus efectos forman un único estado guardado; volver a cargar o pulsar de nuevo una opción ya resuelta no repite sus efectos. El elenco y los candidatos conservan sus campos al intercambiar una plaza.

La migración **v4 → v5** mantiene dinero, carreras, resultados y partidas contables anteriores. Inicializa los campos comunitarios y marca eventos pasados como anteriores a esta actualización, sin aplicar recompensas retroactivas. Si corresponde un evento a la jornada actual, se presenta pendiente. La migración **v3 → v4 → v5** conserva primero la conversión histórica de calendario y economía, incluida su financiación de transición; no confundir ese ajuste con la migración directa desde v4. Las claves anteriores se respaldan y un guardado activo inválido se copia a una clave de recuperación.

Al cambiar de temporada se mantienen identidades y vínculos, se restablecen cuotas de conversación y festivales, se inicia otro historial anual y se modera el ánimo hacia su valor inicial. La financiación anual se suma en el cambio de año; desde v8, la renovación se contabiliza después, al firmar los acuerdos. No se puede abandonar una campaña en curso para conseguir experiencia o ingresos de un nuevo año.

### Vestuario contratado y probador

Antes de contratar al vestuarista, sus diseños permanecen ocultos. Después aparecen exactamente dos propuestas, con corte, paleta y costo de confección. La vista previa 3D no compra ni persiste cambios de apariencia. Una vez pagada una propuesta, escena y probador utilizan ese diseño: el jugador puede personalizar identidad y accesorios, pero no cambiar a un corte o paleta ajenos a la compra.

Las ocho prendas y doce paletas forman el catálogo técnico para propuestas de distintas temporadas. El probador sin restricciones queda disponible para desarrollo; no constituye un catálogo de compras libres dentro de la campaña. Las caras, peinados, piel y altura se guardan por identidad, incluso cuando un integrante vuelve al mercado. Al cambiar de año, el escenario vuelve a ropa de ensayo hasta contratar y confeccionar el nuevo vestuario.

Las instrucciones de desarrollo y compilación nativa están en [README.md](README.md). La documentación económica fechada está en [ECONOMIA-Y-CARRERAS-FUENTES.md](ECONOMIA-Y-CARRERAS-FUENTES.md); no presentar los parámetros de balance como precios actuales de servicios reales.

## Antecedente v4: una murga con trayectoria — 30 de septiembre de 2026

- Inicio en abril; mercado abierto durante el armado hasta septiembre. Ensayos desde julio, admisión en noviembre y tablados desde fines de enero. Son 32 jornadas representativas, no días seguidos.
- 120 candidatos ficticios persistentes, además del elenco de 17. Fama, edad y experiencia públicas; habilidades internas ocultas. Las audiciones dan informes cualitativos. Ofertas estándar, generosa y preferencial; aceptación según reputación y expectativas, sin sobres aleatorios.
- Cinco contratos técnicos antes de iniciar la campaña. El vestuarista contratado revela exactamente dos diseños propios, con vista previa 3D y confección presupuestada aparte del honorario creativo. La mecánica de dos propuestas es del juego.
- La vestimenta del escenario deriva de la propuesta pagada. El probador restringe corte y paleta a ese diseño; permite variar caras, pelo, altura, maquillaje y sombrero sin cambiar la compra.
- Economía en pesos uruguayos: financiación inicial de $1.200.000, costos históricos como referencia y precios de balance identificados. Una jornada de circuito agrupa dos actuaciones. Se registran ingresos brutos, pagos al elenco, transporte y neto; los populares pueden dejar pérdida.
- Las carreras persisten al terminar el año: identidades, experiencia y habilidades no se reinician. Se conservan reputación y remanente, se suma financiación ficticia anual y se pagan renovaciones reducidas. Los técnicos y el vestuario se preparan para cada espectáculo.
- Guardado v4 con migración v3, respaldo de la clave anterior y financiación de transición registrada. Apariencias independientes y persistentes incluso para integrantes liberados que vuelven al mercado.

Evidencia, fechas, precios históricos y límites: [ECONOMIA-Y-CARRERAS-FUENTES.md](ECONOMIA-Y-CARRERAS-FUENTES.md). La implementación y los valores vigentes están en `src/simulation.ts`; la interfaz nunca presenta su habilidad interna como una valoración real de personas.

## Antecedente v3: especificación histórica

**Archivo de diseño:** las secciones restantes conservan propuestas y límites de v3. El calendario, las funciones y el guardado vigentes están descritos arriba en v9 y sus bases funcionales v8, v7, v6 y v5.

## Propuesta

Juego de gestión para celulares sobre conducir una murga de Montevideo: contratar el equipo técnico, crear la propuesta artística, organizar un elenco con funciones distintas y administrar su preparación, voz y dinero. La pretemporada se financia con una caja inicial ficticia, después de pagar los honorarios del armado. Los tablados se habilitan cerca del comienzo del carnaval de verano; desde entonces, actuar permite financiar mejoras y también produce desgaste.

El público objetivo disfruta planificar y mejorar una agrupación mediante partidas cortas y controles táctiles. La identidad se apoya en el humor, el coro, la batería, la dirección, el maquillaje y la vida de barrio. La versión v3 distingue las funciones escénicas y las del equipo técnico; sus efectos numéricos y la evaluación siguen siendo simplificaciones de un videojuego.

## Antes de la temporada: armar el espectáculo

La partida comienza en una fase de **contratación**, anterior al primer turno del calendario. Hay que cubrir cinco puestos técnicos y después elegir **comenzar temporada**. Mientras el equipo esté incompleto o no se haya iniciado la campaña, no se puede ensayar, actuar, competir, mejorar el espectáculo ni reemplazar componentes.

| Puesto técnico obligatorio en el juego | Aporte que modela el prototipo |
| --- | --- |
| Letrista | Calidad de los textos del espectáculo. |
| Arreglador/a coral | Arreglos y coordinación del trabajo musical. |
| Vestuarista | Calidad de vestuario dentro de la evaluación. |
| Maquillador/a | Calidad de maquillaje como rubro separado. |
| Puestista | Puesta en escena y articulación de la propuesta escénica. |

Cada oficio ofrece tres perfiles ficticios, identificados como Barrial, Profesional y Referente, con distintos honorarios y calidad. Son niveles de estas tarjetas, no una valoración general de las personas que trabajan en el carnaval. El honorario se descuenta de la caja al contratar; sustituir una elección durante el armado devuelve exactamente el pago anterior antes de cobrar el nuevo. No es un salario recurrente. Al comenzar la temporada, el equipo queda fijado para esa campaña y la caja remanente financia la preparación.

Las cinco contrataciones y la separación de personas son **reglas de diseño**, no una obligación del reglamento real. En la práctica, una persona puede combinar funciones; una futura versión podrá modelar esa posibilidad. El puestista técnico y la dirección escénica del elenco son puestos distintos en esta versión, y ninguno se confunde con el jugador que gestiona la murga.

El armado toma de los juegos de gestión la decisión de repartir un presupuesto entre especialización y margen de maniobra. La interfaz debe mostrar qué mejora cada perfil, cuánto cuesta y cuánto dinero quedará. Crear el espectáculo representa reunir estos aportes; no implica generación automática de libreto, música, vestuario o modelos 3D.

## Alcance y calendario de esta versión

Después del armado, una temporada utiliza **20 turnos**, identificados internamente como `day = 0…19`. Representan momentos seleccionados de varios meses, no veinte días consecutivos ni el fixture de una edición real. Contratar técnicos no adelanta esos turnos.

| Turnos internos | Momento representado | Actividad |
| --- | --- | --- |
| 0–3 | Noviembre | Preparación y prueba de admisión en el turno 3; tablados bloqueados. |
| 4–5 | Diciembre | Ensayos, descanso, ajustes de elenco y mejoras; tablados bloqueados. |
| 6–7 | Enero, antes de la apertura | Preparación final del espectáculo; tablados bloqueados. |
| Desde 8 | Fines de enero, apertura de temporada | Se habilitan actuaciones en tablados. |
| 9 | Primera rueda | Presentación oficial; todos los participantes continúan a segunda rueda. |
| 14 | Segunda rueda | Se decide el acceso a Liguilla con el acumulado de ambas ruedas. |
| 19 | Liguilla y fallos | La suma de las tres ruedas determina el resultado final. |

El calendario documentado de **2026** tuvo admisión en noviembre de **2025**, desfile el 22 de enero de 2026 y aperturas de tablados desde fines de enero, distintas según escenario. El calendario **2027** ya anunciado también separa admisión en noviembre de comienzo del concurso en enero. Las fechas verificadas, reprogramaciones, fuentes y límites están en [CALENDARIO-FUENTES.md](CALENDARIO-FUENTES.md).

La aplicación utiliza **TypeScript, Vite y Three.js**, con proyectos **Capacitor 8 para Android e iOS**. Dispone de armado técnico, gestión de caja, voz, percusión, dirección, afinidades vocales, reclutamiento por función y mejoras, más un elenco 3D con cuerpo y esqueleto compartidos y vestuario intercambiable. Los proyectos nativos no equivalen a binarios compilados, firmados ni publicados.

## Bucle de juego

1. Contratar los cinco oficios, evaluar la caja restante y comenzar la temporada.
2. Consultar caja, estado del elenco, fase y próximo hito.
3. Revisar coro, batería y dirección; ajustar las cuerdas únicamente de los coreutas y decidir mejoras o reemplazos de la misma función.
4. Elegir ensayo o descanso; actuar en tablados solamente cuando la temporada los habilite.
5. Resolver gastos, ingresos, cansancio y preparación con consecuencias visibles.
6. Presentarse al llegar a cada hito, manteniendo ocultos los puntajes del concurso hasta los fallos.
7. Completar la temporada y usar el resultado para decidir otra combinación de equipo técnico y estrategia.

El avance depende de decisiones, sin esperas de tiempo real. La interfaz debe distinguir acciones que consumen turno de ajustes de preparación. El objetivo de una decisión breve no justifica borrar la separación entre noviembre y carnaval de verano.

## Sistemas y balance

| Sistema | Regla de diseño |
| --- | --- |
| Caja | Los honorarios iniciales compiten con el dinero disponible para preparar la temporada. No hay premios económicos por admisión, primera rueda ni segunda rueda. Ganar el concurso concede un bono final ficticio de 1.200 unidades de la moneda del juego; no representa un arancel ni premio monetario oficial. |
| Estado del elenco | La voz se evalúa sobre el coro; batería y dirección aportan sus propias habilidades y sufren cansancio. Ensayar y actuar producen desgaste; descansar permite recuperarse. |
| Ensayo | Mejora preparación a cambio de tiempo, voz y costo. Ninguna especialidad debe resolver por sí sola la temporada. |
| Tablados | Se bloquean hasta el turno 8. Popular y comercial son perfiles simplificados, con ingresos y desgaste propios del videojuego; no tarifas verificadas. |
| Cartas | Contratar reemplaza una plaza de la misma función. Una carta de bombo no sustituye un coreuta ni elimina otro instrumento; las cuerdas pertenecen solo al coro. No hay compras con dinero real. |
| Mejoras | Se invierte en el espectáculo sin convertir una ponderación reducida en reproducción exacta del jurado. |
| Repertorio | Preparar una declaración es una acción gratuita de organización. No compra una licencia general ni causa multas automáticas. |

El balance v3 parte de **3.200 unidades de caja**. Los siguientes honorarios son valores ficticios del juego y se pagan una vez al contratar:

| Oficio | Barrial | Profesional | Referente |
| --- | ---: | ---: | ---: |
| Letrista | 180 | 340 | 520 |
| Arreglador/a coral | 220 | 380 | 560 |
| Vestuarista | 170 | 330 | 510 |
| Maquillador/a | 140 | 300 | 480 |
| Puestista | 190 | 350 | 530 |
| Equipo completo | 900 | 1.700 | 2.600 |
| Caja restante | 2.300 | 1.500 | 600 |

Cada escalón tiene calidad de oficio 45, 65 u 85. Su aporte adicional al rubro es respectivamente 0, 4 u 8 puntos sobre la base del espectáculo. Arreglos también aporta 0, 2,5 o 5 puntos de coordinación. La calidad 45 cubre el puesto y permite empezar; el cero indica ausencia de bonificación adicional, no ausencia de trabajo. El maquillaje solo se desarrolla mediante esta contratación en la v3; no tiene una mejora independiente en el taller.

Ensayar cuesta 20 y consume un turno: mejora la voz de cada coreuta en 2, la técnica de cada percusionista en 1,5 y la conducción en 1, con desgaste de 8, 6 y 5 puntos de energía respectivamente. La energía del HUD promedia los diecisiete componentes. El cansancio vocal en la evaluación se calcula sobre los trece coreutas; batería y dirección influyen mediante su rendimiento propio. El concurso simplificado pondera voces ×4, textos ×4, vestuario ×2, puesta ×2 y maquillaje ×1, sobre una suma de pesos de 13. La admisión excluye vestuario y maquillaje y usa suma de pesos 10. Estos cálculos no reproducen la planilla oficial.

El código de simulación es la referencia para los valores vigentes. Comparar equipo técnico económico con más mejoras, inversión selectiva en especialistas y equipo costoso con menos caja. La mejor contratación no debe decidirse solamente por el número más alto de una tarjeta: debe importar su efecto y el costo de oportunidad. Verificar también ensayo intensivo, descanso y diferentes agendas de tablados. No fijar valores monetarios a partir de precios de entradas al público: esos precios no equivalen al pago de una murga.

## Admisión, concurso y resultados

La admisión usa un **índice de preparación del prototipo** basado en voces, textos y puesta; vestuario y maquillaje se incorporan a la evaluación de concurso posterior. Los técnicos correspondientes se contratan desde el armado para preparar toda la temporada. Esta fórmula y su umbral son reglas propias. El [reglamento histórico de 2015 publicado por DAECPU](https://www.daecpu.org.uy/images/old/pdf/reglamento-2015.pdf) aporta antecedentes, pero no permite afirmar que ese mismo sistema siga vigente en 2026 o 2027.

El concurso contiene la murga del jugador y **18 rivales ficticios**: diecinueve participantes en la simulación, sin reproducir los conjuntos reales de una edición. La primera rueda no elimina por un umbral aislado. Tras la segunda, se acumulan ambas notas y clasifican las primeras diez posiciones, incluyendo a quienes empaten en el corte. Para quienes llegan a Liguilla, el ganador se determina por la suma de las tres ruedas.

Los puntajes del concurso se mantienen ocultos hasta los fallos finales; la clasificación se comunica cuando corresponde. La admisión se trata por separado. Una estimación de preparación, si se muestra, debe identificarse como cálculo del juego y no como nota conocida del jurado. Los resultados por rueda y el registro de acciones permiten revisar la estrategia seguida. La [explicación oficial de IM, actualizada el 23/3/2026](https://montevideo.gub.uy/area-tematica/cultura-y-tiempo-libre/carnaval-y-llamadas/concurso-oficial), describe las dos ruedas iniciales, la clasificación por suma y la apertura de puntajes en la Noche de Fallos.

Si la murga queda fuera de la Liguilla, el botón **Ir a la Noche de Fallos** abre un epílogo: revela las dos notas y su suma sobre 200, sin sumar la admisión ni inventar una tercera actuación o una tabla de finalistas. Esta elección se guarda mediante `fallosRevealed`; conserva el turno 14 y los recursos con los que terminó la participación, y sigue visible al reabrir la partida.

Esta estructura corrige el modelo anterior de superar cuatro umbrales independientes con premios en dinero. Solo se conserva una recompensa ficticia por la victoria final. La fórmula artística, los puntajes de los rivales y la compresión en turnos siguen siendo abstracciones.

## Elenco de diecisiete componentes

La v3 distingue **13 coreutas, 1 bombo, 1 redoblante, 1 platillero/a y 1 director/a escénico/a**. Las cinco personas del equipo técnico se gestionan aparte y no ocupan esas plazas. El [Museo del Carnaval](https://www.museodelcarnaval.org/el-carnaval-de-montevideo-2/) describe la murga a partir del coro, la dirección y la batería de tres instrumentos; la distribución exacta de trece voces de esta plantilla es una elección del juego, no una cuota universal del reglamento.

La distribución vocal inicial del prototipo es **2 bajos, 3 segundos, 4 primos, 2 sobreprimos y 2 tercias**. Únicamente esos trece componentes tienen cuerda vocal. La armonía se calcula con el coro; percusión y dirección tienen habilidades y efectos distintos. El ensayo no trata a un redoblante como una voz adicional.

Los reemplazos conservan la estructura: coreuta por coreuta, bombo por bombo, redoblante por redoblante, platillos por platillos y dirección por dirección. Esto permite mejorar integrantes sin perder una función indispensable del conjunto. El balance, los nombres ficticios y las estadísticas no reproducen personas ni planteles reales.

## Fuentes y límites del reglamento

| Tema | Evidencia y límite | Consecuencia de diseño |
| --- | --- | --- |
| Ediciones y calendario | 2026 es una temporada terminada; 2027 tiene fechas anunciadas. Las aperturas varían por escenario y las etapas pueden reprogramarse. [Investigación del calendario](CALENDARIO-FUENTES.md). | Separar pretemporada y temporada; no trasladar fechas de un año a otro. |
| Concurso 2026 | La Resolución 576/25/8000 regula dos ruedas iniciales y una tercera o Liguilla; consultar sus artículos 16–19 y 30 para clasificación y acumulación. El artículo 53 fija para murga entre 14 y 17 componentes y una actuación de 40–45 minutos. [Documento de IM reproducido por Carnaval del Futuro](https://www.carnavaldelfuturo.com.uy/_files/ugd/79790f_3f1f186386d1409dbd81be5d6501a7e1.pdf). | Conservar estructura acumulativa y distinguirla de la fórmula artística simplificada. |
| Evaluación artística | La tabla específica de murga pondera Voces y Arreglos y Textos; contempla otros rubros y una valoración global de aspectos escénicos. La copia consultada de la resolución 2026 está alojada por un tercero. | No afirmar que toda coreografía o movimiento sea inútil. Los pesos reducidos de la interfaz pertenecen al juego. |
| Reglamento general 2027 | El documento general es distinto del reglamento específico del concurso y del técnico de admisión. [DAECPU, reglamento general 2027](https://daecpu.org.uy/images/2026/reglamento-general-de-carnaval.pdf). | No presentar una regla histórica o de otro documento como regla vigente sin identificar edición y alcance. |
| Derechos de autor | El formulario de AGADU recoge declaración de repertorio y obras utilizadas; no documenta una sanción automática del concurso ni una tarifa universal. [Declaración de repertorio](https://www.agadu.org/documentos/declaracion_carnaval.pdf). | La preparación de la declaración es gratuita dentro del videojuego; no reproduce el costo de un trámite real ni genera sanciones. |

La declaración del juego no equivale a un trámite legal real ni acredita derechos sobre música. Antes de usar una obra en el producto, resolver sus autorizaciones de producción. La investigación reglamentaria debe mantener separados texto vigente, antecedente histórico y decisión propia del videojuego.

## Escena y recursos: nueva dirección

El murguista generado previamente con Meshy fue **retirado del juego y archivado** tras la revisión del usuario. No se considera una referencia visual aprobada. El encargo histórico consumió 30 créditos; esta corrección no autoriza ni necesita nuevas generaciones.

**El usuario generará y entregará los nuevos murguistas individualmente.** La integración se organiza mediante un manifiesto de modelos con componentes separados; su versión de formato es independiente de la del guardado de partida. No hay una biblioteca nueva terminada ni personajes nuevos incluidos por esa declaración de formato. No generar variantes, instrumentos o escenarios por iniciativa automática ni gastar más créditos.

La escena usa 17 instancias animadas de un cuerpo compartido. El coro canta, el director conduce desde el centro adelante y la batería permanece detrás con instrumentos vinculados a sus anclajes. Los marcadores de rol se conservan como reemplazo si el recurso no carga.

La formación visual elegida por el usuario coloca a los **trece coreutas mirando al público**, la **batería detrás del coro** y al **director en el centro adelante, mirando hacia el coro**. En coordenadas de la escena, el público está hacia +Z; los percusionistas tienen Z menor que todos los coreutas; dirección se ubica en X=0, con Z mayor que el coro y orientación hacia −Z. El director muestra movimiento de conducción; se respeta la preferencia de movimiento reducido y la pausa al pasar a segundo plano. Esta composición es una decisión concreta del juego, no una disposición universal de toda murga.

La sede o patio de ensayo y los tablados se muestran abiertos, sin paredes ni techo. La nueva [referencia del Teatro de Verano aportada por el usuario](assets/references/teatro-de-verano-user.png) actualiza esa indicación general para este recinto: el Teatro utiliza una concha escénica o bóveda con frente abierto, retícula, varas de iluminación, paneles LED y luces violeta, magenta, azul y blancas. Es una interpretación visual, sin afirmar exactitud arquitectónica ni escala oficial; la foto se conserva como referencia, no como fondo plano ni como fuente de personajes.

El Teatro aparece automáticamente en la admisión y las ruedas, turnos **3, 9, 14 y 19**. Fuera de esos hitos, antes del turno 8 se presenta el patio de ensayo y desde el turno 8 el tablado abierto. La vista previa manual permite inspeccionar el Teatro sin consumir jornadas ni modificar el guardado. Todos los ambientes conservan la batería detrás del coro y la dirección centrada adelante, mirando al conjunto.

Para cada recurso entregado, revisar GLB, escala, orientación, materiales, geometría, texturas y peso antes de incorporarlo. Mantener identidad individual y evitar la repetición automática del modelo descartado. Los presupuestos de rendimiento deben verificarse con la escena completa en un teléfono representativo. La clave de cualquier servicio de producción nunca pertenece al cliente, los recursos públicos o este documento.

La dirección final del tablado, iluminación, personajes y vestuario se ajustará a las referencias que el usuario apruebe. Coro, percusión y dirección deben poder distinguirse también en su representación provisional. La propuesta de color y las referencias primarias están en [DIRECCION-ARTISTICA.md](DIRECCION-ARTISTICA.md); no constituyen una paleta oficial del Carnaval. El audio deberá ser original o autorizado.

## Interfaz, guardado y mobile

### Personajes y vestuario: decisión confirmada del usuario

El usuario eligió **un solo cuerpo, variando caras, pelo, altura y colores** después de rechazar el encaje de la primera ropa independiente. Este acuerdo sustituye la idea de que cualquier personaje completo generado por separado pueda usar directamente cualquier traje. Todos los personajes definitivos se construirán sobre una misma anatomía y un mismo esqueleto; las identidades seguirán siendo distintas.

La apariencia es una composición de cuerpo común + cara + peinado + traje + sombrero + maquillaje + paleta. La altura cambia mediante escala uniforme de todo el conjunto, incluidos los accesorios. Las variantes de rostro conservan la unión al cuello, el volumen de apoyo del sombrero y las UV de la cara. Cada peinado entrega su variante con sombrero. Cada traje se ajusta y se vincula al esqueleto común una sola vez, antes de entrar en el catálogo.

El archivo `assets/character-system/contract.json` registra la decisión y el criterio de aceptación. La base canónica animada existe en `public/models/character-system/canonical.glb`; su autoría reproducible y auditoría se guardan junto al contrato. El estilo de volados aceptado por el usuario se extiende a una colección de cortes distintos. Mila es una referencia visual estática; el traje y sombrero generados quedan como bocetos, y el maquillaje existente depende de las UV específicas de Mila. Ocultar partes del cuerpo no sustituye la preparación de prendas ni acredita compatibilidad universal.

El catálogo implementa un cuerpo, cuatro caras, dos peinados, ocho cortes de traje, un sombrero y un maquillaje. Las doce paletas sirven para cada corte, dando 96 combinaciones de traje y color. Hay casacas cortas, bolero, levita abierta, frac con colas divididas, capa y paños largos de gala. Se revisan frente, lados, espalda, brazos levantados, codos flexionados, canto, desplazamiento, dirección y percusión. Para teléfono, las prendas siguen el esqueleto con animación preparada; no se simula tela en tiempo real sobre diecisiete integrantes.

Caja, energía del elenco, fase y próximo hito permanecen legibles. Usar zonas táctiles amplias, contraste suficiente, etiquetas además del color, áreas seguras y controles que funcionen sin hover. Los paneles deben explicar por qué los tablados están cerrados en noviembre y pretemporada.

El esquema de guardado es **v3**, con clave `director-de-murga-v3`. Las partidas v1 y v2 se conservan por separado con sus claves anteriores y se inicia un armado compatible con el equipo técnico y las funciones nuevas. No se convierten silenciosamente diecisiete cantantes antiguos en una plantilla diferente ni se deducen honorarios sin una elección. El guardado automático conserva las decisiones resueltas; reiniciar la partida actual requiere confirmación.

Medir rendimiento y consumo, limitar trabajo gráfico innecesario y pausar actividad cuando la aplicación queda en segundo plano. Probar guardado y reanudación dentro de Android e iOS además de la versión web. Las instrucciones y limitaciones de compilación están en [README.md](README.md).

## Contenido posterior y monetización

Las crisis futuras son propuestas pendientes, no funcionalidades completas: lluvia y reprogramación según el escenario, reparación de vestuario, cuidado de voces, invitaciones barriales y ajustes de texto. Sus causas, costos y efectos deben ser comprensibles. Evitar sanciones atribuidas falsamente a organismos reales y tragedias de personas reales convertidas en eventos.

El prototipo no incluye compras ni apuestas. **No habrá gacha de dinero real.** Las cartas usan moneda del juego; la voz es un recurso estratégico, no una espera que se cobra por saltar. Cualquier monetización futura requiere una decisión de producto separada.

## Hoja de ruta

1. Validar contratación de los cinco oficios, cambios y reembolsos antes del inicio, bloqueo de acciones y persistencia v3 durante el armado y la temporada.
2. Verificar los trece coreutas y las cuatro funciones restantes, reemplazos compatibles, efectos diferenciados y estrategias de presupuesto técnico.
3. Conservar el calendario corregido, clasificación acumulada, empates en el corte y confidencialidad de puntajes; probar temporadas completas con los rivales ficticios.
4. Recibir los componentes que genere el usuario, revisar su integración y ampliar las familias de eventos con revisión cultural, reglamentaria y de balance.
5. Compilar y probar en teléfonos Android e iOS, revisar rendimiento sostenido, reanudación, accesibilidad, sonido y recursos.
6. Preparar publicación solamente después de revisar permisos de recursos, requisitos de tiendas, firma y afirmaciones de fidelidad histórica.
