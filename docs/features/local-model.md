# 本地模型自动启动

本文是 [文档总览](../README.md) 的功能子文档。实现位于 `src/main/runtime/local-model-launcher.ts`，回归为 `test/local-model-launcher.test.ts`。

## 行为

- 启用后，DSH Desktop 启动时先探测 `http://127.0.0.1:<port>/health`。返回 `status: "ok"` 且 `loaded: true` 时直接复用已运行的服务。
- 否则用配置中的 Python 启动 Strata（`strata launch ... --access local --port <port> --yes --no-tui`），每 2 秒探测一次，最长等待 15 分钟，直到服务报告 `loaded`。
- 未配置、配置无效、进程退出或启动超时都只记录到日志，**不会阻断** DSH Desktop 和 Harness 的正常启动。无效配置会被忽略而不是自动修复，避免拼错的路径让程序对着无关目录启动进程。
- 当前没有图形化设置页，只能手动编辑配置文件。模型能否实际使用取决于本地运行时、模型文件和显存。

## 配置文件

路径：`<userData>/local-model.json`（Electron 的应用数据目录，正式版与开发版分开）。只有 `enabled` 为 `true` 时才会启用。

```json
{
  "enabled": true,
  "pythonPath": "E:\\Strata\\python\\python.exe",
  "strataPath": "E:\\Strata\\strata.py",
  "modelPath": "E:\\Strata\\models\\<模型目录>",
  "dataDir": "E:\\Strata\\data",
  "port": 8080,
  "model": "iq3_s",
  "context": "32k",
  "kv": "int8",
  "vision": "cpu",
  "mtp": "on"
}
```

上面的路径只是示例，按本机实际安装位置填写。

| 字段 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `enabled` | 是 | — | 必须为 `true` |
| `pythonPath` / `strataPath` / `modelPath` / `dataDir` | 是 | — | 解释器、Strata 入口、模型目录、数据目录 |
| `port` | 否 | `8080` | 1–65535 的整数 |
| `model` | 否 | `iq3_s` | 传给 `--model` |
| `context` | 否 | `32k` | 传给 `--context` |
| `kv` | 否 | `int8` | `int8`、`q4_0`、`k8v4` 或 `fp16` |
| `vramReserveMib` | 否 | 不设置 | 非负整数，转为 `--set vram_reserve_mib=<值>` |
| `vision` | 否 | `cpu` | `off`、`cpu` 或 `gpu` |
| `mtp` | 否 | `on` | `on` 或 `off` |

启动参数固定包含 `--parallel 1` 与 `--tune skip`，子进程环境会设置 `PYTHONUTF8=1` 和 `PYTHONIOENCODING=utf-8`。
