# Removes documentation files that were merged into the new docs structure.
# Run once from the repository root:  powershell -ExecutionPolicy Bypass -File .\cleanup-docs.ps1
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
$paths = @(
  "docs/0.12.1-stability-fix-checklist.md",
  "docs/STATUS.md",
  "docs/baseline-runtime-compatibility.md",
  "docs/code-standards.md",
  "docs/desktop-rollout-diagnostics.md",
  "docs/dmg-installer.md",
  "docs/dsh-0.1.7-baseline.md",
  "docs/harness-0.1.2-alpha.3-upgrade.md",
  "docs/harness-0.1.2-alpha.4-upgrade.md",
  "docs/harness-0.1.2-rc.1-upgrade.md",
  "docs/harness-0.1.2-upgrade.md",
  "docs/harness-0.1.5-patch-refactor.md",
  "docs/harness-0.1.5-rc.1-upgrade.md",
  "docs/harness-0.1.5-rc.1-verification-checklist.md",
  "docs/harness-0.1.6-alpha.2-upgrade.md",
  "docs/harness-0.1.7-rc.1-patch-audit.md",
  "docs/harness-0.1.7-rc.1-upgrade.md",
  "docs/harness-0.2.0-rc.2-upgrade.md",
  "docs/harness-0.2.1-feature-review.md",
  "docs/harness-0.2.1-rc.1-upgrade.md",
  "docs/harness-0.2.1-rc.2-upgrade.md",
  "docs/harness-0.2.1-rc.4-upgrade.md",
  "docs/macos-window-chrome.md",
  "docs/meeting-minutes-case-review.md",
  "docs/mobile-pairing-pin-design.zh.md",
  "docs/office-template-sources.md",
  "docs/office-templates-v012.md",
  "docs/patch-compatibility-review-0.1.7.md",
  "docs/patch-plugin-contract.md",
  "docs/ppt-implementation-provenance-and-remediation-2026-09-06.md",
  "docs/ppt-personal-templates.md",
  "docs/ppt-template-conversion-review.md",
  "docs/ppt-template-v012-investigation.md",
  "docs/settings-launcher-compatibility.md",
  "docs/source-build-contract.md",
  "docs/web-to-desktop-migration.zh.md",
  "docs/workbenches.md",
  "docs/superpowers/plans/2026-08-31-harness-0.1.2-alpha.3-upgrade.md",
  "docs/superpowers/plans/2026-08-31-versioned-update-and-prerelease-parity.md",
  "docs/superpowers/plans/2026-09-01-harness-0.1.2-alpha.4-upgrade.md",
  "docs/superpowers/specs/2026-08-31-harness-0.1.2-alpha.3-upgrade-design.md",
  "docs/superpowers/specs/2026-08-31-versioned-update-and-prerelease-parity-design.md",
  "docs/superpowers/specs/2026-09-01-harness-0.1.2-alpha.4-upgrade-design.md",
  "docs/images/dsh-desktop-hero-v020.png",
  "docs/images/dsh-desktop-hero-v021.png",
  "docs/images/model-provider-settings-v011.png",
  "docs/images/wechat-group-20260815.png",
  "docs/images/readme-logo-black.svg"

)
foreach ($p in $paths) {
  if (Test-Path -LiteralPath $p) {
    git rm -q --ignore-unmatch -- "$p"
    if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Force }
    Write-Host "removed $p"
  }
}
foreach ($d in @("docs/superpowers/plans", "docs/superpowers/specs", "docs/superpowers")) {
  if ((Test-Path -LiteralPath $d) -and -not (Get-ChildItem -LiteralPath $d -Force)) { Remove-Item -LiteralPath $d -Force }
}
Write-Host "done; this script removes itself now"
Remove-Item -LiteralPath $PSCommandPath -Force
