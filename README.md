# Director de Murga

Prototipo de gestión sobre el Carnaval de Montevideo. TypeScript, Vite y Three.js, con proyectos nativos de Capacitor 8 para Android e iOS. El diseño y sus simplificaciones están en [DISENO.md](DISENO.md); las fechas verificadas, sus fuentes y la separación entre 2026 y 2027, en [CALENDARIO-FUENTES.md](CALENDARIO-FUENTES.md). La paleta propuesta y sus referencias primarias se documentan en [DIRECCION-ARTISTICA.md](DIRECCION-ARTISTICA.md).

La revisión **v10**, del **14 de octubre de 2026**, incorpora ajustes de calidad y movimiento para el escenario y el taller. Ofrece Ahorro (hasta 20 FPS, densidad máxima 1 y sin sombras), Equilibrado (hasta 30 FPS y densidad máxima 1,25) y Más fluidez (hasta 60 FPS y densidad máxima 1,5). Respeta densidades menores del dispositivo y la preferencia de reducir movimiento del sistema. El escenario suspende su renderizado cuando queda detrás de un panel o del taller, fuera de vista, con la aplicación oculta o sin contexto gráfico. Los límites son objetivos de renderizado, no mediciones de rendimiento en teléfonos.

Las preferencias visuales se guardan por separado. **La simulación y el guardado de campaña continúan en v9**: esta entrega no reinicia la partida ni cambia su economía. La verificación de los ajustes está en [QA-MOVIL-V10.md](QA-MOVIL-V10.md); los pendientes y criterios para una primera beta están en [BETA-PENDIENTES.md](BETA-PENDIENTES.md).

La campaña comienza en **abril**, con 120 artistas ficticios disponibles y un elenco barrial de 17 integrantes. Podés negociar antes de contratar al equipo técnico. La fama es pública; la habilidad real permanece oculta, y una audición entrega un informe cualitativo. Las figuras pueden rechazar ofertas por falta de reputación o confianza. Tres niveles de propuesta permiten mejorar los honorarios sin sortear personas nuevas.

**Agenda de tablados** permite combinar de una a tres actuaciones entre seis escenarios ficticios, desde fines de enero. Cada función dura 40 minutos; el recorrido necesita 20 minutos dentro de una zona o 45 entre zonas. Preparar o vaciar la agenda es gratis; confirmar una salida consume una jornada. Las jornadas oficiales y las decisiones pendientes impiden salir al circuito. Horarios, zonas y costos son simplificaciones de la campaña, no itinerarios reales. Las fuentes y sus límites están en [CIRCUITO-FUENTES.md](CIRCUITO-FUENTES.md).

Antes de salir se muestran ingresos, cachés, transporte, saldo y desgaste estimados **si se realizan todas las funciones**. La caja exigida cubre el peor saldo acumulado de los recorridos posibles con el clima anunciado. El clima es ficticio y queda fijado por temporada y jornada: seco, inestable o lluvia. Las suspensiones ocurren antes de partir y no generan ingreso, cachés, transporte, energía consumida ni XP por esas paradas; confirmar la noche igualmente consume la jornada. Los seis espacios de esta versión son abiertos y sin respaldo cubierto, por eso la lluvia suspende todos: no es una regla de todos los tablados reales. El historial conserva el resultado de cada salida del año.

**Acuerdos del elenco** permite negociar quién continúa al cambiar de año. La financiación anual se recibe al pasar de temporada, pero los 17 integrantes quedan pendientes y no se cobra ninguna renovación automáticamente. Podés ofrecer condiciones estándar, generosas (+20%) o preferenciales (+45%); la continuidad depende de trayectoria pública, reputación, vínculo, lealtad y ánimo, sin usar la habilidad oculta. La firma se cobra una sola vez y no consume jornada. La renovación estándar toma el 15% del honorario de referencia actualizado; las tres ofertas se redondean hacia arriba a centenas de UYU. Son reglas de balance ficticias, no acuerdos laborales ni tarifas oficiales.

La firma conjunta cierra únicamente las ofertas estándar aceptadas que pueden pagarse conservando el presupuesto para resolver las demás plazas; puede dejar contratos pendientes. También podés conversar o reemplazar a alguien por un candidato de la misma función: la incorporación pagada confirma esa plaza y no genera otro cobro de renovación. Hasta reunir **17 acuerdos** no se puede iniciar la producción ni avanzar el calendario. El elenco inicial y las partidas migradas desde v7 conservan sus contratos confirmados.

