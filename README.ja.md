<h1 align="center">
  <img src="docs/images/readme-logo-black-rounded.svg" width="64" alt="DSH Desktop ロゴ" valign="middle" />
  DSH Desktop
</h1>

<p align="center">
  <strong>DSH Desktop</strong> は、NullPointer が個人で開発・保守している Windows 向けの DeepSeek Harness コミュニティ製デスクトップクライアントです。<br />
  オープンソースリポジトリ：<a href="https://github.com/LightyearXizIl/DSH-Desktop">LightyearXizIl/DSH-Desktop</a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ru.md">Русский</a> · <a href="README.es.md">Español</a> · <a href="README.pt.md">Português</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-171513.svg" /></a>
  <img alt="Windows" src="https://img.shields.io/badge/Windows-x64-171513.svg" />
</p>

<p align="center"><strong>DeepSeek 公式モデルや主要なサードパーティモデルを使い、持ち運べる Agent Preset を管理し、スマートフォンから Harness セッションを続け、資料から編集可能な PPTX を作成できます。</strong></p>

DSH Desktop は、ローカルの DeepSeek Harness をインストール可能なデスクトップアプリとしてパッケージ化します。Harness を自動で起動し、Profile、プラグイン、ワークスペース、モデル設定、セッションをアプリのインストール先とは別の場所に保存し、ローカル Runtime の準備ができ次第 Harness の完全な画面を開きます。

> [!IMPORTANT]
> DSH Desktop は、急速に進化している `@deepseek-ai/dsh@0.2.1-rc.4` を基盤とする早期プレビューです。Windows x64 インストーラーは署名なしのコミュニティビルドのため、初回起動時に Windows SmartScreen の警告が表示される場合があります。本プロジェクトは DeepSeek の公式製品ではありません。

## ダウンロード

