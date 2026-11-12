# Migration to 1.1.0 / Migração para 1.1.0

## English

Plugin version 1.0.0 became 1.1.0. The product is now: prepared user content to local PDF and PNG, with technical validation only. The `package.json` version (private, `0.1.0`) is unchanged.

The previous 1.0.0 contract required facts-checked numbers. Internal specifications are kept locally, outside the public tree. This document and the [README](../README.md) are the current contract.

### What changed

| Before (1.0.0) | Now (1.1.0) |
| -------------- | ----------- |
| `--facts <file>` was used and the file was read | `--facts <file>` is accepted with a warning; the value is ignored and no numbers are checked. No file is read, stat'ed or mounted. Planned: rejected in 2.0.0. |
| A facts file with literal quotes and links was required for real carousels | No facts, sources or quotes are required. |
| Numbers on slides were compared with the facts file | No numerical comparison. |
| `examples/facts.md` | Removed. |
| Successful `validate` printed nothing | `ok: N slides passed technical validation` |
| `render` printed `slide i/n` | Also prints the created PNG count and `carousel.pdf`, a short review-before-publishing note, and the wrapper prints the absolute output directory. |
| `--facts` with a missing value | Missing value, or another option as the value: exit code 2. |

The wrapper writes the deprecation warning to stderr; the direct TypeScript CLI writes it to stdout. It appears once per invocation, even if the option is repeated.

`--out` now rejects another option as its directory value (exit code 2). To use a directory whose name starts with `--`, prefix it with `./`, such as `--out ./--draft`.

Normal commands omit `--facts`:

```
scripts/carousel.sh validate slides.json
scripts/carousel.sh render slides.json --out out/my-carousel
```

### Removed validator rules

| Rule | What it did |
| ---- | ----------- |
| `number-not-in-facts` | Rejected a number outside `source` that was not in the facts file. |
| `facts-skipped` | Warned when there were numbers but no `--facts`. |
| `non-ascii-digit` | Rejected non-0-9 digits, which could not be compared with the facts file. |

Accepting non-ASCII digits does not add font glyphs: the bundled Inter fonts are unchanged. Inspect the PNGs for glyphs your content needs, as well as layout.

Every other rule, the schema, limits (3 to 10 slides, `source` up to 80 characters, and so on), themes, formats and legibility behavior are the same. `source` stays an optional string footer credit. It is your own text and is not verified.

### Exit codes

The table is unchanged: 0 ok, 1 validation error, 2 arguments or unreadable file or path, 3 render, pdf or write failure (`text-overflow` needs shorter text), 4 container could not start. Docker's own runtime errors may surface with Docker's exit code (such as 125); use `docker info`. No `carousel.pdf` is written when a render with validly parsed input fails. Older PNGs from other runs in a reused output folder are not removed, so use a new folder per carousel.

### TypeScript API (source-level break)

`validate(deck)` and `parseAndValidate(text)` no longer take a facts parameter. Code that imports them directly must drop that argument. The package is private and not published, so this only affects people importing from the source tree.

### Responsibility

The tool does not certify that content is true. Review the content before publishing.

## Português

A versão do plugin passou de 1.0.0 para 1.1.0. O produto agora é: conteúdo preparado pelo usuário para PDF e PNG locais, só com validação técnica. A versão do `package.json` (privado, `0.1.0`) não mudou.

O contrato anterior 1.0.0 exigia números conferidos contra fatos. As especificações internas ficam apenas localmente, fora da árvore pública. Este documento e o [README](../README.md) são o contrato atual.

### O que mudou

| Antes (1.0.0) | Agora (1.1.0) |
| ------------- | ------------- |
| `--facts <arquivo>` era usado e o arquivo era lido | `--facts <arquivo>` é aceito com aviso; o valor é ignorado e nenhum número é conferido. Nenhum arquivo é lido, consultado nem montado. Previsto: rejeitado na 2.0.0. |
| Arquivo de fatos com trechos e links era necessário em carrosséis reais | Não é preciso fatos, fontes nem citações. |
| Números dos slides eram comparados com o arquivo de fatos | Sem comparação numérica. |
| `examples/facts.md` | Removido. |
| `validate` com sucesso não imprimia nada | `ok: N slides passed technical validation` |
| `render` imprimia `slide i/n` | Também imprime a quantidade de PNGs criados e `carousel.pdf`, uma nota curta de revisão antes de publicar, e o wrapper imprime o caminho absoluto da saída. |
| `--facts` sem valor | Sem valor, ou outra opção como valor: código de saída 2. |

O wrapper escreve o aviso de descontinuação em stderr; o CLI TypeScript direto escreve em stdout. Ele aparece uma vez por execução, mesmo se a opção for repetida.

`--out` agora rejeita outra opção como valor do diretório (código 2). Para usar uma pasta cujo nome começa com `--`, acrescente `./`, como em `--out ./--rascunho`.

Comandos normais omitem `--facts`:

```
scripts/carousel.sh validate slides.json
scripts/carousel.sh render slides.json --out out/meu-carrossel
```

### Regras removidas do validador

| Regra | O que fazia |
| ----- | ----------- |
| `number-not-in-facts` | Reprovava número fora de `source` que não estava no arquivo de fatos. |
| `facts-skipped` | Avisava quando havia números mas não havia `--facts`. |
| `non-ascii-digit` | Reprovava dígitos fora de 0 a 9, que não dava para comparar com o arquivo de fatos. |

Aceitar dígitos fora de ASCII não acrescenta glifos às fontes: os arquivos locais de Inter não mudaram. Confira nos PNGs os glifos exigidos pelo conteúdo, além do layout.

Todas as outras regras, o schema, os limites (3 a 10 slides, `source` até 80 caracteres e assim por diante), temas, formatos e legibilidade continuam iguais. `source` segue como crédito opcional de rodapé, texto seu e sem verificação.

### Códigos de saída

A tabela não mudou: 0 ok, 1 erro de validação, 2 argumentos ou arquivo ou caminho ilegível, 3 falha de render, pdf ou escrita (`text-overflow` exige texto mais curto), 4 container não iniciou. Erros do Docker em tempo de execução podem aparecer com o código do próprio Docker (como 125); use `docker info`. Nenhum `carousel.pdf` é gravado quando um render com entrada válida falha. PNGs antigos de outras execuções numa pasta reaproveitada não são removidos: use uma pasta nova por carrossel.

### API TypeScript (quebra no nível do código)

`validate(deck)` e `parseAndValidate(text)` não recebem mais o parâmetro de fatos. Quem importa essas funções diretamente deve remover o argumento. O pacote é privado e não é publicado, então só afeta quem importa da árvore de código-fonte.

### Responsabilidade

A ferramenta não certifica que o conteúdo é verdadeiro. Revise o conteúdo antes de publicar.
