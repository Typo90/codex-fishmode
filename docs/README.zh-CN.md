# Codex Fishmode

[English](../README.md) | 简体中文 | [日本語](README.ja.md) | [Español](README.es.md)

Codex Fishmode 是一个 Codex 插件原型：当 Codex 开始工作时，它会打开一个小型浏览器窗口；当 Codex 需要权限或一轮任务结束时，它会把注意力切回 Codex。

首版使用用户已有的系统浏览器，而不是内置 WebView。这样安装更轻、登录态可复用，也不用发布跨平台二进制包。

## 快速开始

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

## 常用命令

```sh
fishmode on
fishmode off
fishmode status
fishmode config
fishmode test
```

`fishmode config` 用来选择默认打开页面，也可以添加新页面并设为默认。

## 工作原理

- `UserPromptSubmit` 触发 `fishmode event start`
- `PermissionRequest` 触发 `fishmode event permission`
- `Stop` 触发 `fishmode event stop`

Fishmode 会优先使用 Chrome、Edge、Brave 或 Chromium 的 `--app=<url>` 小窗模式。如果找不到支持的小窗浏览器，就回退到系统默认浏览器。

在 macOS 上，Fishmode 会先查找已有的同站点浏览器窗口；如果找到了，就恢复这个窗口，不会每次新开一个。没有找到时才会打开新窗口。

## 配置

配置文件位于：

```text
~/.codex-fishmode/config.json
```

关键字段：

- `enabled`: 是否启用
- `activeSite`: 默认打开页面
- `sites`: 可选页面列表
- `codexAppName`: 需要切回的 Codex 应用名

## 卸载

```sh
fishmode uninstall
```

或者：

```sh
node scripts/install.mjs --uninstall
```

## 贡献

欢迎提交 issue 和 pull request。请先阅读 [CONTRIBUTING.md](../CONTRIBUTING.md)。

## 许可

MIT
