<h1 align="center">
  <img src="docs/images/readme-logo-black-rounded.svg" width="64" alt="Logotipo de DSH Desktop" valign="middle" />
  DSH Desktop
</h1>

<p align="center">
  <strong>DSH Desktop</strong> es un cliente de escritorio comunitario de DeepSeek Harness para Windows, desarrollado y mantenido de forma independiente por NullPointer.<br />
  Repositorio de código abierto: <a href="https://github.com/LightyearXizIl/DSH-Desktop">LightyearXizIl/DSH-Desktop</a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ru.md">Русский</a> · <a href="README.es.md">Español</a> · <a href="README.pt.md">Português</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-171513.svg" /></a>
  <img alt="Windows" src="https://img.shields.io/badge/Windows-x64-171513.svg" />
</p>

<p align="center"><strong>Usa los modelos oficiales de DeepSeek o proveedores externos populares, gestiona Agent Presets portátiles, continúa sesiones de Harness desde el teléfono y convierte tus materiales en presentaciones PPTX editables.</strong></p>

DSH Desktop empaqueta DeepSeek Harness local como una aplicación de escritorio instalable. Inicia Harness automáticamente, guarda perfiles, complementos, espacios de trabajo, configuración de modelos y sesiones fuera del directorio de instalación, y abre la interfaz completa de Harness en cuanto el runtime local está listo.

> [!IMPORTANT]
> DSH Desktop es una versión preliminar basada en `@deepseek-ai/dsh@0.2.1-rc.4`, que evoluciona rápidamente. El instalador para Windows x64 es una compilación comunitaria sin firmar, por lo que Windows SmartScreen puede mostrar una advertencia la primera vez. Este proyecto no es un producto oficial de DeepSeek.

## Descarga

