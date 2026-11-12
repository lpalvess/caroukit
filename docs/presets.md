# Presets / presets de saída

Checked / consultado: 2026-11-12. These sources describe different products and upload paths. CarouKit generates local PNGs and image-based PDFs; it does not upload anything.

| Preset | Canvas and intended use | Documented scope |
| --- | --- | --- |
| `instagram` | 1080×1350 PNG sequence | Within the manual photo-upload width/aspect ranges documented by Instagram. PNG acceptance, carousel crops and actual uploads were not tested. |
| `tiktok` | 720×1280 PNG sequence | Product layout choice, referencing official **Carousel Ads** image dimensions. Advertising requirements do not establish organic-photo compatibility. |
| `linkedin` | 1080×1350 PDF | PDF is supported; page size is a product choice. CarouKit checks the PDF is at most 100,000,000 bytes; its 3–10 page decks are below the documented 300-page ceiling. |
| `generic` | Default 1080×1080, custom with `--size WIDTHxHEIGHT` | Internal resource and layout bounds only. |

All presets generate PNGs **and** PDF. Use the sequence for photos/carousels or the PDF for a document. `validate` checks input structure and output options; `render` additionally checks estimated text fit and creates the files. Inspect every PNG before using the export.

## Official sources and limits

- [Instagram photo resolution](https://help.instagram.com/1631821640426723): manual uploads retain widths from 320 to 1080 px within aspect ratios 1.91:1 through 3:4. The reused 1080×1350 canvas falls within that range.
- [TikTok Carousel Ads specifications](https://ads.tiktok.com/resources/help/article/specifications-for-carousel-ads?lang=pt): lists 720×1280 as a vertical image format. This is the source for the layout reference, **not an organic-post requirement**. The [organic posting help](https://support.tiktok.com/en/using-tiktok/creating-videos/making-a-post) could not be retrieved during this review; no organic pixel or file-size limit is claimed.
- [TikTok Content Posting API media guide](https://developers.tiktok.com/docs/en/content-posting-api-media-transfer-guide): its photo API accepts JPEG/WebP. CarouKit emits PNG and therefore does **not** claim compatibility with that API. No API integration is included.
- [LinkedIn document FAQ](https://www.linkedin.com/help/linkedin/answer/a523054/document-uploads-on-linkedin-faq?lang=en): supports PDF, at most 100 MB and 300 pages; it does not mandate this pixel size.

Context7 was consulted first for platform APIs. It covered developer APIs, not all manual-upload rules; official help pages were then consulted directly. API limits were not substituted for app-upload rules. These references can change; this is a dated, partial requirements comparison, not a platform certification.

## Three distinct evidence levels

1. **Generated correctly:** tests can verify PNG dimensions, PDF pages, technical validation, deterministic bytes and isolation. Current results: [verification](verification-caroukit.md).
2. **Documented requirements:** the table above states what the official sources actually support and the gaps. Instagram dimensions and LinkedIn PDF constraints are checked; TikTok organic compatibility remains unverified.
3. **Published successfully:** **not tested on any platform**. No accounts were connected and no content was posted. Confirm acceptance and visual appearance in your intended workflow before publishing.

## Português

Conteúdo é o JSON dos slides; layout são os temas e templates; preset é a escolha de saída pela CLI. O render recompõe os slides na dimensão final, recalculando tipografia e quebras, sem esticar imagens. Todos os presets geram PNGs e PDF; a coluna de uso indica o arquivo principal.

As fontes acima não são intercambiáveis: a ajuda do Instagram trata de fotos no app; a referência 720×1280 do TikTok é de **anúncios**, não prova requisitos de fotos orgânicas. O guia de API do TikTok aceita JPEG/WebP e não estabelece compatibilidade para os PNGs deste projeto. O LinkedIn aceita PDF até 100 MB e 300 páginas, sem exigir a dimensão escolhida aqui. Nenhuma publicação real foi testada.

Limites internos do CarouKit: 3–10 slides; lados inteiros entre 540 e 2160 px; até 2.500.000 pixels por slide; proporção de 1:2 a 2:1. Esses limites protegem recursos e composição no container de 1 GiB; não são requisitos das redes. Um texto pode não caber mesmo em um canvas permitido: nesse caso, encurte-o. Confira todos os PNGs. Revise o conteúdo antes de publicar.

Compatibilidade: sem flags, `meta.format` continua aceitando `linkedin-square` e `linkedin-portrait`. Um `--preset` explícito vence o formato legado. `--size` sozinho implica `generic`; dimensões personalizadas com presets de plataforma são rejeitadas, assim como `--preset`/`--size` repetidos ou tamanhos inválidos.
