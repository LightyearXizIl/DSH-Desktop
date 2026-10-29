<h1 align="center">
  <img src="docs/images/readme-logo-black-rounded.svg" width="64" alt="Logotipo do DSH Desktop" valign="middle" />
  DSH Desktop
</h1>

<p align="center">
  <strong>DSH Desktop</strong> é um cliente de desktop comunitário do DeepSeek Harness para Windows, desenvolvido e mantido de forma independente por NullPointer.<br />
  Repositório de código aberto: <a href="https://github.com/LightyearXizIl/DSH-Desktop">LightyearXizIl/DSH-Desktop</a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ru.md">Русский</a> · <a href="README.es.md">Español</a> · <a href="README.pt.md">Português</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-171513.svg" /></a>
  <img alt="Windows" src="https://img.shields.io/badge/Windows-x64-171513.svg" />
</p>

<p align="center"><strong>Use os modelos oficiais da DeepSeek ou provedores externos populares, gerencie Agent Presets portáteis, continue sessões do Harness pelo celular e transforme seus materiais em apresentações PPTX editáveis.</strong></p>

O DSH Desktop empacota o DeepSeek Harness local como um aplicativo de desktop instalável. Ele inicia o Harness automaticamente, guarda perfis, plugins, espaços de trabalho, configurações de modelos e sessões fora do diretório de instalação e abre a interface completa do Harness assim que o runtime local fica pronto.

> [!IMPORTANT]
> O DSH Desktop é uma versão inicial baseada no `@deepseek-ai/dsh@0.2.1-rc.4`, que evolui rapidamente. O instalador para Windows x64 é uma compilação comunitária sem assinatura, por isso o Windows SmartScreen pode exibir um aviso na primeira execução. Este projeto não é um produto oficial da DeepSeek.

## Download

