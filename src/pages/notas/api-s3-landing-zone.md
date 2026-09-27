---
layout: ../../layouts/BaseLayout.astro
title: "Da API pública ao S3: uma landing zone idempotente"
description: Decisões e evidências por trás de uma ingestão de API paginada para Amazon S3.
---

<article class="article container narrow">
  <p class="article-meta">PROJETO · 7 MIN DE LEITURA</p>

  # Da API pública ao S3: uma landing zone idempotente

  > 🎯 **Pergunta que orientou o projeto:** como preservar dados de uma API externa para que uma falha, uma mudança na fonte ou uma regra nova possam ser investigadas e reprocessadas com segurança?

  Uma landing zone é a camada em que o dado chega antes de receber regras de negócio, modelos ou agregações. Neste projeto, construí uma ingestão pequena e verificável: consumir uma API pública paginada e preservar a resposta bruta no Amazon S3.

  🔗 [Acesse o repositório do projeto](https://github.com/brunomartins94/public-api-s3-landing).

  ---

  ## 🧩 A necessidade operacional

  Pense em uma empresa que recebe catálogo, disponibilidade ou pedidos de um parceiro por API. Esses dados afetam a operação, mas chegam fora do controle da empresa.

  Quando um valor diverge, surgem perguntas concretas:

  - A fonte já enviava aquele valor?
  - A coleta falhou em alguma página?
  - É possível reprocessar apenas um dia, sem afetar dados já usados por relatórios?

  Um arquivo substituído manualmente ou uma tabela sobrescrita não respondem bem a essas perguntas. A resposta original deixa de existir, e a investigação passa a depender de tentativas ou de uma nova solicitação ao fornecedor.

  ---

  ## 🛠️ A abordagem do sistema

  O projeto separa a coleta da transformação. Antes de criar tabelas analíticas, o pipeline armazena a resposta original da API.

  ```text
  1. API externa devolve dados paginados
     ↓
  2. Pipeline em Python busca cada página
     ↓
  3. O pipeline verifica se o lote já existe
     ↓
  4. S3 recebe JSON bruto por data e número da página
     ↓
  5. Camadas posteriores transformam e consultam os dados
  ```

  Cada página recebe uma chave determinística:

  ```text
  raw/open_brewery_db/ingested_date=AAAA-MM-DD/page=0001.json
  ```

  📌 A data registra o momento da ingestão. O número da página identifica o lote. Juntos, eles tornam a origem fácil de localizar e oferecem uma base para reprocessar uma data específica.

  ---

  ## 🔁 Idempotência na prática

  Antes de gravar uma página, o pipeline consulta se a chave já existe no bucket.

  | Situação | Comportamento do pipeline |
  | --- | --- |
  | A página ainda não existe | Grava JSON e metadados de origem. |
  | A página já foi gravada no mesmo dia | Ignora o objeto e registra o evento em log. |
  | Uma transformação muda depois | Permite reconstruir a camada posterior a partir da origem preservada. |

  Essa implementação é simples de propósito. Em ambientes maiores, o controle pode evoluir com checksum, marca d'água ou uma tabela de estado. Para este escopo, a chave determinística torna a regra de reprocessamento explícita e auditável.

  ---

  ## 🔎 Comparação com o caminho inicial

  | Processo frágil | Como a landing zone responde |
  | --- | --- |
  | 📄 CSV manual substituído a cada atualização | Preserva o dado bruto por data e página. |
  | 🗃️ Script sobrescreve uma tabela de consumo | Mantém a origem para refazer transformações. |
  | 🔁 Reexecução cria duplicação | Verifica uma chave determinística antes de gravar. |
  | ❓ Não há evidência sobre o que chegou | Registra arquivos e metadados da fonte. |

  > 💡 A landing zone não substitui modelos dimensionais, tabelas de consumo ou ferramentas de BI. Ela cria uma origem confiável para que essas camadas sejam construídas e refeitas com menos risco.

  ---

  ## ✅ Evidências da execução

  | Validação | Resultado |
  | --- | --- |
  | Registros recebidos | **100** |
  | Arquivos JSON no S3 | **2** |
  | Arquivos novos na segunda execução | **0** |
  | Testes automatizados em Docker | **2 aprovados** |

  A segunda execução encontrou os objetos existentes e ignorou as duas páginas. Esse resultado demonstra que repetir o mesmo lote não sobrescreve nem duplica arquivos.

  ---

  ## 💼 Onde esse padrão é útil

  - **E-commerce:** catálogo, preço e disponibilidade enviados por parceiros.
  - **Logística:** pedidos, entregas e eventos de rastreamento.
  - **Marketing e CRM:** leads, campanhas e métricas de canais externos.
  - **Dados públicos:** séries históricas de portais, clima, câmbio e indicadores.

  Em todos esses casos, a vantagem aparece quando a equipe precisa explicar a origem de um dado, recuperar uma falha ou reconstruir uma transformação.

  ---

  ## 🧪 Escopo e próximo passo

  Este é um projeto de portfólio. A fonte usada é pública e a carga foi limitada para validar o desenho técnico em uma conta AWS de laboratório. O objetivo é evidenciar paginação, persistência de dados brutos, idempotência, infraestrutura versionada e execução em containers.

  O próximo projeto do laboratório parte desses arquivos para convertê-los em Parquet particionado, deixando os dados mais eficientes para consumo analítico.
</article>
