# Contributing / Contribuindo

## English

Thanks for helping. Keep changes small and concrete: a short example is worth more than a long description, and a small patch is easier to review than a large one.

**Principles**

- No new runtime dependencies without a written justification and the owner's approval. Today there are 2 (`satori`, `@resvg/resvg-wasm`), with a limit of 4 (see [docs/dependencies.md](docs/dependencies.md)). No new tools either.
- No telemetry and no network at runtime. Run project code locally only in the container.
- The product is prepared content to PDF and PNG with technical validation only. Do not add number comparison, required sources or facts files, research or AI fact-checking.
- Pull requests that change behavior need tests. Use the fictional `examples/slides.json`, or the tutorial, educational and project examples. Test the affected preset without adding platform publishing.

**Setup** (the only step with network; pinned image, frozen lockfile, scripts off):

```
scripts/carousel.sh setup
```

**Tests and typecheck** run inside the offline container, not on the host, with the same controls as `scripts/carousel.sh` (read-only root and repo, all capabilities dropped, no-new-privileges, 256 pids, 1 GB memory, your user id, `/tmp` as tmpfs `noexec,nosuid` of 128 MB, and a writable `/out` with `TMPDIR=/out/tmp` for tests). Use the image digest from the `IMAGE=` line of `scripts/carousel.sh`, never a floating tag such as `oven/bun:1`:

```
IMAGE=oven/bun@sha256:ec06c3b6cea04192ae6770c434f668ca41d343ad19fa6472216c7b48be39c598
OUT="$(mktemp -d)"; mkdir "$OUT/tmp"
docker run --rm --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges --pids-limit 256 --memory 1g \
  --tmpfs /tmp:rw,noexec,nosuid,size=128m --user "$(id -u):$(id -g)" \
  -e HOME=/tmp -e TMPDIR=/out/tmp --workdir /app \
  --mount "type=bind,src=$PWD,dst=/app,readonly" \
  --mount "type=bind,src=$OUT,dst=/out" "$IMAGE" \
  sh -c 'bun node_modules/typescript/bin/tsc --noEmit && bun test'
```

If `scripts/carousel.sh` changes the image or the flags, follow the script. Then run `scripts/carousel.sh selftest`.

**CI distinction.** The existing GitHub Actions workflow runs on `ubuntu-latest` and uses host Bun 1.4.3 for unit tests and typecheck. The user-facing `render` and `selftest` run in the offline container. Do not read a green host run as proof of container isolation, nor the reverse.

**Reproducibility.** `tests/e2e.test.ts` compares two process runs byte for byte. That holds for the same image digest, CPU architecture, lockfile, source and fonts and the same JSON input. No cross-platform or cross-architecture claim is made, and overriding `CAROUSEL_IMAGE` changes the environment.

**Examples and small improvements.** Start from `examples/slides.json` with fictional or explicitly shareable content. Explain the problem and expected result in the PR; for visual changes, include the input and before/after PNGs. Render with `scripts/carousel.sh render examples/slides.json --out out/contribution`, inspect every PNG and open the PDF. Keep generated personal output out of the commit. Add a regression test for a behavior change and update both READMEs when the interface changes.

**Docs.** Keep the Portuguese and English versions consistent. Internal specifications and implementation plans are excluded from the public tree. The public migration contract is [docs/migration-1.1.md](docs/migration-1.1.md).

Security problems: do not open a public issue, see [SECURITY.md](SECURITY.md).

## Português

Obrigado por ajudar. Mantenha mudanças pequenas e concretas: um exemplo curto vale mais que uma descrição longa, e um patch pequeno é mais fácil de revisar.

**Princípios**

- Nenhuma dependência de runtime nova sem justificativa escrita e aprovação do dono do projeto. Hoje são 2 (`satori`, `@resvg/resvg-wasm`), com limite de 4 (veja [docs/dependencies.md](docs/dependencies.md)). Nenhuma ferramenta nova também.
- Sem telemetria e sem rede em tempo de execução. Execute o código do projeto localmente só no container.
- O produto é conteúdo preparado para PDF e PNG, só com validação técnica. Não adicione comparação de números, fontes ou arquivo de fatos obrigatórios, pesquisa nem checagem de fatos por IA.
- Pull requests que mudam comportamento precisam de testes. Use `examples/slides.json` (fictício) ou os exemplos de tutorial, explicação educativa e projeto. Teste o preset afetado sem publicar em plataformas.

**Setup** (único passo com rede; imagem fixada, lockfile congelado, scripts desligados):

```
scripts/carousel.sh setup
```

**Testes e typecheck** rodam dentro do container offline, não no host, com os mesmos controles do `scripts/carousel.sh` (raiz e repositório somente leitura, todas as capabilities removidas, no-new-privileges, 256 pids, 1 GB de memória, seu id de usuário, `/tmp` em tmpfs `noexec,nosuid` de 128 MB e `/out` gravável com `TMPDIR=/out/tmp` para os testes). Use o digest da linha `IMAGE=` de `scripts/carousel.sh`, nunca uma tag flutuante como `oven/bun:1`. O comando é o do bloco em inglês acima. Se o script mudar a imagem ou as flags, siga o script. Depois rode `scripts/carousel.sh selftest`.

**Diferença no CI.** O workflow existente do GitHub Actions roda em `ubuntu-latest` e usa o Bun 1.4.3 do host para testes unitários e typecheck. O `render` e o `selftest` de uso real rodam no container offline. Um CI verde no host não prova o isolamento do container, nem o contrário.

**Reprodutibilidade.** `tests/e2e.test.ts` compara duas execuções do processo byte a byte. Vale para o mesmo digest de imagem, arquitetura de CPU, lockfile, código e fontes e o mesmo JSON. Não há afirmação entre plataformas ou arquiteturas, e trocar `CAROUSEL_IMAGE` muda o ambiente.

**Exemplos e melhorias pequenas.** Parta de `examples/slides.json`, com conteúdo fictício ou autorizado para compartilhamento. Explique o problema e o resultado esperado no PR; em mudanças visuais, inclua a entrada e PNGs de antes/depois. Rode `scripts/carousel.sh render examples/slides.json --out out/contribution`, inspecione todos os PNGs e abra o PDF. Não inclua saídas pessoais geradas no commit. Adicione teste de regressão para mudanças de comportamento e atualize os dois READMEs se a interface mudar.

**Documentação.** Mantenha as versões em português e inglês consistentes. Especificações e planos internos ficam fora da árvore pública. O contrato público de migração é [docs/migration-1.1.md](docs/migration-1.1.md).

Problemas de segurança: não abra issue pública, veja [SECURITY.md](SECURITY.md).

**Preset smoke check / verificação dos presets:** `bash scripts/check-presets.sh out/preset-check` renders all four presets twice through the offline wrapper and compares the PNG/PDF bytes. / Gera os quatro presets duas vezes pelo wrapper offline e compara os bytes de PNGs e PDFs.
