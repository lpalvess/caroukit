> Historical repository URLs below refer to the deleted predecessor; see [migration-caroukit.md](migration-caroukit.md) for the current location.

# Verification of the prepared-content update

Date: 2026-11-12. Base: `dfc1de402312e1d543e947c318cbe5d50b1a00de`. Branch: `feat/prepared-content`.

This records the initial local implementation checks. The later Trivy scan is recorded separately below; GitHub CI status belongs to the latest pull-request head. No release or completed user pilot is claimed.

## Environment and scope

- Ubuntu 24.04 under WSL2, x86_64, Docker server 29.6.2.
- Runtime image: `oven/bun@sha256:ec06c3b6cea04192ae6770c434f668ca41d343ad19fa6472216c7b48be39c598`, Bun 1.4.3, TypeScript 5.9.3.
- Setup used the existing wrapper: frozen lockfile, install scripts disabled. No dependency or lockfile change.
- Tests and typecheck used the offline container command in [CONTRIBUTING.md](../CONTRIBUTING.md): network disabled, read-only root and project, all capabilities dropped, no-new-privileges, user id, pids/memory limits and restricted temporary storage. Test artifacts used a separate writable `/out` with `TMPDIR=/out/tmp`.
- Native Windows, macOS and other CPU architectures were not tested. Reproducibility is scoped to identical inputs, source, fonts, dependencies, image and architecture.

## Executed checks

| Check | Observed result |
| --- | --- |
| Baseline typecheck and suite before edits | Passed; 383 tests, 0 failures |
| Final `bun node_modules/typescript/bin/tsc --noEmit && bun test` | Exit 0; 375 tests, 0 failures, 4,309 assertions across 20 files |
| `bash -n scripts/carousel.sh` | Passed |
| `scripts/carousel.sh selftest` | All five isolation checks passed |
| Real wrapper validation and render of `examples/slides.json`, without facts | Six PNGs and a six-page PDF; technical success and review note |
| Same render with `--facts '/does-not-exist,facts.md'` | Succeeded with exactly one explicit warning; nonexistent comma-containing path was not resolved or mounted |
| Compare every PNG and PDF from those two renders with `cmp` | All bytes identical; suite also checks separate-process repeat generation |
| Missing facts value; facts followed by an option | Exit 2 |
| `--out --facts` regression | Test failed before the parser fix, passed after; real wrapper also exits 2 |
| Technically invalid number slide missing its label | Exit 1; previous output PDF removed |
| Light portrait variant of existing demo | Six PNGs and PDF generated |
| Visual review | All six dark square and six light portrait PNGs inspected; no visible clipping; optional source credit visible |
| Architecture diagrams | PT and EN PNGs inspected; SVG/Draw.io XML and Excalidraw JSON parse; regeneration produces identical source exports |
| Git diff of `bun.lock`, `.specs/features/v1/`, fonts, `src/render.ts` and `src/pdf.ts` | No changes |

The test count changed because factual-comparison tests were removed, replacement behavior and migration tests were added, and a fragile function-arity assertion was removed. Technical schema, field, content, Unicode-character restrictions, layout, error and isolation checks remain.

`tests/wrapper.test.ts` adds six behavioral tests using a fake Docker executable that captures arguments. It verifies no facts argument or mount reaches Docker, one warning even for repeated legacy options, retained isolation arguments, malformed options failing before Docker, absolute output location and failure exit-code propagation. This checks the wrapper contract; the separate real-Docker selftest checks actual isolation.

## Review and documentation

Implementation was delegated to `claude` and `claude2` on WSL with Sonnet, with Superpowers used only by the controller. A fresh read-only `claude2` Sonnet review found no correctness or security defect. Its important finding was the missing automated wrapper coverage, now supplied and passing.

Minor feedback was resolved by documenting output-directory option parsing, an empty directory after a failed wrapper run, warning streams and unchanged font-glyph coverage. WSL evidence replaced pending wording. The small error-label placement in the architecture diagram was retained because it remains readable.

Context7 supplied official Claude Code installation documentation and resvg 2.6.2 font/render documentation. It did not expose Bun 1.4.3 as a versioned library, so subprocess API documentation from Bun 1.4.2 was consulted and behavior/type definitions were verified with the installed Bun 1.4.3. No private source or credentials were sent to documentation queries.

## Evidence kept separate at initial local delivery

- The October dependency audit and original v1 specifications remain historical records. The observed October GitHub CI runs are listed separately in [dependencies.md](dependencies.md#8-follow-up-2026-11-12).
- Trivy had not been rerun at initial local delivery; the subsequent scan is recorded below. The earlier October result remains historical.
- At initial local delivery, the branch had not been pushed, merged or released and GitHub CI had not run on it. The owner subsequently authorized branch publication, a PR and CI monitoring; merge remains unauthorized.
- Plugin install commands were checked against official documentation; installing this branch as a marketplace plugin was not exercised end to end.
- The [pilot](pilot.md) is proposed only: 3–5 volunteers, first-carousel completion, setup/result time and reuse after 7–14 days, recorded manually with opt-in. No participants or outcomes are claimed.

## Follow-up: Trivy, 2026-11-12

The prepared-content implementation at `ff8e325f64036c565609f13fd1897ab3aa435947` was scanned with Trivy 0.70.0, the default of the pinned CI action. Scanner image: `aquasec/trivy@sha256:be1190afcb28352bfddc4ddeb71470835d16462af68d310f9f4bca710961a41e`.

Database schema 2 was updated at `2026-11-12T18:57:38Z` and downloaded at `2026-11-12T20:42:00Z`. The database download used network access without the source mounted. The scans then ran with `--network none`, a read-only source mount, `--skip-db-update` and `--offline-scan`.

- CI-equivalent scope: `fs --scanners vuln --severity HIGH,CRITICAL --ignore-unfixed=false --exit-code 1`, target `bun.lock`, 23 production packages, 0 findings, exit 0.
- Additional development scope: same command plus `--include-dev-deps`, 29 packages, 0 findings, exit 0.
- This is a dated dependency-vulnerability result at the stated severity threshold, not a scan of the runtime container image or a guarantee of absence of vulnerabilities.
- The scanner needed a larger temporary filesystem for the current database download. This changed only the external scan command, not `scripts/carousel.sh`, its runtime limits or any project dependency.

PR publication and CI results are recorded on the pull request, so the checks can be matched to its exact current head without turning this document into a claim about a future commit.

## Try it

From this checkout, follow the [first-use steps](../README.en.md#first-use) or [primeiro uso](../README.md#primeiro-uso): setup, render the fictional example, copy/adapt the JSON, inspect every PNG, then use the PDF. Normal commands omit `--facts`. The [migration guide](migration-1.1.md) explains the explicit 1.1 warning and planned 2.0 removal.
