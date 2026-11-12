# Privacy policy / Política de privacidade

Last updated / Última atualização: 2026-11-12

## English

CarouKit runs on your machine. It has no server, no account and no telemetry.

- **What it reads:** only the `slides.json` file you pass to it. (The legacy `--facts <file>` option is accepted with a warning, but the file is never read, checked or mounted.)
- **What it writes:** PNG images and `carousel.pdf`, only in the output folder you choose.
- **Network:** validating and rendering run in a Docker container started with `--network none`, so your text does not leave your machine through this project's code. The only step with network access is `setup`, which downloads the Docker image and the npm packages pinned in `bun.lock`. No data of yours is sent in that step.
- **Claude Code plugin and agent (separate from the offline runtime):** installing the plugin uses the provider's network; Claude Code can also install the pinned packages when Bun is available. When you use the project through the Claude agent, what you share in the conversation (such as your slide text) may be sent to Claude under Anthropic's own policies. This project does not control that, so the whole flow with the agent is not offline.
- **Personal data:** the project does not collect, store or send personal data. It does not keep anything after the command ends, apart from the files it writes to your output folder. Source or author credits you type into slides are your own text and are drawn as written.

Claude Code, Anthropic and Docker have their own privacy policies, which this project does not control.

## Português

O CarouKit roda na sua máquina. Não tem servidor, conta nem telemetria.

- **O que lê:** só o arquivo `slides.json` que você passa. (A opção legada `--facts <arquivo>` é aceita com um aviso, mas o arquivo nunca é lido, conferido nem montado.)
- **O que grava:** imagens PNG e `carousel.pdf`, só na pasta de saída que você escolher.
- **Rede:** validar e gerar rodam num container Docker iniciado com `--network none`, então seu texto não sai da sua máquina pelo código deste projeto. O único passo com rede é o `setup`, que baixa a imagem Docker e os pacotes npm fixados no `bun.lock`. Nenhum dado seu é enviado nesse passo.
- **Plugin e agente do Claude Code (separado da execução offline):** instalar o plugin usa a rede do provedor; o Claude Code também pode instalar os pacotes fixados quando o Bun está disponível. Ao usar o projeto pelo agente Claude, o que você compartilha na conversa (como o texto dos slides) pode ser enviado ao Claude, sob as políticas da Anthropic. O projeto não controla isso, então o fluxo completo com o agente não é offline.
- **Dados pessoais:** o projeto não coleta, não guarda e não envia dados pessoais. Não mantém nada depois que o comando termina, além dos arquivos que grava na sua pasta de saída. Créditos de fonte ou autoria que você digitar nos slides são texto seu e são desenhados como escritos.

O Claude Code, a Anthropic e o Docker têm suas próprias políticas de privacidade, que este projeto não controla.
