# 🦦 Capybara-FI | SocialFi & Creator Economy (Hackathon MVP)

![Monad](https://img.shields.io/badge/Monad-Testnet-8B5CF6?style=for-the-badge)
![Web3](https://img.shields.io/badge/Web3-Viem.sh-FACC15?style=for-the-badge)
![Frontend](https://img.shields.io/badge/Frontend-Vanilla_JS-374151?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Proof_of_Concept-059669?style=for-the-badge)

**Capybara-FI** é uma Rede Social Descentralizada (DeSoc) focada na *Creator Economy*. Desenvolvido durante um Hackathon focado no ecossistema **Monad**, o projeto explora como microtransações de alta frequência podem substituir o modelo tradicional de anúncios e assinaturas.

O objetivo da plataforma é permitir que criadores publiquem conteúdos exclusivos (bloqueados por um Paywall on-chain) e que os consumidores sejam recompensados financeiramente por avaliar e curar esse conteúdo (modelo *Proof-of-Brain*).

---

## 🛠️ O que está implementado neste repositório (MVP Atual)

Este repositório contém a aplicação Frontend (Single Page Application) que valida o fluxo de usuário e a integração Web3. **Atualmente, o código demonstra:**

1. **Integração Web3 Real (Viem + Monad):**
   - Conexão de carteira (MetaMask) via injetor `window.ethereum`.
   - Execução de transações reais na Monad Testnet para desbloquear o Paywall (pagamento de 0.01 MON).
   - Medição real do tempo de finalidade da transação (benchmark de latência) e custo de Gas diretamente do recibo do bloco.
2. **Navegação SPA e UI/UX:**
   - Interface completa com abas de Feed, Modo Criador e Modo Leitor.
   - Ofuscação de conteúdo no frontend (efeito Blur e encriptação Base64 via URL parameters).
3. **Simulação da Arquitetura de IA (Failover Mocking):**
   - Para demonstrar o fluxo planejado sem a necessidade de um backend pesado durante o hackathon, a comunicação com as IAs foi simulada.
   - O código utiliza uma função interceptadora (`apiFetch`) que simula o tempo de resposta e retorna a estrutura de dados exata (JSON) que um backend futuro deverá prover.

---

## 🧠 A Visão do Produto (Arquitetura Planejada)

O Capybara-FI foi desenhado para resolver o problema do *Spam* na Web3 e garantir qualidade através de uma **Pipeline de Consenso de IA**. Embora simulada neste frontend, a arquitetura de backend prevista orquestra 3 agentes de Inteligência Artificial:

- **🧐 Agente 1 (Curador de Qualidade):** Analisa a coesão e a originalidade do texto.
- **🛡️ Agente 2 (Moderador de Segurança):** Varre o conteúdo em busca de violações de compliance, links de phishing ou spam.
- **⚖️ Agente 3 (Juiz de Consenso):** Avalia as notas dos Agentes 1 e 2. Se o conteúdo for aprovado, ele autoriza a criptografia e a geração do link pagável.

A lógica é que o conteúdo só ganhe o "Selo de Verificado" e seja monetizado se passar por essa esteira autônoma.

---

## ⚡ Por que Monad?

A escolha da Monad Testnet para este MVP não foi por acaso. O modelo de negócios do Capybara-FI depende de **Micro-Royalties**:

1. **Taxas vs. Micro-pagamentos:** Se um usuário paga $0.10 para ler um artigo e ganha $0.01 por avaliá-lo, as taxas de Gas da rede Ethereum (frequentemente acima de dólares) inviabilizam o negócio. A Monad permite taxas de frações de centavo.
2. **Finalidade Rápida:** O bloqueio e desbloqueio do Paywall ocorre em cerca de 1 segundo na Monad, mantendo a retenção do usuário idêntica à fluidez da Web2.
3. **Execução Paralela:** Garante que milhares de micro-interações (likes pagos, desbloqueios) ocorram simultaneamente sem congestionar a rede.

---

## 🚀 Como rodar localmente

Por ser um MVP focado no frontend e interações Web3 client-side, a execução é extremamente leve (sem dependências como `npm install`):

1. Clone o repositório:
   ```bash
   git clone [https://github.com/SeuUsuario/capybara-fi.git](https://github.com/SeuUsuario/capybara-fi.git)
   