Descarga el `dsh-desktop-windows-x64-setup.exe` más reciente desde [GitHub Releases](https://github.com/LightyearXizIl/DSH-Desktop/releases). Las versiones marcadas como **Pre-release** son para quienes quieren probar novedades y pueden no ser compatibles con algunos complementos comunitarios.

La aplicación instalada busca actualizaciones en GitHub Releases poco después de iniciarse y cada seis horas. Cuando hay una versión nueva, DSH Desktop pregunta primero y muestra el registro de cambios de esa versión; la descarga solo empieza si aceptas, y la instalación solo comienza cuando eliges **Reiniciar e instalar**. También puedes buscar actualizaciones manualmente en **Ajustes → Acerca de**, u omitir una versión sin ocultar las siguientes.

## Qué añade DSH Desktop

DeepSeek Harness ya ofrece un runtime de agentes y una interfaz web. DSH Desktop añade las capacidades de una aplicación de escritorio:

- Inicia y detiene Harness automáticamente, sin abrir una CLI ni una pestaña del navegador
- Añade y gestiona espacios de trabajo de proyectos con el selector de carpetas nativo
- Admite los modelos oficiales de DeepSeek y los principales proveedores de modelos externos
- Importa y exporta Agent Presets personalizados como [archivos `.dshpreset`](docs/preset-packages.md) portátiles, comprobando conflictos de nombre y advirtiendo sobre la confianza antes de instalar
- Genera presentaciones PPTX editables a partir de tus materiales con el modo PPT integrado
- Incluye Python y bibliotecas de Office para crear y comprobar DOCX, PPTX y XLSX sin conexión
- Conserva perfiles, complementos, espacios de trabajo, sesiones y configuración de modelos al actualizar la aplicación
- Detecta fallos de inicio de Harness o de complementos del frontend, escribe el diagnóstico en `harness.log` y ofrece una recuperación guiada
- Ofrece un modo seguro que desactiva temporalmente los complementos de terceros sin dañar los datos del usuario
- Permite que un teléfono emparejado continúe las sesiones por la red local o mediante un túnel público temporal opcional
- Incluye el tema Liquid Glass (modos Mica y de compatibilidad), una animación de inicio y el inicio automático opcional de un modelo local
- Busca actualizaciones del escritorio dentro de la aplicación y deja que decidas si descargarlas e instalarlas

## Creación de PPT

Pulsa **PPT**, elige una plantilla y describe lo que quieres. El catálogo integrado incluye **16 plantillas y 192 diseños** y genera archivos PPTX editables. Las vistas previas de las plantillas se muestran en inglés; el contenido puede generarse en chino o en inglés con la configuración de fuentes correspondiente, y el idioma de la vista previa no determina el del resultado.

La función PPT viene preinstalada y sus instrucciones automáticas solo se aplican en las sesiones donde está seleccionado el botón PPT. Las plantillas, las validaciones y las fuentes de referencia se describen en las [notas de PPT](packages/ppt-runtime/README.md).

## Acceso desde el teléfono

Elige **Conectar teléfono…** en el menú `Harness` y escanea el código QR de emparejamiento.

- En Wi-Fi, basta con escanear para conectarse.
- En un túnel de Internet también hay que introducir la contraseña de 6 dígitos que aparece en el ordenador. Por defecto es una contraseña temporal de 5 minutos que solo se guarda en memoria; solo se genera una contraseña permanente en este ordenador si das tu consentimiento en la ventana **Conectar teléfono**.

Harness siempre se ejecuta en un puerto aleatorio de `127.0.0.1`; el acceso desde el teléfono pasa por un puente de emparejamiento independiente. Cloudflare Quick Tunnel es la ruta habitual para conexiones largas. El Pinggy gratuito es la alternativa cuando Cloudflare no está disponible (por ejemplo, en China continental) y caduca a los 60 minutos aproximadamente. Cuando el escritorio se desconecta, la sesión del teléfono termina.

Si Cloudflare no arranca, se prueba Pinggy. Si aparece el enlace de Cloudflare pero el teléfono no puede abrirlo, pulsa **¿No se abre? Probar otra línea** para cambiar a Pinggy.

## Modo seguro y recuperación

Si un complemento de terceros impide el inicio o el renderizado, DSH Desktop combina la información del runtime y del frontend para identificar el complemento y abre una página de recuperación guiada.

Elige **Reiniciar en modo seguro…** en el menú `Harness` para iniciar un perfil aislado que solo contiene los Bundles oficiales del núcleo. Los complementos de terceros del perfil normal quedan bloqueados, pero los agentes, las sesiones, la configuración de modelos y los espacios de trabajo siguen disponibles. Desde el aviso del modo seguro puedes desinstalar el complemento seleccionado o volver al inicio normal. La página de recuperación también busca actualizaciones compatibles de los complementos, y el modo seguro permite actualizarlos en lote.

Si la interfaz normal no se abre, también puedes iniciar con `--safe-mode`, por ejemplo en PowerShell:

```powershell
& "$env:LOCALAPPDATA\Programs\DSH Desktop\DSH Desktop.exe" --safe-mode
```

(Sustituye la ruta si instalaste la aplicación en otra carpeta.)

## Datos locales y seguridad

- La interfaz web de Harness solo se ejecuta en un puerto de loopback aleatorio.
- El renderer no tiene acceso a Node.js y se ejecuta con Context Isolation y Sandbox.
- Se bloquean los WebView, la navegación interna no confiable y las solicitudes de permisos inesperadas.
- Los enlaces web externos se abren en el navegador del sistema.
- Los perfiles y las sesiones se guardan en el directorio de datos de aplicación por usuario de Electron, no en el directorio de instalación.
- El acceso desde el teléfono requiere un token de emparejamiento de corta duración. En Wi-Fi basta con escanear; en un túnel de Internet también se necesita la contraseña que muestra el ordenador.

## Plataformas compatibles

| Plataforma | Formato | Estado |
| --- | --- | --- |
| Windows x64 | Instalador NSIS sin firmar | Compatible |
| macOS | Los scripts de compilación se conservan en el código; no se publican instaladores | No publicado |
| Windows ARM64 / Linux | — | Sin soporte por ahora |

Harness incluye dependencias nativas de cada plataforma, por lo que cada instalador debe compilarse en su sistema operativo y arquitectura de destino.

## Desarrollo y arquitectura

La documentación del proyecto empieza en el [índice de documentación](docs/README.md). Las más usadas:

- [Guía de desarrollo](docs/development.md) — entorno local, validación, mantenimiento de parches y empaquetado nativo
- [Arquitectura](docs/architecture.md) — inicio, datos persistentes, límites de seguridad, recuperación, acceso desde el teléfono y actualizaciones
- [Procedimiento de publicación](docs/release-runbook.md) — números de versión, empaquetado y publicación en GitHub Release
- [Paquetes de Preset](docs/preset-packages.md) — el contrato de los Agent Presets portátiles

Antes de enviar un cambio, ejecuta `npm test`, `npm run typecheck` y `npm run build`, y prueba el flujo afectado en la aplicación. Nunca incluyas claves de API reales en issues, registros, capturas de pantalla ni datos de prueba.

## Proyectos relacionados

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — el framework de agentes oficial de DeepSeek, del que provienen el runtime y la interfaz web de esta aplicación.
- [dsh-market](https://github.com/dsh-market/dsh-market) — el mercado comunitario de complementos de DeepSeek Harness para explorar, instalar y actualizar complementos dentro de Harness.

## Licencia

DSH Desktop es de código abierto bajo la [licencia MIT](LICENSE).

DeepSeek Harness y sus dependencias siguen sujetos a sus propias licencias y normas de marca. DSH Desktop es una aplicación de escritorio comunitaria independiente y no está afiliada a DeepSeek.
