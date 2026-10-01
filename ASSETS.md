# Modelos de los integrantes

## Sistema activo: cuerpo común animado

Los **17 integrantes** usan `public/models/character-system/canonical.glb` y el catálogo `public/models/character-system/catalog.json`. La colección conserva el estilo de volados aceptado por el usuario y lo amplía a ocho cortes, con geometría propia reproducible. No reutiliza el ajuste rechazado de las prendas de Meshy.

- Un cuerpo de 1,70 m desde los pies hasta el cráneo, 20 huesos, pesos reales y siete clips de animación.
- Cuatro caras, dos peinados con versiones bajo sombrero, ocho cortes de traje, un sombrero, maquillaje RGBA sobre UV comunes y doce paletas combinables con cada traje.
- Altura de 0,90 a 1,10 aplicada uniformemente al conjunto; cuatro tonos de piel y cuatro de pelo.
- Un esqueleto independiente por integrante; las piezas de cada uno comparten ese esqueleto. Geometrías y texturas se comparten entre instancias; colores y mezcladores permanecen individuales.
- Camiseta y shorts de ensayo en el cuerpo base. Ninguna parte del cuerpo se oculta para corregir el encaje del traje.

`npm run assets:character` reconstruye el GLB, la textura facial y las auditorías desde `scripts/build-canonical-character.mjs`, sin llamadas a servicios externos. `assets/character-system/canonical-audit.json` registra vértices, triángulos, dimensiones, pesos y muestreos de deformación. Las pruebas geométricas de mangas y pantalones se complementan con revisión visual de axilas, cadera, rodillas y accesorios.

La dirección visual combina el volumen de la fotografía del usuario con pantalones de dos piernas y zapatos visibles: grandes volados plegados en cuello, hombros, pecho y puños; mangas abullonadas; paños de cintura y un tocado alto de tela. La colección incluye cortes a la cadera, boleros, capas y prendas largas abiertas. El pantalón tiene su propio canal de color `Trouser` y sigue los huesos de muslos, rodillas y pies del cuerpo común. `SatinRed` y `SatinBurgundy` separan los acentos rojos y el reverso bordó de la tela, sin alterar los colores de labios o piel.

Los ocho cortes se seleccionan en el taller y funcionan con las doce paletas: **96 combinaciones de traje y color**, además de las opciones de sombrero, maquillaje e identidad individual. Solo se muestra la geometría del traje seleccionado. Las prendas comparten materiales, rig y topología de cuerpo; los cortes tienen geometría propia.

| Corte | Silueta |
|---|---|
| Volados de barrio | Casaca corta con grandes volados de satén. |
| Fiesta de colores | Distribución asimétrica de capas y mangas. |
| Retazos del barrio | Casaca con paneles y rombos textiles. |
| Bolero carnavalero | Chaqueta recortada, mangas amplias y faja. |
| Levita de tablado | Prenda larga abierta al frente. |
| Frac de despedida | Frente corto y cola posterior dividida. |
| Capa de carnaval | Capa sobre chaqueta y pantalón. |
| Gala de febrero | Pechera y paños ornamentados largos a los lados. |

El catálogo registra `stageWidth`, medido durante canto y espera, para separar al coro según el corte y la altura de cada integrante. `frontClearance` reserva lugar para los volados al colocar bombo y redoblante; los instrumentos se ajustan cuando cambia el traje.

El taller edita a cada integrante por su ID estable. `src/cosmetics-state.ts` mantiene un guardado independiente de la temporada; copiar el vestuario al conjunto conserva la identidad y altura de cada persona. `src/character-system.ts` valida el modelo antes de cargarlo y clona correctamente huesos y materiales. `src/stage-instruments.ts` fija los instrumentos a sus anclajes.

Para nuevas prendas: importar el cuerpo canónico sin modificar la pose de enlace, construir el volumen exterior con holgura, compartir el orden de huesos y matrices de enlace, probar las siete animaciones y todas las alturas, y agregar la pieza al catálogo. Un modelo completo generado por separado no se considera compatible automáticamente.