Mientras haya pendientes, el juego protege una reserva para una combinación viable de renovaciones y reemplazos. Impide gastos que dejen la caja por debajo de esa ruta, incluso si la compra aislada alcanza; la reserva no se descuenta ni firma por vos. Los reintegros siguen permitidos. Esa protección cubre los acuerdos restantes, por lo que todavía debés presupuestar técnicos, confección y preparación.

**El espectáculo** permite poner un título de 2 a 60 caracteres y elegir una temática ficticia: barrio, memoria o sátira. Saludo, cuplé y retirada tienen avances separados de texto, arreglos y ensayo. Desarrollar texto cuesta $4.000 UYU y trabajar arreglos $5.000 UYU por parte, además de una jornada; son valores de balance. El letrista y el arreglador contratados influyen en el avance. Ese trabajo técnico no consume energía del elenco ni reemplaza el ensayo.

Podés ensayar el conjunto o concentrarte en una parte. Cambiar el foco es gratis y no adelanta el calendario; ensayar sí usa una jornada, caja y energía. Su avance depende del texto y los arreglos preparados. El primer trabajo técnico o ensayo fija el título y el tema para el resto del año. Los indicadores describen trabajo realizado y aportan mejoras acotadas a la preparación: no anticipan las notas del jurado. Este sistema gestiona la creación; no genera letras ni música reales.

**Tu murga** permite elegir nombre y **barrio o localidad**, de 2 a 40 caracteres por campo. Los valores iniciales son La Vereda y Montevideo. Cambiarlos no consume jornada ni dinero; la identidad se refleja en sede, mercado, comunidad y resultados. Los años ya archivados conservan el nombre y lugar con los que cerraron.

**Trayectoria** reúne el informe actual, los últimos **50 cierres de temporada** y el progreso público del elenco. Cada cierre conserva identidad, resultado, caja, cuentas, reputación, seguidores y el plantel de ese año, antes de aplicar financiación y bonificaciones de carrera del siguiente. Las renovaciones se negocian después y se registran en las cuentas del nuevo año. Desde v7 también guarda título, tema y avance de las tres partes del espectáculo; los archivos anteriores indican que no tienen ese registro. Los contadores abarcan desde que comenzó el registro, aunque los archivos más antiguos superen el límite de 50. La comparación de XP y fama usa el mismo ID de integrante frente al último cierre; si falta esa referencia, indica que no hay comparación. No muestra habilidades internas.

Los ingresos y gastos del informe separan la actividad de la temporada del capital de apertura: `accounts.opening` no cuenta como ingreso operativo. Los puntajes actuales del concurso se reservan hasta los fallos. Pasar con éxito al año siguiente cierra y publica el informe anterior, incluso si quedaba pendiente visitar el epílogo. Una oferta de renovación rechazada durante el nuevo armado no cobra, no avanza el tiempo y no modifica ese cierre.

**El barrio** reúne la financiación y la convivencia. Podés organizar hasta tres festivales antes de que abra el circuito de tablados, respetando las jornadas reservadas a la admisión. Cada festival consume una jornada y energía, paga organización y registra recaudación bruta y saldo neto. Compartir una jornada con el grupo tiene un costo y mejora ánimo, energía, lealtad y vínculos; no concede práctica artística. El ánimo de cada integrante cambia con las actividades e influye moderadamente en la preparación del conjunto.

En el mercado hay **tres conversaciones gratuitas por jornada**, sin adelantar el calendario. Candidatos y componentes con renovación pendiente comparten ese cupo. Para volver a hablar con la misma persona deben pasar dos jornadas. El vínculo puede ayudar a una oferta futura, sin revelar la habilidad ni garantizar la contratación. Seis decisiones del año abordan trabajo y ensayo, desacuerdos de texto, lluvia, ajustes de escena, cansancio de carnaval y el cierre colectivo. Cada una muestra costos y efectos, ofrece una alternativa sin gasto y debe resolverse antes de avanzar; responder no consume la jornada. El historial queda en El barrio. Los testimonios y sus límites están en [VIDA-DE-MURGA-FUENTES.md](VIDA-DE-MURGA-FUENTES.md); las situaciones y consecuencias del juego son ficticias.

