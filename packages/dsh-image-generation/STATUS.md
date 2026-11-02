# Implementation and verification status

This package is the built-in image and video generation plugin of DSH Desktop. Usage, credentials and execution boundaries are described in [README.md](README.md).

## Implemented

- Public `dsh-image-generation` package with Host, Client, `generate-image` Skill and `dsh.bundle.patch`; shipped in the Desktop composition and disabled by default.
- Shared `image_generate` tool for conversations, PPT and Word, with OpenAI (Images API), ByteDance Seedream, GrsAI, Agnes AI and OpenAI-compatible adapters. Seedream presets: 5.0 Pro, 5.0, 5.0 Lite, 4.5 and 4.0, plus custom model or endpoint IDs.
- `video_generate` on GrsAI (MiniMax H3, Agnes Video 2.5, Wan 3.0, Veo 3.1) or Agnes AI (Agnes Video 2.5 / 2.5 Flash), and `text_generate` on GrsAI.
- Per-model generation options (default ratio, resolution, quality for images; default ratio and resolution for video) from one capability table (`lib/options.js`), shown in the card and sent in real requests.
- GrsAI balances: the key's own quota (`getAPIKeyCredits`) and, with an optional host-only account token, the account balance (`getCredits`); failures show their reason instead of 0.
- Plugin configuration card with automatic validation on save; provider, model, address and key are committed as one host-only credential record.
- Governed PNG output into the workspace through the sandboxed subprocess writer. Under an Electron Host the writer sets `ELECTRON_RUN_AS_NODE=1` while still clearing credentials and `NODE_OPTIONS`.
- Conversation thumbnails with a lightbox. The authenticated preview route accepts Desktop's `session-<uuid>` IDs and reads only the PNG named by a successful image tool result, after directory, symlink, size, type and SHA-256 checks.
- Bounded provider error parsing keeps HTTP status, provider error code, parameter name and request ID; free-form upstream text and credential echoes stay in the Host.

## Verified

- Focused image-generation tests and the Desktop dependency-closure checks pass, covering both providers, single-request save, revision conflicts, credential isolation, PNG writes, cancellation, size limits, directory escapes and history authorization. These use loopback provider services.
- Standalone tarball installation with `dsh plugin --profile web add` into an isolated DSH home, followed by authenticated Host startup and plugin/client discovery.

## Not verified

- Real paid generation requests against OpenAI, ByteDance, GrsAI, Agnes AI or any OpenAI-compatible service, and the visual quality of generated images. Agnes AI and the OpenAI-compatible path are verified against loopback services built from the documented contracts; a real Agnes AI gateway was reached only with an invalid key (401).
- A GrsAI balance read with a real valid key or account token (the 0 quota of unlimited keys follows the documented key types).
- Inserting, editing, saving and reopening generated images in PowerPoint or Word.
- Windows installer acceptance of this plugin.
