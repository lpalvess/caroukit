# CarouKit verification — 2026-11-12

Current delivery evidence, separate from the previous reports. Environment: Ubuntu 24.04 through WSL2, x86_64, Docker 29.6.2, Bun 1.4.3 in the pinned image from `scripts/carousel.sh`. Native Windows/macOS and platform uploads were not tested.

| Check | Result |
| --- | --- |
| Frozen setup, install scripts disabled | 29 installs across 30 packages checked; no dependency change |
| TypeScript and full tests inside hardened offline container | 480 passed, 0 failed, 24 files; independent controller run 50.78 seconds |
| Numeric content without facts, optional credits, invalid schema/unsupported types | Passed in tests and real wrapper runs; invalid input exit1 |
| Four presets, each generated twice through public wrapper | All 22 PNGs and four PDFs identical byte for byte between runs |
| PNG dimensions/PDF pages | Instagram1080×1350/5; TikTok720×1280/5; LinkedIn1080×1350/6; generic1440×1080/6 |
| Boundary canvases with 10 slides and 80-character wide credits | 540×540, 540×1080, 2160×1080 and 2000×1250 rendered; images inspected |
| Maximum 2,500,000-pixel canvas ×10 | memory.peak 278,126,592 bytes inside unchanged 1GiB limit |
| Oversized 2160×2160 request | Rejected, exit2, before rendering |
| Container selftest | Five passed: no network, no DNS, code read-only, restricted filesystem writes, output writable |
| Trivy0.70.0, including dev dependencies, HIGH/CRITICAL, unfixed included | 29 packages; 0 HIGH/CRITICAL findings; scan2026-11-12, cached DB updated2026-11-12 |
| Claude Code2.1.322 local plugin validation | Passed; no personal installation changes |
| Rebrand/lockfile | Only root workspace name changed in lock; runtime dependency versions unchanged |
| Original supplied logo | Copied unchanged; hash recorded in docs/images/README.md |

Source changes were reviewed by Sonnet agents through `claude`/`claude2` in WSL. The core review found no blocking defects; the controller reviewed documentation and all example contact sheets. Text fit remains an estimate, so inspect each PNG. The footer test guards margins, not a universal proof of all possible text layouts. Future layout cases may still need adjustment.

The implementation was tested before the remote recreation. Subsequent edits change repository addresses and documentation only. The new repository CI is authoritative for the final published commit; see the PR checks. No release, merge, platform account connection or actual social post was performed.

## Português

480 testes passaram, sem falhas, com typecheck no container offline. Os quatro presets produziram os mesmos bytes em duas execuções. Foram inspecionadas as imagens de exemplo e os limites de canvas com 10 slides. O isolamento passou nas cinco verificações e o Trivy não encontrou vulnerabilidades altas/críticas nas 29 dependências analisadas.

Gerar arquivos corretamente não comprova publicação real. Instagram tem comparação parcial de dimensões documentadas; LinkedIn tem PDF e limite de bytes verificados; TikTok orgânico continua não testado. As fontes e limites estão em presets.md. Revise o conteúdo antes de publicar.
