# QA v11: partidas y respaldos

Fecha: **15 de octubre de 2026**. Entorno: Windows, Chrome y servidor Vite local. Esta entrega incorpora respaldos y protección del guardado; la simulación sigue en v9. No se generaron APK/AAB/IPA ni se probaron dispositivos físicos.

## Funcionamiento implementado

En **Ajustes → Partidas y respaldos** se puede exportar la campaña y las apariencias, elegir un archivo, revisar su identidad/temporada/jornada/caja y confirmar su restauración. Seleccionar o cancelar un archivo no reemplaza la partida. La confirmación conserva la campaña actual como copia previa local, consultable y restaurable por el mismo flujo. No es un archivo histórico ilimitado: cada restauración reemplaza esa única copia previa.

El archivo JSON usa formato `director-de-murga-backup`, versión 1, fecha UTC y dos secciones: campaña y cosméticos. El límite de importación es 5 MiB medidos en bytes UTF-8. Se rechazan metadatos incompletos, versiones futuras, campañas inválidas, claves de prototipo y apariencias dañadas. Las campañas antiguas compatibles se convierten mediante el validador existente. No se importan ajustes gráficos ni datos de servicios externos.

La restauración espera las colas normales de guardado, registra los originales persistentes, escribe y comprueba campaña, apariencias y copia previa, y marca el resultado confirmado antes de limpiar el registro temporal. Si se interrumpe en la fase preparada, el siguiente arranque deshace los cambios parciales. Si ya se confirmó, sólo limpia el registro, sin sobrescribir progreso posterior. Un fallo que impide recuperar detiene las mutaciones y ofrece reintento. La memoria visible cambia únicamente después de una restauración confirmada.

Además, la carga inicial distingue una clave ausente de un error al leerla: un fallo de lectura de campaña o apariencia ya no habilita una partida nueva que pueda sobrescribir datos existentes.

## Pruebas y compilación

`npm test`: **109 aprobadas, 0 fallos**. Se conservan las 85 pruebas anteriores y se añaden 24:

- 5 de formato: ida/vuelta de datos y apariencias, metadatos/versiones/prototipos, cosméticos inválidos, límite UTF-8 y migraciones v3–v8.
- 10 de almacenamiento: restauración, fallo por etapa, escrituras perdidas, respuesta fallida tras persistir, rollback y reinicio, claves ausentes, limpieza pendiente, commit ambiguo, concurrencia y almacenamiento ilegible.
- 9 de carga inicial: errores de lectura sin escrituras, prioridad de la partida actual, ausencia real, errores al consultar legacy, preservación del original, migración, copias de recuperación y fallos de persistencia.

`npm run mobile:sync`: **correcto**, incluyendo TypeScript y Vite. Plugins sincronizados: Filesystem 8.1.5, Share 8.0.3 y Preferences 8.0.1. JavaScript principal: 921,51 kB, 259,11 kB gzip; permanece el aviso de Vite por un fragmento superior a 500 kB.

También se realizaron siete comprobaciones aisladas del adaptador de exportación con DOM/plugins simulados. Cubrieron descarga UTF-8, compartir, caché/limpieza, cancelación, fallos, indisponibilidad y exclusión de solicitudes concurrentes. Esas comprobaciones exploratorias no forman parte de las 109 pruebas versionadas ni sustituyen ejecución nativa.

## Recorrido de interfaz y sus límites

En `localhost:5174`, la partida original La Vereda conservó temporada 3, jornada 29/32, caja UYU 1.936.200, energía 87 y reputación 32. Se abrió el panel y se solicitó una exportación. La interfaz informó descarga iniciada y no se registraron errores de consola; el evento de descarga de la herramienta agotó su espera y no se confirmó un archivo recibido. Esto acredita la solicitud desde la interfaz, no un respaldo descargado de extremo a extremo.

Para probar sin reemplazar la partida original se abrió una instancia aislada por origen en `127.0.0.1:5174`. Se prepararon respaldos ficticios válido, inválido y de versión futura. El selector de archivos abrió, pero la extensión de Chrome rechazó la carga porque su acceso a archivos locales no está habilitado. No se modificaron permisos ni se ejecutó la importación por otra vía. Por tanto **no se dio por aprobado el recorrido de seleccionar → previsualizar → restaurar → deshacer en navegador**; su lógica de datos sí fue probada automáticamente.

Se revisaron escritorio y viewport de **390 × 844 CSS px**. En móvil: ancho de documento 390, diálogo 372, botones de 46 px e input de 48 px; sin desborde horizontal. La captura muestra el panel móvil, la tarjeta de partida y el acceso de exportación. Se comprobó volver a Ajustes y cerrar el diálogo; las preferencias gráficas permanecieron y el escenario retomó su estado correspondiente. El viewport se restableció al terminar. La consulta final de errores/advertencias de la pestaña original fue vacía.

![Panel de respaldos a 390 píxeles de ancho](qa-respaldos-v11-mobile.jpg)

## Archivos y plataformas

La web utiliza Blob y una descarga del navegador. Android/iOS preparan un JSON UTF-8 en caché privada y abren la hoja nativa para compartir; terminar esa hoja no certifica que el receptor haya guardado el archivo. Los temporales actuales se conservan al finalizar/cancelar y la limpieza posterior sólo considera archivos propios antiguos, reteniendo los tres más recientes.

Android limita FileProvider al subdirectorio de caché de respaldos; no se añadió acceso general al almacenamiento. iOS declara FileTimestamp/C617.1 además del motivo de Preferences existente. Referencias oficiales consultadas: [Filesystem](https://capacitorjs.com/docs/apis/filesystem) y [Share](https://capacitorjs.com/docs/apis/share).

Pendiente antes de considerar cerrada la validación: confirmar el archivo descargado, completar importación/confirmación/cancelación/copia previa desde la interfaz y repetir el traslado entre dos instalaciones. En dispositivos, comprobar selector, hoja de compartir, cancelación, cierre del proceso durante restauración, poco espacio y continuidad de la partida. La configuración nativa y la sincronización no acreditan esos casos. Audio, tutorial y pruebas de balance siguen en [BETA-PENDIENTES.md](BETA-PENDIENTES.md).
