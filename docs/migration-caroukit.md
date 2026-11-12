# CarouKit migration / Migração para CarouKit

On 2026-11-12, at the owner's explicit request, a complete local Git backup including the implementation was verified; the old `lpalvess/sourced-carousel` repository was deleted and [lpalvess/caroukit](https://github.com/lpalvess/caroukit) was created. This is a new repository with clean public history, not a rename or a redirect. Old issue, pull-request and workflow URLs are historical and no longer working navigation. Repository metadata was saved locally before deletion.

Internal `.specs/`, `.superpowers/` and `docs/superpowers/` are excluded from the new public history and ignored. Authorship and licenses in the source files are preserved. Existing local clones keep their own history; use a fresh clone for this repository.

## Review branch installation

```sh
git clone --branch feat/prepared-content --single-branch https://github.com/lpalvess/caroukit.git caroukit
cd caroukit
scripts/carousel.sh setup
scripts/carousel.sh render examples/tutorial.json --preset instagram --out out/tutorial
```

Optional Claude Code integration for this checkout: `claude --plugin-dir "$PWD"`. Or install the review branch marketplace:

```sh
claude plugin marketplace add lpalvess/caroukit#feat/prepared-content
claude plugin install caroukit@caroukit
```

After a separately approved merge, the branch suffix can be removed. The plugin/marketplace/package/skill identifiers are now `caroukit`; the skill is `/caroukit:caroukit`. Metadata version 1.2.0 is not a published release.

An existing `sourced-carousel@sourced-carousel` plugin does not automatically change identity or source. Preserve input/output files outside its cache, remove the old marketplace in the scope where you installed it (`claude plugin marketplace remove sourced-carousel`), then install the new source above. **Removing the last marketplace scope also uninstalls its plugins and deletes its cache.** These are manual instructions; this delivery did not change your personal Claude configuration. See the official [CLI reference](https://code.claude.com/docs/en/plugins/cli-reference).

## Compatibility

`scripts/carousel.sh`, `CAROUSEL_IMAGE`, `carousel.pdf` and existing slide JSON remain compatible. Without flags, legacy `meta.format` retains square/portrait dimensions. Explicit `--preset` overrides that format; `--size` is only for generic output. See [presets](presets.md).

Numbers do not need a facts file. The legacy `--facts` option emits a clear warning without reading, resolving or mounting its path, and is scheduled for rejection in 2.0.0. Sources and credits remain optional; review your content before publishing.

## Português

Por ordem do proprietário, foi criado e verificado um backup local completo com as alterações; depois o remoto antigo foi excluído e o novo **lpalvess/caroukit** foi criado. Não há redirecionamento do endereço antigo. Issues, PRs, execuções antigas de CI e configurações não são transferidos automaticamente; os metadados foram preservados localmente.

O novo histórico público não contém `.specs` nem planos internos. A implementação está na branch de revisão acima, com novo PR e sem merge. O script, a variável de imagem, os JSONs e os formatos legados continuam compatíveis. A instalação do plugin precisa trocar origem e identificador para `caroukit@caroukit`; guarde seu conteúdo fora do cache antes de remover o marketplace antigo. Atualize integrações e links para o novo remoto. Instalação e agente externo podem usar rede; validação/renderização pelo container continuam offline.