Baixe o `dsh-desktop-windows-x64-setup.exe` mais recente em [GitHub Releases](https://github.com/LightyearXizIl/DSH-Desktop/releases). As versões marcadas como **Pre-release** são para quem quer testar novidades e podem ser incompatíveis com alguns plugins da comunidade.

O aplicativo instalado procura atualizações no GitHub Releases logo após a inicialização e a cada seis horas. Quando há uma nova versão, o DSH Desktop pergunta primeiro e mostra o registro de alterações dessa versão; o download só começa se você concordar, e a instalação só começa quando você escolhe **Reiniciar e instalar**. Você também pode verificar manualmente em **Configurações → Sobre** ou pular uma versão sem ocultar as próximas.

## O que o DSH Desktop acrescenta

O DeepSeek Harness já oferece um runtime de agentes e uma interface web. O DSH Desktop acrescenta os recursos de um aplicativo de desktop:

- Inicia e encerra o Harness automaticamente, sem abrir uma CLI ou uma aba do navegador
- Adiciona e gerencia espaços de trabalho de projetos pelo seletor de pastas nativo
- Oferece suporte aos modelos oficiais da DeepSeek e aos principais provedores de modelos externos
- Importa e exporta Agent Presets personalizados como [arquivos `.dshpreset`](docs/preset-packages.md) portáteis, verificando conflitos de nome e alertando sobre confiança antes de instalar
- Gera apresentações PPTX editáveis a partir dos seus materiais com o modo PPT integrado
- Inclui Python e bibliotecas do Office para criar e verificar DOCX, PPTX e XLSX offline
- Mantém perfis, plugins, espaços de trabalho, sessões e configurações de modelos ao atualizar o aplicativo
- Detecta falhas na inicialização do Harness ou em plugins do frontend, grava o diagnóstico em `harness.log` e oferece recuperação guiada
- Oferece um modo de segurança que bloqueia temporariamente os plugins de terceiros sem danificar os dados do usuário
- Permite que um celular pareado continue as sessões pela rede local ou por um túnel público temporário opcional
- Inclui o tema Liquid Glass (modos Mica e de compatibilidade), uma animação de inicialização e a inicialização automática opcional de um modelo local
- Verifica atualizações do desktop dentro do aplicativo e deixa você decidir se quer baixá-las e instalá-las

## Criação de PPT

Clique em **PPT**, escolha um modelo e descreva o que deseja. O catálogo integrado tem **16 modelos e 192 layouts** e gera arquivos PPTX editáveis. As prévias dos modelos aparecem em inglês; o conteúdo pode ser gerado em chinês ou em inglês com as configurações de fonte correspondentes, e o idioma da prévia não define o idioma do resultado.

O recurso PPT vem pré-instalado, e suas instruções automáticas só valem nas sessões em que o botão PPT está selecionado. Modelos, validações e fontes de referência estão descritos nas [notas de PPT](packages/ppt-runtime/README.md).

## Acesso pelo celular

Escolha **Conectar celular…** no menu `Harness` e leia o QR code de pareamento.

- No Wi-Fi, basta ler o código para conectar.
- Em um túnel de Internet, também é preciso digitar a senha de 6 dígitos exibida no computador. Por padrão, é uma senha temporária de 5 minutos mantida apenas na memória; uma senha permanente só é gerada neste computador se você concordar na janela **Conectar celular**.

O Harness sempre roda em uma porta aleatória de `127.0.0.1`; o acesso pelo celular passa por uma ponte de pareamento separada. O Cloudflare Quick Tunnel é o caminho habitual para conexões longas. O Pinggy gratuito é a alternativa quando o Cloudflare não está disponível (por exemplo, na China continental) e expira em cerca de 60 minutos. Quando o desktop se desconecta, a sessão do celular termina.

Se o Cloudflare não iniciar, o Pinggy é tentado. Se o link do Cloudflare estiver visível, mas o celular não conseguir abri-lo, toque em **Não abre? Tentar outra linha** para mudar para o Pinggy.

## Modo de segurança e recuperação

Se um plugin de terceiros impedir a inicialização ou a renderização, o DSH Desktop combina as informações do runtime e do frontend para identificar o plugin e abre uma página de recuperação guiada.

Escolha **Reiniciar no modo de segurança…** no menu `Harness` para iniciar um perfil isolado que contém apenas os Bundles oficiais do núcleo. Os plugins de terceiros do perfil normal ficam bloqueados, mas agentes, sessões, configurações de modelos e espaços de trabalho continuam disponíveis. No aviso do modo de segurança, você pode desinstalar o plugin selecionado ou voltar à inicialização normal. A página de recuperação também procura atualizações compatíveis dos plugins, e o modo de segurança permite atualizá-los em lote.

Se a interface normal não abrir, também é possível iniciar com `--safe-mode`, por exemplo no PowerShell:

```powershell
& "$env:LOCALAPPDATA\Programs\DSH Desktop\DSH Desktop.exe" --safe-mode
```

(Substitua o caminho se você instalou em outra pasta.)

## Dados locais e segurança

- A interface web do Harness roda apenas em uma porta de loopback aleatória.
- O renderer não tem acesso ao Node.js e roda com Context Isolation e Sandbox.
- WebViews, navegação interna não confiável e pedidos de permissão inesperados são bloqueados.
- Links web externos abrem no navegador do sistema.
- Perfis e sessões ficam no diretório de dados de aplicativo por usuário do Electron, e não no diretório de instalação.
- O acesso pelo celular exige um token de pareamento de curta duração. No Wi-Fi basta ler o código; em um túnel de Internet também é necessária a senha exibida no computador.

## Plataformas compatíveis

| Plataforma | Formato | Status |
| --- | --- | --- |
| Windows x64 | Instalador NSIS sem assinatura | Compatível |
| macOS | Os scripts de compilação estão no código, mas não há instaladores publicados | Não publicado |
| Windows ARM64 / Linux | — | Sem suporte no momento |

O Harness inclui dependências nativas de cada plataforma, por isso cada instalador precisa ser compilado no sistema operacional e na arquitetura de destino.

## Desenvolvimento e arquitetura

A documentação do projeto começa no [índice de documentação](docs/README.md). As mais usadas:

- [Guia de desenvolvimento](docs/development.md) — ambiente local, validação, manutenção de patches e empacotamento nativo
- [Arquitetura](docs/architecture.md) — inicialização, dados persistentes, limites de segurança, recuperação, acesso pelo celular e atualizações
- [Procedimento de publicação](docs/release-runbook.md) — números de versão, empacotamento e publicação no GitHub Release
- [Pacotes de Preset](docs/preset-packages.md) — o contrato dos Agent Presets portáteis

Antes de enviar uma alteração, execute `npm test`, `npm run typecheck` e `npm run build` e teste o fluxo afetado no aplicativo. Nunca inclua chaves de API reais em issues, logs, capturas de tela ou dados de teste.

## Projetos relacionados

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — o framework de agentes oficial da DeepSeek, de onde vêm o runtime e a interface web deste aplicativo.
- [dsh-market](https://github.com/dsh-market/dsh-market) — o mercado comunitário de plugins do DeepSeek Harness para explorar, instalar e atualizar plugins dentro do Harness.

## Licença

O DSH Desktop é de código aberto sob a [licença MIT](LICENSE).

O DeepSeek Harness e suas dependências continuam sujeitos às próprias licenças e regras de marca. O DSH Desktop é um aplicativo de desktop comunitário independente e não tem vínculo com a DeepSeek.
