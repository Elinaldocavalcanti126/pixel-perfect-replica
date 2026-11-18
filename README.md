# Arcana Rift

Arcana Rift é um MOBA 5v5 original em 3D que roda no navegador. Esta versão inclui partidas locais contra bots, quatro heróis jogáveis, três rotas com selva central, torres com progressão de objetivos, habilidades, itens, visão de mapa, HUD responsiva, tutorial básico e tela de resultado.

## Executar localmente

Requisitos: Node.js 20 ou superior e npm.

```sh
npm install
npm run dev
```

Abra o endereço local informado pelo Vite. Para gerar e visualizar a compilação de produção:

```sh
npm run build
npm run preview
```

O jogo e seus modelos de personagem funcionam sem serviços externos. Para ativar integrações opcionais, copie `.env.example` para `.env` e preencha apenas as chaves dos serviços que você configurou. Nunca coloque uma chave privada `SERVICE_ROLE` ou de IA no código do navegador.

## Controles

- **Mouse:** botão direito move ou seleciona um alvo. Q/W/E/R escolhem habilidades; clique esquerdo confirma a mira. Scroll ajusta a câmera.
- **Teclado:** P abre o mercado, Tab mostra o placar, Espaço recentraliza a câmera e Esc pausa.
- **Toque:** use o direcional à esquerda para mover. Arraste uma habilidade para mirar e solte para lançar. O botão de ataque procura um alvo próximo.

## Estrutura

- `src/game`: simulação, heróis, itens, mapa, bots e sistemas de combate.
- `src/components/game`: cena 3D, terreno, unidades e efeitos visuais.
- `src/components/hud`: interface da partida, controles e minimapa.
- `public/models/heroes`: modelos incluídos no projeto para carregar localmente.
- `src/routes/index.tsx`: lobby, seleção de herói e entrada na partida.

## Referências de desenvolvimento

O código e os recursos oficiais de Heroes Evolved não foram encontrados publicados como repositório aberto. O projeto usa referências de gênero e protótipos open source para estudar sistemas; a identidade visual, o código e os personagens de Arcana Rift são próprios. Consulte as licenças de cada referência antes de reutilizar qualquer código ou recurso.

Os modelos dos personagens vêm do KayKit Character Pack: Adventurers, de Kay Lousberg, sob licença CC0 1.0. A origem e os detalhes estão em `src/assets/heroes/LICENSE.md`.

## Estado desta versão

As partidas são locais e contra bots. O guia interativo cobre movimento, ataque e habilidade básica, mas ainda não ensina todos os sistemas do MOBA. Ainda não há partidas entre jogadores, matchmaking, contas persistentes, progressão entre partidas ou skins. O conselho tático por IA é opcional e depende de uma chave configurada apenas no servidor.