## Referencias históricas y modelos estáticos

Los apartados siguientes documentan la importación anterior. `public/models/manifest.json` conserva esa procedencia; la escena activa utiliza el catálogo común descrito arriba.

## Primer modelo recibido: Mila the Mighty

El usuario entregó [este modelo de Meshy](https://www.meshy.ai/s/trDP9T), tarea `01a0efe7-cac3-77b3-9476-1044722b5f36`, de su cuenta `braiangreno`. Se conserva el GLB original de 4.567.304 bytes en `meshy_output/mila-the-mighty_01a0efe7/original.glb`, con procedencia en `source.json`.

La copia para el juego está en `public/models/components/mila-the-mighty.glb`: 303.268 bytes, 2.173 triángulos, un material y tres texturas WebP de 1024 px. Se preparó localmente, sin nuevas generaciones de Meshy. El archivo no trae esqueleto ni animaciones; conserva la pose exportada. En la integración anterior se asignó únicamente a `m-starter-0`, con altura 1,70 m. Ahora se conserva como referencia y archivo legado; no se mezcla su anatomía con el nuevo cuerpo común.

## Incorporación

En el flujo histórico, las copias iban en `public/models/components/`. El archivo `public/models/manifest.json` asigna cada GLB al **ID estable del componente**, no a su posición visual. Los integrantes iniciales usan `m-starter-0` a `m-starter-16`; los contratados tienen su propio `id` en la partida.

| IDs iniciales | `role` | Marcador |
|---|---|---|
| `m-starter-0` a `m-starter-12` | `chorister` | C1–C13, turquesa |
| `m-starter-13` | `bombo` | BOM, coral |
| `m-starter-14` | `redoblante` | RED, violeta |
| `m-starter-15` | `platillos` | PLA, amarillo |
| `m-starter-16` | `director` | DIR, fucsia |

La propiedad `cord` se usa solo para coreutas; batería y dirección tienen `cord: null`. Los cinco profesionales del equipo creativo se gestionan por separado y no agregan posiciones a este elenco.

## Formación, ejes y orientación

La escena usa **Y hacia arriba**, **X lateral** y **+Z hacia el público**. Es la convención de integración del juego. Los GLB se entregan mirando a +Z; el renderizador aplica la orientación correspondiente a cada puesto. Girar la cámara no cambia estos ejes ni la formación.

| Grupo | Ubicación en la escena | Frente |
|---|---|---|
| Coro | Trece posiciones en línea o arco suave, repartidas a ambos lados de X=0. | Hacia el público, +Z. |
| Batería | Bombo, redoblante y platillos **detrás del coro**: su Z es menor que la de todos los coreutas. | Hacia +Z. |
| Dirección | **En el centro adelante**: X=0 y Z mayor que la de todos los coreutas. | Hacia el coro, −Z; el puesto aplica un giro de 180° respecto del GLB base. |

La formación actual usa un suelo común en **Y=0,47**. El coro reparte X entre **−4,14 y +4,14**, con `Z = −0,15 + abs(X) × 0,09`; batería ocupa X **−1,5 / 0 / +1,5** y **Z=−2,35**; el anclaje de dirección es **(0; 0,47; 2,45)**. El director puede oscilar suavemente alrededor de ese anclaje al conducir, sin cambiar de puesto. Son coordenadas del prototipo y no mediciones de un escenario real.

Ese reparto lateral corresponde a los maniquíes iniciales. El coro con vestuario usa la envolvente de canto y espera registrada en `stageWidth`, multiplicada por la altura individual, más 0,13 m de separación. No se estrecha ni deforma el cuerpo para acomodar el conjunto. Batería y director mantienen sus anclajes.

`rotationYDegrees` corrige la orientación de exportación del archivo; no duplica el giro escénico del director. El movimiento de dirección comunica la conducción del coro y se detiene con la preferencia de movimiento reducido. Con los maniquíes provisionales, esa animación es una indicación de rol, no una animación corporal definitiva.

La cámara parte de una vista oblicua y permite explorar el volumen mediante `OrbitControls`: arrastre con mouse o dedo para girar, rueda o pellizco para zoom; con el escenario enfocado, flechas, `+`/`−` y `Home`. Hay controles visibles de zoom y restablecimiento, y **Ampliar escenario / Volver** para inspeccionar con más espacio. Estos controles no consumen jornadas ni modifican el guardado. Los recursos deben funcionar desde los distintos ángulos de cámara, además de la vista inicial.

La sede de ensayo y los tablados son **espacios abiertos, sin paredes ni techo**. La nueva referencia del usuario introduce una excepción específica para el **Teatro de Verano: concha escénica o bóveda con frente abierto**. Los futuros recursos de ambiente deben mantener despejada la formación, con batería detrás y dirección centrada adelante. Estas decisiones del juego no describen todos los escenarios reales.

Ejemplo de una entrada cuando se reciba su modelo:

```json
"m-starter-0": {
  "name": "Nombre del integrante",
  "role": "chorister",
  "cord": "Bajos",
  "url": "/models/components/nombre-integrante.glb",
  "status": "ready",
  "height": 1.7,
  "rotationYDegrees": 0
}
```

`height` es la altura visible en metros; el visor centra el modelo y apoya los pies en el suelo. `rotationYDegrees` permite corregir la orientación. Una entrada sin archivo conserva `url: null` y `status: "awaiting-user"`. No se reutiliza automáticamente un modelo para cubrir otros integrantes.

Al integrar se comprueban texturas, escala, orientación, recuento de triángulos y carga individual. Después se reconstruye el paquete web y se sincroniza con Android/iOS.

## Referencia del Teatro de Verano

`assets/references/teatro-de-verano-user.png` conserva sin edición la imagen aportada por el usuario el 29 de septiembre de 2026. Es una referencia de diseño fuera de `public`, no una textura de fondo ni un recurso para extraer personajes. Orienta la geometría de la bóveda y su retícula, las varas de iluminación, paneles LED y una combinación de violeta, magenta, azul y haces blancos. La bóveda de `src/theatre.ts` tiene espesor de **0,24 unidades del prototipo**, con tarima y fondo curvos; las pantallas LED tienen gabinete, marco y base apoyada en el suelo. Son volúmenes para observar con la cámara interactiva. No acreditan dimensiones ni exactitud arquitectónica.

El ambiente corresponde automáticamente a admisión y ruedas en los turnos **3, 9, 14 y 19**. La vista previa manual solo cambia la presentación: no consume jornadas ni altera el guardado. Patio y tablados permanecen abiertos. Véase [DIRECCION-ARTISTICA.md](DIRECCION-ARTISTICA.md) para la aplicación visual de la referencia.

## Sistema de vestuario compartido — cuerpo único

**Decisión confirmada:** un único cuerpo; identidad mediante caras, pelo, altura y colores. El contrato implementado está en `assets/character-system/contract.json`, junto al manifiesto de la base y la auditoría de construcción.

| Pieza | Regla para pertenecer al sistema |
|---|---|
| Cuerpo | Una malla base con topología articular, pose de reposo y esqueleto aprobados. La altura de referencia se mide del suelo al cráneo, sin peinado ni sombrero. |
| Cara | Variaciones de una misma base facial; cuello, límite exterior de apoyo del sombrero y UV comunes. Las formas de expresión deben conservar correspondencia. |
| Pelo | Recurso independiente unido a la cabeza. Cada estilo incluye una variante preparada bajo sombrero. |
| Traje | Malla propia ajustada al maniquí común, con pesos del mismo esqueleto y la misma pose de reposo. Puede tener distinta topología del cuerpo. |
| Sombrero | Accesorio rígido con abertura y pivote comunes, colocado en el anclaje de cabeza. |
| Maquillaje | Capa sobre las UV faciales comunes; no modifica cuerpo, pelo ni prendas. |
| Colores | Canales separados para tela de la casaca, pantalón, volados, bordes y piel. No requieren regenerar geometría. |

La altura se aplica a la raíz del **personaje completo**; un sombrero alto no debe cambiar la escala del cuerpo. Compartir nombres de huesos no basta: jerarquía, transformaciones de reposo, matrices de enlace e índices/pesos deben corresponder al mismo rig. Cada integrante obtiene su propia instancia animada; geometría y texturas pueden compartirse, y solo se clonan los materiales que necesiten colores distintos. [SkinnedMesh](https://threejs.org/docs/pages/SkinnedMesh.html) y [SkeletonUtils](https://threejs.org/docs/pages/module-SkeletonUtils.html) documentan estas operaciones de Three.js.

### Producción de una prenda

1. Aprobar un archivo maestro de cuerpo, cara y rig en Blender. Congelar sus versiones y los puntos de apoyo. Mila conserva valor como referencia, pero su GLB actual no trae rig y su pelo/ropa base están integrados en la malla.
2. Crear la prenda sobre ese cuerpo en la pose común. Una referencia de Meshy orienta silueta, color y detalles; una generación aislada no acredita encaje. Ajustar mangas, axilas, hombros, cintura y caída en el editor.
3. Transferir pesos como punto de partida y corregirlos, especialmente en axilas, codos y faldones. Usar el mismo esqueleto; añadir correctivos cuando las poses lo exijan. Blender permite transferir grupos de vértices, pero el resultado requiere revisión: [Data Transfer](https://docs.blender.org/manual/en/4.3/modeling/modifiers/modify/data_transfer.html).
4. Probar movimientos y todas las cabezas/peinados aprobados. Las máscaras de cobertura se autorizan solo sobre zonas permanentemente tapadas tras validar el encaje; no disimulan prendas mal construidas.
5. Exportar GLB con skinning, optimizar y validar. El catálogo admite solo recursos aprobados para la misma versión del cuerpo y del rig. [Exportación glTF de Blender](https://docs.blender.org/manual/en/4.1/addons/import_export/scene_gltf2.html).

Primer ensayo de aceptación: **un traje compartido entre dos identidades**, con dos peinados y distintas escalas uniformes, conservando las animaciones de canto, dirección y percusión. Repetir desde frente, perfil y espalda. Es la prueba previa a producir más diseños.

### Bocetos generados a partir de la foto del usuario

La referencia original está en `assets/references/murga-vestuario-dsc08137-800.jpg`. El usuario autorizó un máximo de 70 créditos; las tareas consumieron **40** en total. Los originales y vistas previas se guardan en `meshy_output/20260929_224556_murga-modular-esmeralda_01a0effd/`.

| Recurso | Tarea Meshy | Créditos consumidos | Estado |
|---|---|---:|---|
| Traje | image-to-3d `01a0effd-33e1-7250-b02b-4dd40ef9f98a` | 15 | Boceto; encaje rechazado por el usuario. |
| Sombrero | image-to-3d `01a0effd-d617-76d2-8838-91804dcc9084` | 15 | Boceto; pendiente del anclaje y cráneo comunes. |
| Maquillaje | retexture `01a0effe-4885-736e-b0a0-929bfd992f91` | 10 | Preparado para las UV de Mila; aún no es una textura universal. |

Las copias separadas están en `public/models/wardrobe/`. `mila-modular.glb` preserva las 2.173 caras y atributos originales, repartidos en cuatro grupos para la prueba. El traje tiene 3.321 triángulos y el sombrero 1.445; ambas copias usan texturas WebP 1024. La corrección de maquillaje y sus verificaciones están en `meshy_output/modular-murga/face-audit/`; los ajustes preliminares de accesorios, en `wardrobe-fit.json` dentro del proyecto de Meshy.

Los archivos antiguos permanecen conservados como bocetos. Su catálogo histórico marca `productionEligible: false`; el taller activo usa la nueva base compartida y las prendas construidas sobre ella. La partida y las identidades del elenco se conservan.

## Archivo histórico

El modelo Meshy rechazado queda archivado en `assets/archive/murguista-meshy-rejected.glb`, fuera de `public` y del paquete de la app. Sus originales y metadata permanecen en `meshy_output/20260929_195426_murguista-uruguayo-turquesa-co_01a0ef60/`.
