# Implementation and verification status

This package is the built-in image and video generation plugin of DSH Desktop. Usage, credentials and execution boundaries are described in [README.md](README.md).

## Implemented

- Public `dsh-image-generation` package with Host, Client, `generate-image` Skill and `dsh.bundle.patch`; shipped in the Desktop composition and disabled by default.
- Shared `image_generate` tool for conversations, PPT and Word, with OpenAI (Images API) and ByteDance Seedream adapters. Seedream presets: 5.0 Pro, 5.0, 5.0 Lite, 4.5 and 4.0, plus custom model or endpoint IDs.
- Plugin configuration card with automatic validation on save; provider, model, address and key are committed as one host-only credential record.
- Governed PNG output into the workspace through the sandboxed subprocess writer. Under an Electron Host the writer sets `ELECTRON_RUN_AS_NODE=1` while still clearing credentials and `NODE_OPTIONS`.
- Conversation thumbnails with a lightbox. The authenticated preview route accepts Desktop's `session-<uuid>` IDs and reads only the PNG named by a successful image tool result, after directory, symlink, size, type and SHA-256 checks.
- Bounded provider error parsing keeps HTTP status, provider error code, parameter name and request ID; free-form upstream text and credential echoes stay in the Host.

## Verified

- Focused image-generation tests and the Desktop dependency-closure checks pass, covering both providers, single-request save, revision conflicts, credential isolation, PNG writes, cancellation, size limits, directory escapes and history authorization. These use loopback provider services.
- Standalone tarball installation with `dsh plugin --profile web add` into an isolated DSH home, followed by authenticated Host startup and plugin/client discovery.

## Not verified

- Real paid generation requests against OpenAI or ByteDance and the visual quality of generated images.
- Inserting, editing, saving and reopening generated images in PowerPoint or Word.
- Windows installer acceptance of this plugin.