Llegar a la Liguilla permite confirmar la inscripción directa al año siguiente: el juego no cobra desgaste ni evalúa una prueba ficticia. El antecedente normativo verificado es el reglamento específico 2026, art. 30; la continuidad del mecanismo para 2027 también fue informada por [El País el 8 de septiembre de 2026](https://www.elpais.com.uy/tvshow/teatro-y-carnaval/carnaval-2027-cuando-sera-el-desfile-inaugural-el-concurso-oficial-y-el-desfile-de-llamadas).

La campaña comprime abril–marzo en **32 jornadas**. El mercado cierra al terminar septiembre; los ensayos comienzan en julio. Son decisiones del juego inspiradas en prácticas documentadas, no plazos reglamentarios universales. En los índices internos `day = 0…31`, la admisión ocurre en 18, los tablados abren en 24 y las ruedas son en 25, 28 y 31; la interfaz numera las jornadas desde 1. Desde v9, cada salida al circuito representa las actuaciones compatibles elegidas por el jugador, con sus cachés, transporte y saldo neto. Las fuentes y límites de los precios están en [ECONOMIA-Y-CARRERAS-FUENTES.md](ECONOMIA-Y-CARRERAS-FUENTES.md).

Los cinco oficios técnicos se contratan aparte del elenco: letras, arreglos, vestuario, maquillaje y puesta. El vestuarista **no revela sus diseños antes de contratarlo**. Después presenta exactamente dos propuestas para la temporada, cada una con su modelo 3D, paleta y presupuesto de confección. La selección pagada determina el vestuario del escenario y del probador. Las ocho prendas y doce paletas existentes alimentan las distintas propuestas; no se compran recursos de servicios externos.

La economía se expresa en **UYU**, con caja inicial ficticia de $1.200.000. Los importes individuales son balance del juego apoyado en referencias históricas, no tarifas actuales certificadas. La libreta registra contratos, confección, audiciones, trabajo creativo, ensayos, mejoras, actuaciones, cachés, traslados y premios, además de ingresos barriales y gastos de organización, convivencia y decisiones. El desarrollo técnico comparte el rubro de trabajo creativo, ensayos y logística, sin cobrarse dos veces. Los puntajes del concurso siguen reservados hasta los fallos.

**Próxima temporada** conserva identidades, habilidades, experiencia, fama, reputación y remanente; suma financiación del nuevo año, actualiza las carreras y abre los 17 acuerdos pendientes. La referencia de renovación es una estimación: el dinero se descuenta al firmar cada contrato. Archiva el espectáculo anterior y comienza otro con sus nueve avances en cero, título y tema editables y foco general. No se puede ganar experiencia reiniciando una temporada en curso. Los integrantes liberados vuelven al mercado con su trayectoria.

El guardado usa `director-de-murga-v9`. La migración **v8 → v9** conserva la partida e incorpora agenda e historial de circuito vacíos; registra los ingresos y costos anteriores como totales heredados, sin inventar actuaciones pasadas ni cambiar la caja. La agenda y las salidas nuevas sobreviven a la recarga; al pasar de año comienza otro historial de circuito, mientras el cierre anual conserva sus cuentas agregadas. También se mantienen las renovaciones pendientes de un armado parcialmente firmado.

La migración previa **v7 → v8** considera confirmados los acuerdos existentes: añade `pendingRenewals: []`, sin cobrar otra vez ni reiniciar el año. La anterior **v6 → v7** incorpora un espectáculo nuevo, sin reconstruir avances anteriores: «Una voz en la esquina», tema barrio, foco general y plan sin bloquear. Los archivos existentes reciben `show: null`; no se borran ni se les atribuye un espectáculo inventado. Desde **v5** se mantiene el paso previo que añade identidad, archivo vacío y contadores desde la temporada de actualización (`sinceSeason`). Desde **v4** se añaden primero los campos comunitarios sin cambiar la caja; desde **v3** sigue aplicándose la conversión histórica de calendario y economía a v4, con su financiación de transición. Las claves anteriores se conservan como respaldo. Un guardado actual inválido se copia a una clave de recuperación antes de recuperar una versión anterior o iniciar otro estado. Las apariencias siguen en un guardado independiente; se preservan caras, pelo, altura y colores aunque un artista salga del elenco.

## Jugar y desarrollar

Verificación de **v10**: **85 pruebas aprobadas**, recorrido de ajustes, persistencia, pausa y cámara en navegador, revisión del panel a 390 × 844 CSS px, compilación web y sincronización Android/iOS. Alcance y límites en [QA-MOVIL-V10.md](QA-MOVIL-V10.md). No equivale a ejecutar binarios en teléfonos físicos. Los recorridos anteriores de circuito y contratos están en [QA-CIRCUITO-V9.md](QA-CIRCUITO-V9.md) y [QA-CONTRATOS-V8.md](QA-CONTRATOS-V8.md).

Requiere Node.js 22 o superior. Desde esta carpeta:

```sh
npm ci
npm run dev
```

Abrir [localhost:5174](http://localhost:5174). En Windows también se puede ejecutar `Jugar.cmd`. Para probar desde un celular en la misma red, usar la dirección de red que muestra Vite y permitir el puerto 5174 en el firewall cuando corresponda.

```sh
npm test
npm run build
npm run preview
```

`test` ejecuta las pruebas de simulación, personajes y política de renderizado. `build` verifica TypeScript y genera `dist/`. `preview` sirve esa compilación en [localhost:4174](http://localhost:4174).

El juego utiliza recursos locales: escena y personajes 3D, iconos y fuentes DM Sans/Playfair Display incluidas mediante `@fontsource`. El paquete nativo está preparado para funcionar sin conexión después de instalarse y no solicita recursos de Meshy ni Google Fonts durante la partida; falta comprobarlo en binarios instalados en dispositivos. La versión web necesita que el servidor local permanezca activo; no incluye todavía un service worker para instalarla como PWA sin conexión. `npm ci` necesita acceso a Internet cuando las dependencias no estén en caché.

## Sincronizar los proyectos nativos

Los proyectos `android/` e `ios/` ya están creados; iOS utiliza Swift Package Manager. El identificador es `uy.carnaval.directordemurga` y el nombre visible es **Director de Murga**.

```sh
npm run mobile:sync
npx cap doctor
```

La sincronización construye primero la web y copia `dist/` a ambos proyectos; también actualiza sus plugins. Repetirla después de cambiar código, recursos o plugins. No volver a ejecutar `cap add` sobre estas carpetas.

## Android

Instalar Android Studio 2025.2.1 o posterior con Android SDK Platform 36, herramientas de compilación y un emulador, o conectar un teléfono con depuración USB. Seleccionar un JDK 21 compatible en Gradle; el Java 11 detectado en este equipo no alcanza para las fuentes de Capacitor. El proyecto declara Android mínimo API 24 y objetivo API 36. [Entorno oficial de Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup).

```sh
npm run mobile:sync
npm run android
```

En Android Studio, esperar la sincronización de Gradle, elegir el dispositivo y ejecutar **Run**. Alternativa para un APK de desarrollo desde PowerShell, con SDK y JDK configurados:

```powershell
.\android\gradlew.bat -p android assembleDebug
```

El resultado esperado es `android/app/build/outputs/apk/debug/app-debug.apk`. Para publicar, configurar firma propia y generar el AAB de release en Android Studio; este repositorio no contiene una clave de firma de producción.

## iOS

Compilar en un Mac con Xcode 26 o posterior y sus herramientas de línea de comandos. El proyecto apunta a iOS 15 o superior. Tras copiar el proyecto al Mac, instalar dependencias con `npm ci` y ejecutar:

```sh
npm run mobile:sync
npm run ios
```

Xcode abrirá `ios/App/App.xcodeproj` y resolverá Swift Package Manager. Seleccionar el target App, configurar el equipo de desarrollo en **Signing & Capabilities**, elegir simulador o teléfono y ejecutar **Run**. La distribución en TestFlight/App Store requiere cuenta, certificados/perfiles y archivo de release; no se ha configurado ni realizado aquí.

El archivo `ios/App/App/PrivacyInfo.xcprivacy` está incluido en los recursos del target App y declara `NSPrivacyAccessedAPICategoryUserDefaults` con motivo `CA92.1`, para el guardado local mediante Preferences. Revisar ese manifiesto si cambian los plugins o el uso de datos. [Preferences y manifiesto de privacidad](https://capacitorjs.com/docs/apis/preferences).

## Estado del entorno y pendientes

Inspección actualizada el **14/10/2026** en Windows: Node 24.1.0 y Java 11.0.30 disponibles; `ANDROID_HOME` y `ANDROID_SDK_ROOT` no definidos, `adb` ausente del PATH y Android SDK/Studio no encontrados en las ubicaciones habituales. Gradle 8.14.3 ya está disponible en la caché, pero las fuentes nativas requieren JDK 21. Se verificaron de nuevo compilación web y sincronización de ambas plataformas. Después de modificar código, repetir `npm test` y `npm run mobile:sync` para copiar el estado actual. Los diagnósticos y la sincronización no compilan ni ejecutan la aplicación nativa; iOS necesita Xcode en macOS.

Queda pendiente compilar y probar los binarios nativos con los entornos indicados, comprobar guardado y reanudación en teléfonos reales, revisar rendimiento con los recursos 3D actuales, sustituir los splash nativos de plantilla y configurar firma/distribución. Esta revisión no aporta nuevos binarios Android o iOS. Una compilación web o una sincronización exitosa no acreditan pruebas nativas.

## Recursos incluidos

El murguista generado inicialmente con Meshy fue **retirado del juego y archivado** porque su apariencia no fue aprobada. El encargo anterior consumió **30 créditos**; el saldo observado entonces fue **2.646 créditos**. Es un registro histórico, no una consulta actual del saldo. No se generan más recursos ni se consumen nuevos créditos en esta corrección.

**Base compartida confirmada por el usuario.** El catálogo activo es `public/models/character-system/catalog.json`; `canonical.glb` contiene cuerpo, variantes, traje, sombrero, maquillaje y siete clips. El GLB se reconstruye sin servicios externos con `npm run assets:character`. El anterior `public/models/manifest.json` queda como registro de modelos estáticos recibidos, fuera de la carga activa. Un GLB arbitrario de Meshy debe adaptarse al cuerpo, pose y esqueleto comunes para intercambiar prendas. El guardado cosmético `director-de-murga-character-system-v1` conserva elecciones por ID del integrante, separado de la partida. No incluir claves de servicios en código, assets, variables públicas de Vite ni paquetes nativos.

Los iconos nativos provienen del diseño propio `public/icon.svg`. iOS incluye un PNG RGB opaco de 1024 × 1024 en `ios/App/App/Assets.xcassets/AppIcon.appiconset/`. Android incluye iconos normales, redondos y capas transparentes en las cinco densidades `mipmap-mdpi` a `mipmap-xxxhdpi`, con fondo verde y un primer plano contenido en el área segura del icono adaptable. No se descargó un diseño externo. Las imágenes y sus dimensiones se verificaron; queda pendiente inspeccionarlas en launchers y dispositivos reales.

El Teatro de Verano tiene una escena propia basada en la referencia visual aportada: bóveda curva, retícula, pantallas y focos violeta/azul/blanco. Aparece en admisión y ruedas oficiales. El botón **Ver Teatro de Verano** permite visitarlo en cualquier otra fase y volver a la murga sin avanzar la jornada ni modificar el guardado. Patio y tablados mantienen su ambiente abierto.

El botón **Vestuario** abre las propuestas o, si ya elegiste y pagaste una, el probador de ese diseño. Antes de contratar al vestuarista no se muestran sus propuestas. Después podés previsualizar las dos alternativas en 3D sin comprar; cada vista queda limitada a su corte y paleta y no guarda cambios de apariencia. Tras pagar la confección, personalizás integrantes, caras, pelo, piel, altura, sombrero y maquillaje, manteniendo el corte y la paleta contratados. La comparación muestra el mismo diseño en otra identidad y permite revisar las animaciones. **Vestir a toda la murga** aplica el diseño contratado, sombrero y maquillaje elegidos, y conserva cara, pelo, piel y altura de cada componente.

El catálogo técnico contiene ocho cortes y doce paletas —96 combinaciones posibles— para generar propuestas de distintas temporadas. Eso no habilita su selección libre durante la partida. El modo completo del probador, sin restricciones de catálogo, se conserva para desarrollo y revisión de recursos.
