# Dirección artística de Director de Murga

Especificación de trabajo para interfaz, escena y futuros componentes entregados por el usuario. Fuentes consultadas el **29 de septiembre de 2026**. La paleta y las reglas de composición siguientes son propuestas del juego, no colores oficiales del Carnaval ni rasgos obligatorios de toda murga.

## Identidad que debe comunicar

La primera lectura debe ser una murga preparando un espectáculo colectivo: coro, batería y dirección se reconocen como funciones distintas. La interfaz acompaña el proceso de contratar un equipo técnico, crear la propuesta, ensayar y salir al carnaval. La alegría puede estar en el color y la ilustración incluso durante la preparación; la escena reserva su mayor actividad para las actuaciones.

No existe un único traje que represente a todas las murgas. Para este juego, el usuario eligió un cuerpo común, con identidad individual mediante caras, pelo, altura y colores. El vestuario se construye sobre ese cuerpo para poder compartirlo entre los diecisiete integrantes. Los modelos externos se conservan como referencias y requieren ajuste al rig común antes de incorporarse.

## Vestuario basado en la fotografía del usuario

La referencia activa es `assets/references/murga-vestuario-dsc08137-800.jpg`. Sus rasgos principales son el satén verde petróleo, los grandes volados de tela superpuestos en cuello y hombros, pliegues fucsias y bordó con sombras profundas, adornos dorados y un tocado alto de tela retorcida. El objetivo es que esos volúmenes se reconozcan desde la cámara del juego.

- Los volados necesitan superficie plegada, bordes finos y separación entre capas. Una fila de bolitas o una línea de otro color no reproduce ese volumen.
- El pecho lleva grupos de paños doblados y las mangas tienen volumen y pliegues. La tela mantiene brillo moderado, con valles oscuros y crestas iluminadas.
- El tocado se resuelve con lóbulos de tela, vueltas y huecos visibles, manteniendo el apoyo común sobre la cabeza.
- La colección combina casacas cortas, boleros, capas y prendas largas abiertas. Los pantalones conservan sus dos piernas; las levitas y casacas largas llevan aberturas o faldones separados para distinguir el corte al caminar.
- Cuello, puños y hombros deben conservar el encaje durante canto, caminata y dirección. Todas las piezas escalan con el cuerpo completo.

La fotografía orienta la forma y el material. Las variantes cambian el corte, la distribución de volados y la longitud, manteniendo su compatibilidad con el cuerpo común. Cada traje debe reconocerse por su geometría además de su paleta; los colores se pueden combinar con todos los cortes.

## Referencias primarias y qué permiten aprender