[GitHub Releases](https://github.com/LightyearXizIl/DSH-Desktop/releases) から最新の `dsh-desktop-windows-x64-setup.exe` をダウンロードしてください。**Pre-release** と表示されたバージョンは先行版で、一部のコミュニティプラグインと互換性がない場合があります。

インストール版は起動直後と 6 時間ごとに GitHub Releases の更新を確認します。新しいバージョンがあると、まず確認を求め、そのリリースの更新履歴を表示します。同意した後にだけダウンロードが始まり、「再起動してインストール」を選んだときにだけインストールします。「設定 → このアプリについて」から手動で確認したり、今後のバージョン通知を残したまま特定のバージョンをスキップしたりすることもできます。

## DSH Desktop が追加する機能

DeepSeek Harness はすでに Agent Runtime と Web UI を提供しています。DSH Desktop はその上にデスクトップホストとしての機能を加えます。

- CLI やブラウザタブを別途開かずに Harness を自動で起動・停止
- ネイティブのフォルダ選択ダイアログでプロジェクトワークスペースを追加・管理
- DeepSeek 公式モデルと主要なサードパーティのモデルプロバイダーに対応
- カスタム Agent Preset を持ち運べる [`.dshpreset` アーカイブ](docs/preset-packages.md)としてインポート・エクスポートし、インストール前に名前の衝突確認と信頼に関する警告を表示
- 内蔵の PPT モードで資料から編集可能な PPTX を作成
- Python と Office ライブラリを同梱し、DOCX、PPTX、XLSX をオフラインで作成・検査
- アプリを更新しても Profile、プラグイン、ワークスペース、セッション、モデル設定を保持
- Harness の起動失敗やフロントエンドプラグインの障害を検出し、`harness.log` に診断を記録して復旧手順を案内
- ユーザーデータを壊さずにサードパーティプラグインを一時的に無効化するセーフモード
- ペアリングしたスマートフォンから LAN または任意の一時公開トンネル経由でセッションを継続
- Liquid Glass テーマ（マイカ／互換モード）、起動アニメーション、任意のローカルモデル自動起動を内蔵
- アプリ内でデスクトップ版の更新を確認し、ダウンロードとインストールはユーザーが判断

## PPT 作成

**PPT** ボタンを押してテンプレートを選び、作りたい内容を説明します。内蔵の **16 テンプレート・192 レイアウト**から、編集可能な PPTX を出力します。テンプレートのプレビューは英語で表示されますが、生成内容は中国語と英語に対応し、それぞれに合ったフォント設定が使われます。プレビューの言語が出力言語を決めることはありません。

PPT 機能は常にプリインストールされ、関連する自動プロンプトは PPT ボタンを選んだセッションでのみ有効になります。テンプレート、検証、参照元の詳細は [PPT の説明](packages/ppt-runtime/README.md)を参照してください。

## スマートフォン接続

`Harness` メニューから「スマートフォンを接続…」を選び、ペアリング用の QR コードを読み取ります。

- Wi-Fi では読み取るだけで接続できます。
- インターネットトンネルでは、さらにパソコンに表示される 6 桁の接続パスワードを入力します。既定はメモリ上だけに保持される 5 分間の一時パスワードで、「スマートフォンを接続」画面で同意した場合にだけ長期パスワードがこのパソコンに生成されます。

Harness 本体は常にランダムな `127.0.0.1` ポートで動作し、スマートフォンからのアクセスは独立したペアリング Bridge を経由します。Cloudflare Quick Tunnel が通常の長時間接続経路です。無料の Pinggy は Cloudflare が使えない場合（中国本土など）の予備経路で、約 60 分で失効します。デスクトップ側で切断すると、スマートフォンのセッションも終了します。

Cloudflare の起動に失敗した場合は Pinggy を試します。Cloudflare のペアリングリンクが表示されているのにスマートフォンで開けない場合は、「**開けない場合は別の経路へ**」を押して Pinggy に切り替えられます。

## セーフモードと復旧

サードパーティプラグインが原因で起動や画面描画に問題が起きた場合、DSH Desktop は Runtime とフロントエンドの両方の情報から原因のプラグインを特定し、案内付きの復旧画面を開きます。

`Harness` メニューから「セーフモードで再起動…」を選ぶと、公式コア Bundle だけを含む独立した Profile で起動します。通常 Profile のサードパーティプラグインは無効になりますが、Agent、セッション、モデル設定、ワークスペースは引き続き使えます。画面上部のセーフモード通知から、選んだ問題のプラグインをアンインストールしたり、通常起動に戻したりできます。復旧画面ではプラグインの互換更新も確認でき、セーフモードでは一括アップグレードにも対応しています。

通常の画面に入れない場合は `--safe-mode` で起動することもできます。PowerShell の例：

```powershell
& "$env:LOCALAPPDATA\Programs\DSH Desktop\DSH Desktop.exe" --safe-mode
```

（別のフォルダにインストールした場合は実際のパスに置き換えてください。）

## ローカルデータとセキュリティ

- Harness の Web UI はランダムなループバックポートでのみ動作します。
- Renderer には Node.js の権限がなく、Context Isolation と Sandbox が有効です。
- WebView、信頼できないアプリ内遷移、想定外の権限要求はブロックされます。
- 外部の Web リンクはシステムのブラウザで開きます。
- Profile とセッションはインストール先ではなく、Electron のユーザー単位のアプリデータフォルダに保存されます。
- スマートフォンからのアクセスには短時間有効なペアリング Token が必要です。Wi-Fi では読み取るだけで接続し、インターネットトンネルではさらにパソコンに表示されるパスワードが必要です。

## 対応プラットフォーム

| プラットフォーム | 配布形式 | 状態 |
| --- | --- | --- |
| Windows x64 | 署名なしの NSIS インストーラー | 対応 |
| macOS | ソースにビルドスクリプトのみ残しており、インストーラーは未配布 | 未配布 |
| Windows ARM64 / Linux | — | 現在は非対応 |

Harness には対象プラットフォーム固有の依存関係が含まれるため、各インストーラーは対応する OS とアーキテクチャでビルドする必要があります。

## 開発とアーキテクチャ

プロジェクトの文書は[ドキュメント一覧](docs/README.md)から始まります。よく使うもの：

- [開発ガイド](docs/development.md) — ローカル環境、検証、パッチの保守、ネイティブ環境でのパッケージ化
- [実行アーキテクチャ](docs/architecture.md) — 起動の流れ、保存データ、セキュリティ境界、障害復旧、スマートフォン接続、更新
- [リリース手順](docs/release-runbook.md) — バージョン番号、パッケージ化、GitHub Release への公開
- [Preset パッケージ形式](docs/preset-packages.md) — 持ち運べる Agent Preset の仕様

変更を提出する前に `npm test`、`npm run typecheck`、`npm run build` を実行し、影響する操作を実際に試してください。Issue、ログ、スクリーンショット、テストデータに実際の API Key を含めないでください。

## 関連プロジェクト

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — DeepSeek 公式の Agent フレームワークで、本アプリの Runtime と Web UI の提供元です。
- [dsh-market](https://github.com/dsh-market/dsh-market) — DeepSeek Harness のコミュニティプラグインマーケットで、Harness の画面内でプラグインの閲覧、インストール、更新ができます。

## ライセンス

DSH Desktop は [MIT License](LICENSE) で公開されています。

DeepSeek Harness とその依存関係には、それぞれのライセンスと商標規則が引き続き適用されます。DSH Desktop は独立したコミュニティ製デスクトップアプリであり、DeepSeek とは提携関係にありません。
