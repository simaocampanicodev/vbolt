# Companion App Context

## Firebase Collections
- users/{uid}: points, wins, losses, riotId, riotTag
- active_matches/{id}: matchState, teamA, teamB, playerReports
- Estrutura do matchState: ver types.ts

## O que a companion app deve fazer
1. Ler lockfile do Valorant em %LocalAppData%
2. Polling da Local API a cada 2s
3. Cruzar riotId do utilizador com o match ativo no Firebase
4. Atualizar active_matches/{id} com: currentRound, kills, map, winner
5. Quando jogo termina: reportar resultado automaticamente

## Firebase Config
(copiar do firebase.ts)

## Tipos relevantes
(copiar de types.ts os tipos User, MatchState, etc)


---

Passo 2 — Prompt inicial para a AI
Tenho um site de hub de Valorant cujo código está neste projeto.
Preciso criar uma Electron companion app em /companion-app que:

1. Deteta quando o Valorant está aberto (lendo o lockfile)
2. Faz polling à Local Game API do Valorant (localhost)
3. Usa o Firebase do projeto (ver firebase.ts) para:
   - Encontrar o match ativo onde o utilizador está
   - Atualizar em tempo real: round, kills, deaths, assists, mapa
   - Quando o jogo termina, reportar o resultado automaticamente

Após isso, eu quero que atualize o MatchInterface para que atualize automaticamente o round, kills, deaths, assists, mapa, agente, vencedor do jogo, fazendo com que não seja necessário a verificação manual de 3 utilizadores, pois usará a API local do Valorant para obter essas informações.

O utilizador já tem riotId e riotTag guardados no Firestore.
Usa os mesmos tipos TypeScript do projeto principal.

Começa por criar a estrutura base da app Electron.