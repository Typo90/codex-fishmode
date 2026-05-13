# Codex Fishmode

[English](../README.md) | [简体中文](README.zh-CN.md) | 日本語 | [Español](README.es.md)

Codex Fishmode は Codex 用のプラグインプロトタイプです。Codex が作業を始めると小さなブラウザーウィンドウを開き、権限確認やターン終了時には Codex に戻します。

最初のバージョンは組み込み WebView ではなく、ユーザーの既存ブラウザーを使います。インストールが軽く、ログイン状態もそのまま使えます。

## クイックスタート

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

## コマンド

```sh
fishmode on
fishmode off
fishmode status
fishmode config
fishmode test
```

`fishmode config` では、デフォルトで開くページを選択したり、新しいページを追加したりできます。

## 仕組み

- `UserPromptSubmit` -> `fishmode event start`
- `PermissionRequest` -> `fishmode event permission`
- `Stop` -> `fishmode event stop`

Fishmode は Chrome、Edge、Brave、Chromium の `--app=<url>` モードを優先します。見つからない場合は既定のブラウザーにフォールバックします。

## 設定

設定ファイル:

```text
~/.codex-fishmode/config.json
```

主な項目:

- `enabled`: 有効/無効
- `activeSite`: デフォルトで開くページ
- `sites`: ページ一覧
- `codexAppName`: フォーカスを戻す Codex アプリ名

## アンインストール

```sh
fishmode uninstall
```

## コントリビューション

Issue と pull request を歓迎します。詳しくは [CONTRIBUTING.md](../CONTRIBUTING.md) を参照してください。

## ライセンス

MIT
