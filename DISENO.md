# Director de Murga

Documento de diseño del prototipo. La revisión vigente es **v6, del 1 de octubre de 2026**: añade identidad e historial de carrera a los sistemas comunitarios de v5, que se conservan. Las secciones v4 y v3 son antecedentes; sus versiones, calendarios y tareas pendientes no sustituyen el estado actual. Los valores concretos de balance están en `src/simulation.ts`. Esta actualización documental no acredita nuevas pruebas de navegador ni una compilación o ejecución nativa de v6.

## Revisión vigente v6: identidad y trayectoria

### Una murga con nombre propio

`State.identity` contiene el nombre y el barrio o localidad. Ambos admiten de 2 a 40 caracteres, con espacios normalizados, sin etiquetas ni caracteres de control. Los valores iniciales son **La Vereda** y **Montevideo**. La opción **Tu murga** permite modificarlos sin consumir jornada, caja ni recursos artísticos. No cambia las identidades de integrantes, sus apariencias ni el catálogo de vestuario.

La identidad se presenta en la sede, las conversaciones de mercado, la comunidad y los resultados. La interfaz trata los textos como contenido, no como HTML. Cambiar el nombre actual no renombra rivales ni reescribe los años archivados: cada cierre conserva su propia identidad.

### Informe de la temporada y archivo anual

`getSeasonReport` devuelve un informe público del año actual: estado de la campaña, identidad, caja, cuentas, reputación, seguidores y elenco con sus datos públicos. Las notas de las ruedas, su total, promedio y puesto permanecen ocultos hasta los fallos; la admisión conserva su tratamiento separado y no se suma al concurso.

Un `nextSeason` exitoso archiva la temporada que terminó **antes** de sumar financiación, descontar renovación y aplicar bonificaciones de experiencia o fama del nuevo año. Así, la caja y las carreras del cierre corresponden al año archivado. Una campaña en curso o una renovación que no puede pagarse no genera un cierre ni incrementa contadores.

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

### Guardado v6 y continuidad

La clave activa es `director-de-murga-v6`. El esquema añade `identity`, `history` y contadores de carrera con `sinceSeason`, junto a los campos de v5. El archivo guarda copias independientes y se incorpora una sola vez al cierre. La interfaz consume las APIs públicas, que no exponen capacidades artísticas ocultas; el guardado local completo sigue conteniendo los datos internos necesarios para la simulación.

La migración **v5 → v6** conserva los datos anteriores y agrega identidad inicial, historial vacío y contadores desde la temporada en curso. No deduce campeonatos pasados ni inventa planteles, balances o progresos que el guardado antiguo no registró. El primer cierre posterior a la actualización inicia el archivo real. Las comparaciones sin referencia siguen siendo desconocidas.

Las claves anteriores quedan respaldadas. Las migraciones más antiguas conservan sus pasos previos: **v4 → v5** incorpora comunidad sin cambiar dinero; **v3 → v4** contiene la conversión histórica de calendario y economía documentada más abajo. Ninguno de esos ajustes debe atribuirse al cambio directo de v5 a v6. Las apariencias mantienen su clave separada y los mismos IDs.

## Base funcional v5 conservada en v6: la vida de la murga

La campaña conserva el armado de abril, 32 jornadas representativas, 120 candidatos persistentes y un elenco de 17 integrantes. El mercado abre hasta terminar septiembre; se ensaya desde julio, la admisión ocurre en noviembre y el circuito de tablados empieza a fines de enero. Son fechas comprimidas de esta simulación. Las cinco contrataciones técnicas, la economía en UYU, las carreras entre temporadas y las propuestas de vestuario introducidas en v4 siguen vigentes.

### Barrio, ánimo y financiación

**El barrio** permite consultar el ánimo colectivo, los seguidores, la reputación, las conversaciones disponibles y el historial de decisiones. El ánimo también se muestra por integrante; no representa su habilidad artística. Ensayo, actuaciones, descanso, convivencia y decisiones producen efectos distintos. Su promedio modifica de forma acotada la preparación del conjunto, sin revelar una nota futura del concurso.

- **Festival del barrio (`fundraiser`).** Hasta tres por temporada, antes de la apertura de tablados y fuera de las jornadas reservadas a preparación de admisión e inscripción. Consume una jornada y energía, exige caja para la organización y genera recaudación, seguidores y ánimo. La interfaz anticipa el saldo neto; la contabilidad separa ingresos brutos y gastos. No es una actuación del circuito comercial ni una fuente ilimitada de dinero.
- **Encuentro del elenco (`community`).** Consume una jornada y un gasto de comida y materiales. Mejora ánimo, energía, lealtad y vínculo con el grupo; no aumenta habilidades ni experiencia artística por sí mismo. Los incrementos respetan los topes de cada recurso.
- **Conversar con candidatos (`contactCandidate`).** Tres contactos gratuitos por jornada; dos jornadas de espera para volver a hablar con la misma persona. No adelanta el calendario. El vínculo influye de forma limitada en la negociación junto con reputación y oferta económica. No revela habilidad ni elimina las expectativas del candidato.

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

Estos campos fueron introducidos en **v5**, con clave histórica `director-de-murga-v5`, y ahora se conservan dentro del guardado v6: ánimo, vínculos, última conversación de cada persona, cuota diaria, festivales utilizados, decisión pendiente e historial de decisiones. La resolución y sus efectos forman un único estado guardado; volver a cargar o pulsar de nuevo una opción ya resuelta no repite sus efectos. El elenco y los candidatos conservan sus campos al intercambiar una plaza.

La migración **v4 → v5** mantiene dinero, carreras, resultados y partidas contables anteriores. Inicializa los campos comunitarios y marca eventos pasados como anteriores a esta actualización, sin aplicar recompensas retroactivas. Si corresponde un evento a la jornada actual, se presenta pendiente. La migración **v3 → v4 → v5** conserva primero la conversión histórica de calendario y economía, incluida su financiación de transición; no confundir ese ajuste con la migración directa desde v4. Las claves anteriores se respaldan y un guardado activo inválido se copia a una clave de recuperación.

Al cambiar de temporada se mantienen identidades y vínculos, se restablecen cuotas de conversación y festivales, se inicia otro historial anual y se modera el ánimo hacia su valor inicial. La financiación anual y la renovación del elenco siguen contabilizadas. No se puede abandonar una campaña en curso para conseguir experiencia o ingresos de un nuevo año.

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

**Archivo de diseño:** las secciones restantes conservan propuestas y límites de v3. El calendario, las funciones y el guardado vigentes están descritos arriba en v6 y su base funcional v5.

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
