
<div align="center">

  # 🏆 HUB-PT
  ### O Hub Definitivo de Valorant para Portugal

  <p>
    <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" />
    <img src="https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css" />
    <img src="https://img.shields.io/badge/Valorant-Theme-ff4655?style=for-the-badge&logo=riot-games" />
  </p>

  <p align="center">
    Um sistema de matchmaking high-end, futurista e competitivo. <br/>
    Drafte jogadores, bana mapas, suba de elo e complete missões.
  </p>

  <br/>

  <!-- SUBSTITUA ESTE LINK POR UM PRINT DO SEU LOBBY/QUEUE -->
  <img src="https://media.valorant-api.com/maps/7eaecc1b-4337-bbf6-6ab9-04b8f06b3319/splash.png" alt="HUB-PT Lobby Preview" width="100%" style="border-radius: 10px; border: 2px solid #333;">

</div>

---

## ✨ Funcionalidades Principais

O **HUB-PT** não é apenas uma fila. É uma experiência completa de simulação profissional de Valorant (estilo Faceit/Premier).

### 🎮 Matchmaking & Lobby
*   **Fila Automática:** Sistema de Queue para 10 jogadores.
*   **Ready Check:** Confirmação de presença com efeitos sonoros e visuais.
*   **Algoritmo de Balanceamento:** (Simulado) Gera bots se não houver jogadores suficientes para testes.

### ⚔️ Draft & Veto (Capitães)
*   **Pick de Jogadores:** Os dois jogadores com maior MMR tornam-se capitães.
*   **Sistema 1-2-2-2-1:** Escolha alternada de equipas.
*   **Veto de Mapas:** Bane mapas interativamente até restar apenas um.
*   **Chat em Tempo Real:** Discuta estratégias ou envie o código da party no chat fixo à direita.

### 📈 Progressão & RPG
*   **Ranked System:** De **Iron** a **Radiant** baseado em MMR.
*   **Níveis e XP:** Ganhe XP jogando, vencendo e completando missões.
*   **Quests Diárias e Mensais:** Desafios rotativos (ex: "Joga 3 partidas", "Dá 5 commends").
*   **Badges:** Conquistas visuais no perfil (ex: "Veteran", "On Fire", "High Roller").

### 🤝 Social & Perfil
*   **Perfis Detalhados:** Histórico de partidas, agentes favoritos e estatísticas de mapas.
*   **Sistema de Amigos:** Adicione amigos para ver o status e perfis.
*   **Reputação:** Sistema de "Commend" e "Report" após as partidas.

---

## 📸 Galeria do Sistema

> **Nota:** Para o projeto brilhar, substitua os links abaixo por prints reais da sua aplicação a correr!

| Draft Phase | Map Veto |
|:-----------:|:--------:|
| *Capitães a escolher equipas* | *Animação de banir mapas* |
| <img src="https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e3b8db388e27/fullportrait.png" width="400" /> | <img src="https://media.valorant-api.com/maps/d960549e-485c-e861-8d71-aa9d1aed12a2/splash.png" width="400" /> |

| Live Match | Victory Screen |
|:----------:|:--------------:|
| *Interface da partida a decorrer* | *Ecrã final de Vitória/Derrota* |
| <img src="https://media.valorant-api.com/maps/2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba/splash.png" width="400" /> | <img src="https://media.valorant-api.com/agents/a3bf58c7-4430-eee7-380a-fd8bdf520b77/fullportrait.png" width="400" /> |

---

## 🚀 Como Correr o Projeto

Este projeto utiliza **React** com **Vite** (ou Create React App) e **Tailwind CSS**.

### Pré-requisitos
*   Node.js (v16 ou superior)
*   NPM ou Yarn

### Instalação

1.  **Clonar o repositório**
    ```bash
    git clone https://github.com/seu-usuario/hub-pt.git
    cd hub-pt
    ```

2.  **Instalar dependências**
    ```bash
    npm install
    # ou
    yarn install
    ```

3.  **Correr o servidor local**
    ```bash
    npm start
    # ou
    npm run dev
    ```

4.  Abra `http://localhost:3000` (ou a porta indicada) no seu browser.

---

## 🛠️ Tecnologias Usadas

*   **Frontend:** React 19, TypeScript
*   **Estilos:** Tailwind CSS (Custom Config com cores do Valorant)
*   **Ícones:** Lucide React
*   **State Management:** React Context API
*   **Fontes:** Inter & Space Grotesk (Estética Sci-Fi)

---

## 📝 Roadmap

- [x] Sistema de Fila e Draft
- [x] Chat em Tempo Real (Lobby)
- [x] Perfis de Jogador e Estatísticas
- [x] Quests e Badges
- [ ] Integração com Riot API (Futuro)
- [ ] Torneios Automatizados

---

<div align="center">
  <p>Feito com ❤️ para a comunidade PT de Valorant</p>
  <p><sub>Design inspirado na UI oficial do Valorant</sub></p>
</div>
