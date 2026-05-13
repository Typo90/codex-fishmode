# Codex Fishmode

[English](../README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | Español

Codex Fishmode es un prototipo de plugin para Codex. Cuando Codex empieza a trabajar, abre una pequeña ventana del navegador; cuando Codex necesita permisos o termina un turno, devuelve la atención a Codex.

La primera versión usa el navegador instalado del usuario en vez de un WebView empaquetado. Esto mantiene la instalación ligera y conserva las sesiones iniciadas del navegador.

## Inicio rápido

```sh
./install.sh
export PATH="$HOME/.codex-fishmode/bin:$PATH"
fishmode config
fishmode test
```

Windows PowerShell:

```powershell
.\install.ps1
fishmode config
fishmode test
```

## Comandos

```sh
fishmode on
fishmode off
fishmode status
fishmode config
fishmode test
```

`fishmode config` permite elegir la página predeterminada o añadir una nueva página.

## Cómo funciona

- `UserPromptSubmit` ejecuta `fishmode event start`
- `PermissionRequest` ejecuta `fishmode event permission`
- `Stop` ejecuta `fishmode event stop`

Fishmode prefiere el modo de ventana de aplicación de Chrome, Edge, Brave o Chromium con `--app=<url>`. Si no encuentra un navegador compatible, usa el navegador predeterminado del sistema.

En macOS, Fishmode primero busca una ventana existente del mismo sitio. Si la encuentra, restaura esa ventana en vez de abrir otra. Si no existe, abre una nueva ventana.

## Configuración

Archivo de configuración:

```text
~/.codex-fishmode/config.json
```

Campos principales:

- `enabled`: activa o desactiva Fishmode
- `activeSite`: página que se abre por defecto
- `sites`: lista de páginas
- `codexAppName`: nombre de la app Codex a enfocar

## Desinstalar

```sh
fishmode uninstall
```

## Contribuir

Los issues y pull requests son bienvenidos. Lee [CONTRIBUTING.md](../CONTRIBUTING.md) antes de contribuir.

## Licencia

MIT
