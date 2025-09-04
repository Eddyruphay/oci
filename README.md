# 4Reels: O Bot de Conteúdo Adulto para WhatsApp (Modo Alienígena)

## Introdução

O 4Reels é um projeto inovador focado na criação de um bot de WhatsApp para distribuição automatizada de conteúdo adulto. Seu objetivo principal é gerar receita para o projeto ARORA, operando sob a filosofia de desenvolvimento **"Modo Alienígena"**: focado, inovador, autônomo e implacável. Utilizamos o Baileys para a interação com grupos de WhatsApp e planejamos a integração com a API oficial do WhatsApp para um futuro serviço VIP.

## Filosofia Central: Modo Alienígena

Nossa abordagem é construir sistemas que operam de forma autônoma, inteligente e eficiente, minimizando a intervenção humana e maximizando os resultados. Cada componente é especializado e otimizado para sua função, garantindo escalabilidade e resiliência.

## Arquitetura Completa

A arquitetura do 4Reels é um ecossistema de Workers e storages da Cloudflare, projetado para automação completa do ciclo de vida do conteúdo, desde a prospecção até a entrega.

### 🔄 Fluxo Épico do Conteúdo

`WhatsApp` → `Baileys (Lander)` → `R2 Object Storage` → `Workers (scraping + IA)` → `KV (links + users)` → `GitHub Actions` → `Lander (envio)` → `R2 (logs)`

### 🤖 Workers Especializados

Cada Worker tem uma missão específica, operando de forma independente e colaborativa:

1.  **Hunter Worker 🎯 (Caçador de Conteúdo)**
    *   **Função:** Realiza web scraping mundial para encontrar conteúdo de vídeo. Utiliza táticas de **"Fantasma na Rede"** (camuflagem de headers, gerenciamento de cookies persistente) para evitar detecção. Emprega o **`HTMLRewriter`** nativo da Cloudflare para parsing eficiente de HTML.
    *   **Validação:** Inclui lógica para validação e verificação de qualidade do conteúdo.
    *   **Armazenamento:** Salva os links de vídeo processados no `HUNTER_KV`.

2.  **Brain Worker 🧠 (Inteligência Artificial e Personalização)**
    *   **Função:** Analisa mensagens e interações dos usuários (futuro). Personaliza o algoritmo de busca do Hunter e ajusta seus parâmetros com base no aprendizado de máquina dos gostos dos usuários.
    *   **Armazenamento:** Utiliza o `BRAIN_KV` para cache de preferências e aprendizados.

3.  **Grim Reaper Worker ☠️ (Gestão de Usuários Freemium)**
    *   **Função:** Monitora usuários freemium (período de teste de 7 dias). No dia 6, envia um aviso de expiração. No dia 7, remove o usuário se não houver conversão para o plano pago, limpando seus dados.
    *   **Armazenamento:** Gerencia usuários freemium e suas expirações no `REAPER_KV`.

### 💾 Storages

Escolhas estratégicas de armazenamento para otimizar custo e performance:

*   **R2 Object Storage:**
    *   Armazena mensagens brutas recebidas pelo Baileys.
    *   Guarda logs finais de entrega de conteúdo e dados de auditoria.
*   **KV Storage (Key-Value Store):**
    *   **`HUNTER_KV`:** Links de vídeo processados e prontos para envio (com TTL automático para limpeza).
    *   **`REAPER_KV`:** Dados de usuários freemium e suas datas de expiração.
    *   **`BRAIN_KV`:** Cache de preferências de IA e dados de aprendizado.
*   **D1 (Database):**
    *   Armazena usuários pagos permanentes.
    *   Guarda configurações globais do sistema, analytics e métricas.

### ⚡ Actions "Ghost Protocol"

Um sistema de entrega de conteúdo agendado e furtivo:

*   **Função:** Acorda em um cronograma programado (via GitHub Actions).
*   **Operação:** Varre o `HUNTER_KV` por links de vídeo prontos, baixa o conteúdo, converte-o para o formato de reels, envia via `Lander` (Baileys) para os grupos de WhatsApp, registra a entrega no `R2` e, em seguida, "desaparece sem rastros".

## 🔥 Vantagens da Arquitetura

*   **Escalável:** Cada Worker é independente, permitindo escalabilidade granular.
*   **Inteligente:** A IA do Brain Worker aprende e personaliza a experiência.
*   **Limpo:** O uso estratégico de TTL no KV garante autolimpeza de dados efêmeros.
*   **Monetizado:** Projetado desde o início para converter usuários freemium em pagantes, garantindo a sustentabilidade do projeto.

## Configuração Inicial

Para configurar o ambiente e implantar os Workers, certifique-se de que suas credenciais da Cloudflare (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) estejam configuradas no arquivo `.env` na raiz do projeto. As dependências são gerenciadas via `npm` e os Workers são implantados usando `wrangler`.

<!-- Triggered by Gemini CLI for workflow testing -->