| Referencia | Observación y aplicación | Límite |
| --- | --- | --- |
| [Museo: Maquillajes y vestuarios](https://www.museodelcarnaval.org/maquillajes-y-vestuarios/) | El archivo registra conjuntos antes y durante su paso por el Teatro de Verano; la página identifica a Alicia Teibo como responsable desde 2014. La foto de **Agarrate Catalina, Carnaval 2020**, revisada en el visor, muestra coro en línea con micrófonos y batería en primer plano. Hay telas largas, sombreros de silueta expresiva, naranja y negro con acentos vivos y maquillaje de alto contraste. Tomar legibilidad del conjunto, relación entre instrumentos y personas, y coherencia de vestuario. | Es una propuesta concreta de 2020. La galería mezcla categorías; usar las fotos rotuladas como murga para estudiar murga. No copiar vestuario, rostros o una identidad de agrupación. |
| [Museo: Otra forma de decir — Mi Vieja Mula](https://www.museodelcarnaval.org/las-muestras/otra-forma-de-decir-%C2%B7-mi-vieja-mula/) | El Museo documenta el vestuario de **El payaso Vinagre, 2023**, expuesto en un tablado de barrio. Describe una propuesta en grises, blanco y negro que conecta vestuario y maquillaje con texto e interpretación. Reconoce por separado diseño, maquillaje y confección. | La identidad murguera no depende de saturar todos los trajes. Nuestra interfaz alegre puede convivir con propuestas escénicas de otra paleta. |
| [Museo: Rosario Viñoly, Memoria de lo efímero](https://www.museodelcarnaval.org/las-muestras/rosario-vinoly/) | La retrospectiva reúne vestuarios, bocetos, fotografías y fragmentos de espectáculos de 1983–2018. Permite estudiar maquillaje y vestuario como trabajo de autor y como un sistema visual conjunto. | Es una trayectoria artística particular, no un catálogo normativo. No convertir un diseño histórico en un uniforme obligatorio. |
| [IM: Desfile inaugural 2026, galería y resultados](https://montevideo.gub.uy/noticias/fallos-del-desfile-inaugural-del-carnaval-2026) | Fotografías acreditadas a Juan Manuel Ramos e Ignacio Turell y menciones separadas a batería y dirección de murga. Es una referencia primaria actual para estudiar desfile y diversidad de agrupaciones. | El desfile no equivale a una noche de ensayo o al concurso en el Teatro. La galería incluye otras categorías y requiere identificar cada imagen antes de usarla como referencia de murga. |

Los enlaces son referencias de consulta. **No se incorporaron fotografías de esas páginas a los recursos del juego.** Las imágenes futuras requieren su procedencia y condiciones de uso correspondientes; una página pública no equivale a permiso para redistribuir sus fotos.

## Paleta propuesta para la interfaz

| Color | Valor | Función propuesta |
| --- | --- | --- |
| Índigo profundo | `#21123F` | Texto principal, estructura, sombras y profundidad del escenario. |
| Fucsia | `#DB247B` | Acciones destacadas y pequeños acentos de celebración. |
| Amarillo | `#FFD447` | Selección, hitos y focos de atención. |
| Turquesa | `#1BC8BE` | Preparación, estados favorables y detalles secundarios. |
| Coral | `#FF7759` | Calidez, avisos y categorías complementarias. |
| Blanco cálido | `#FFF8EF` | Superficies de lectura, tarjetas y contraste con índigo. |

Usar grandes áreas tranquilas de blanco cálido e índigo; los colores intensos identifican acciones y etapas. Evitar que cada tarjeta compita con la escena. El color no debe ser el único indicador de contratación, función, voz agotada o bloqueo.

Contrastes calculados con colores sólidos sRGB: índigo sobre blanco cálido **16,29:1**, amarillo **12,07:1**, turquesa **8,22:1** y coral **6,57:1**. Blanco cálido sobre fucsia da **4,38:1**, insuficiente para texto normal al exigir 4,5:1. En un botón fucsia sólido usar blanco puro `#FFFFFF` (**4,62:1**) o revisar el fondo. Índigo sobre fucsia da **3,72:1** y tampoco alcanza ese objetivo para texto normal. Son cálculos de pares de colores, no una auditoría completa de la interfaz; degradados, transparencias, estados y tipografía requieren revisión visual. [W3C: contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

## Escena y funciones

La plantilla de esta versión comprende **13 coreutas, bombo, redoblante, platillos y dirección escénica**. Esta distribución concreta es una elección del juego dentro de sus diecisiete componentes.

- **Coro:** trece puestos en línea o arco suave, mirando al público, con espacio suficiente para distinguir a cada componente. Sus afinidades vocales permanecen visibles en la gestión.
- **Batería:** tres puestos **detrás del coro**, uno por instrumento: bombo, redoblante y platillos. Sus etiquetas y colores provisionales deben seguir legibles desde la cámara. Los instrumentos provisionales tienen volumen y formas distintas; los platillos se representan como pareja.
- **Dirección:** **centrada adelante del coro**, de frente al conjunto y de espaldas al público, con movimiento de conducción. La persona que dirige en escena pertenece al elenco y es distinta del jugador que gestiona y del puestista técnico. No desplazarla a un lateral para llenar el cuadro.
- **Equipo técnico:** letrista, arreglador/a coral, vestuarista, maquillador/a y puestista se gestionan fuera de las diecisiete plazas escénicas. Sus tarjetas muestran oficio, perfil, honorario y aporte al espectáculo.

El elenco usa el cuerpo animado de `public/models/character-system/canonical.glb`, con cuatro rostros, peinados y vestuario compartido. Los maniquíes de `src/stage-placeholders.ts` quedan como respaldo durante la carga o ante un error. El taller permite combinar traje, sombrero, maquillaje y colores por integrante; los honorarios del equipo creativo afectan la preparación y caja de la temporada por separado.

La disposición anterior es una elección explícita del usuario para este juego; no pretende describir una formación universal. La referencia fotográfica de Agarrate Catalina 2020 se conserva como estudio de vestuario y lectura del conjunto, no como plano de ubicación obligatorio.

En el espacio 3D, **Y es altura, X es lateral y +Z apunta al público**. El coro mira hacia +Z; batería se sitúa a Z más negativo que todo el coro y también mira hacia +Z. Dirección se mantiene en X=0, a Z más positivo que el coro, y gira hacia −Z para conducirlo. Todos los GLB se integran inicialmente mirando a +Z, y el puesto del director aplica el giro escénico de 180°. Estos ejes y orientaciones pertenecen al escenario y no cambian al girar la cámara. [Convenciones y recepción de modelos](ASSETS.md).

Anclajes del prototipo: coro en X=−4,14…+4,14 con `Z=−0,15+abs(X)×0,09`; batería en X=−1,5/0/+1,5 y Z=−2,35; director en (0; 0,47; 2,45). La altura del suelo para el elenco es Y=0,47. El movimiento del director permanece cerca de su anclaje central; estas medidas organizan la representación y no describen dimensiones reglamentarias.

La vista inicial es **oblicua**, para mostrar profundidad, separación entre filas y volumen de personajes, instrumentos y arquitectura. La cámara interactiva usa `OrbitControls`: arrastrar con mouse o dedo gira la vista; rueda o pellizco acerca y aleja. Con el escenario enfocado, las flechas giran, `+`/`−` ajustan zoom y `Home` restablece la vista. También hay botones para acercar, alejar y restablecer, y **Ampliar escenario / Volver** permite inspeccionar la escena con mayor espacio. La exploración de cámara es visual: conserva la formación, no consume jornadas y no altera la partida guardada.

La nueva referencia específica del usuario para el **Teatro de Verano** actualiza la indicación anterior de mantener todos los ambientes sin techo. La sede y los tablados conservan espacios abiertos; el Teatro incorpora una **concha escénica o bóveda con frente abierto hacia el público**. Mantener despejada la lectura del elenco y su formación.

## Referencia del Teatro de Verano aportada por el usuario

La [imagen de referencia](assets/references/teatro-de-verano-user.png) se conserva como copia literal del archivo aportado el 29 de septiembre de 2026. Se usa para orientar la construcción del ambiente 3D: bóveda de retícula visible, varas de iluminación suspendidas, luces violeta, magenta y azul, haces blancos y paneles LED. No se usa como una imagen plana de fondo ni se extraen o incorporan los personajes fotografiados.

El Teatro tiene una cubierta curva abierta al frente con espesor de **0,24 unidades del prototipo**, tarima y fondo curvos, y retícula, varas y LED simplificados para la lectura en celular. El volumen de la bóveda debe seguir siendo legible al orbitar la cámara. El objetivo es una interpretación visual de esta referencia; no se dispone de medidas o planos para afirmar exactitud arquitectónica ni escala oficial. La iluminación es una dirección artística tomada de la foto, no una configuración obligatoria de cada actuación real.

Las seis pantallas LED son estructuras 3D con gabinete, marco y base apoyada directamente en la tarima. Se escalonan detrás del elenco desde el piso y mantienen su volumen completo dentro de la bóveda, incluidos los bordes superiores y posteriores. Su superficie luminosa está integrada al gabinete; no cuelgan de las varas de iluminación.

En la selección automática de ambientes, el Teatro corresponde a la **admisión y las tres ruedas**, turnos internos **3, 9, 14 y 19**. Los demás momentos de pretemporada usan el patio abierto y los de carnaval usan el tablado abierto. La vista previa manual permite inspeccionar el Teatro sin consumir tiempo, ejecutar una actuación ni modificar el guardado de la temporada. Cambiar de ambiente conserva batería detrás del coro y dirección centrada adelante, mirando al conjunto.

## Estados de presentación

| Estado | Ambiente | Información prioritaria |
| --- | --- | --- |
| Armar el proyecto | Patio o sede al aire libre, sin paredes ni techo, luz estable y acentos vivos | Cinco oficios, puestos cubiertos, honorarios, caja restante y comienzo de temporada. |
| Noviembre y pretemporada, fuera de la admisión | Patio de ensayo abierto, sin público ni decoración de actuación; luz cálida y conducción moderada | Preparación, funciones del elenco, descanso y agenda; tablados todavía cerrados. |
| Tablados | Escenario al aire libre, sin paredes ni techo; público, mayor contraste, bombitas y luz de actuación | Rendimiento y consecuencias de la decisión; mantener HUD y botones legibles. |
| Admisión y concurso: turnos 3, 9, 14 y 19 | Teatro con bóveda, frente abierto, retícula, varas, LED y luz violeta/magenta/azul con haces blancos | Instancia oficial de la temporada; separar este ambiente de las actuaciones en tablados. |
| Fallos | Celebración proporcional al resultado | Puntajes acumulados, posición y aprendizaje para la siguiente campaña. |

Animaciones y partículas deben acompañar una acción concreta. Evitar movimiento constante sobre texto, parpadeos y costos gráficos sin utilidad; pausar cuando la aplicación esté en segundo plano. Comprobar pantalla angosta, área segura, tamaño táctil y claridad de números.

El gesto de dirección puede comunicar conducción también con su maniquí provisional. Con `prefers-reduced-motion: reduce`, ese gesto y los demás movimientos no esenciales permanecen detenidos, sin cambiar orientación ni posición del puesto.

## Criterios de revisión de recursos entregados

Antes de integrar cada componente del usuario: identificar su rol y plaza, inspeccionar el modelo, acordar orientación y escala, verificar materiales y peso, y comprobar su lectura con los demás. Un cambio de integrante debe conservar la función requerida por su plaza. Documentar cualquier adaptación de textura, pose o geometría; no alterar su aspecto sin un objetivo aprobado.

La aceptación visual exige distinguir coro, batería y dirección a escala de celular, y que la interfaz conserve una jerarquía clara. La aceptación cultural exige que las referencias y el espectáculo elegido tengan coherencia entre textos, música, vestuario, maquillaje y puesta. Ningún color por sí solo certifica esa coherencia.
