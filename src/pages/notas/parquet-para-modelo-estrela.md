---
layout: ../../layouts/BaseLayout.astro
title: "Do Parquet ao modelo estrela: métricas consistentes"
description: Como uma camada Parquet no S3 se transforma em um modelo dimensional para consultas consistentes com DuckDB.
---

<article class="article container narrow">
  <p class="article-meta">PROJETO · 7 MIN DE LEITURA</p>

  # Do Parquet ao modelo estrela: métricas consistentes

  > 🎯 **Pergunta que orientou o projeto:** depois de gerar Parquet no S3, como evitar que cada dashboard recrie suas próprias regras para responder perguntas sobre cobertura, categoria e localização?

  Uma camada Parquet melhora o armazenamento e a leitura analítica. Ela ainda não define, por si só, como o negócio deve relacionar entidades, categorias, locais e períodos. Sem esse contrato, cada consumidor pode montar suas próprias junções e chegar a respostas diferentes para a mesma pergunta.

  Este projeto cria uma camada dimensional sobre o Parquet produzido anteriormente. A fonte é o diretório público de cervejarias da Open Brewery DB. Como ela não contém transações de venda, o modelo representa cobertura: uma cervejaria observada em uma data de ingestão.

  🔗 [Acesse o repositório do projeto](https://github.com/brunomartins94/parquet-to-star-schema).

  ---

  ## 🧩 A necessidade operacional

  Uma equipe de expansão, catálogo ou operações pode querer responder perguntas aparentemente diretas:

  - Quantas unidades existem por país e categoria?
  - Quantas estão classificadas como encerradas?
  - O que mudou desde a última carga?

  Se cada dashboard começa no arquivo de origem, regras de filtro e junção ficam espalhadas. Um painel pode considerar registros encerrados, outro pode ignorá-los e um terceiro pode usar campos de localização de outra forma. O problema deixa de ser uma consulta e vira divergência de definição.

  ---

  ## 🏗️ O contrato analítico

  O modelo separa entidades descritivas de eventos mensuráveis.

  ```text
                dim_date
                   │
  dim_brewery ─ fact_brewery_snapshot ─ dim_brewery_type
                   │
              dim_location
  ```

  **Grão da fato:** uma cervejaria observada em uma data de ingestão.

  | Tabela | Papel no modelo |
  | --- | --- |
  | `dim_date` | Identifica quando a observação ocorreu. |
  | `dim_brewery` | Mantém a identidade e o nome da cervejaria. |
  | `dim_brewery_type` | Padroniza categorias como `micro` e `brewpub`. |
  | `dim_location` | Reúne cidade, estado/província e país. |
  | `fact_brewery_snapshot` | Concentra a contagem, status de fechamento e chaves das dimensões. |

  Essa estrutura reduz a ambiguidade. O dashboard não precisa adivinhar qual campo representa categoria ou como relacionar localidade e entidade. Ele parte de uma fato com grão e medidas definidos.

  ---

  ## 🛠️ A abordagem do pipeline

  ```text
  S3 / processed Parquet
          ↓
  Validação das colunas necessárias
          ↓
  Criação de chaves determinísticas
          ↓
  Dimensões e fato em Parquet
          ↓
  S3 / marts
          ↓
  Consulta no DuckDB
  ```

  O pipeline cria chaves determinísticas a partir de atributos de negócio. O identificador da fonte gera a chave da cervejaria; tipo e localização recebem chaves próprias. Dessa forma, a mesma entrada produz as mesmas relações no modelo.

  Os arquivos do mart são particionados pela data de ingestão:

  ```text
  marts/brewery_directory/ingested_date=AAAA-MM-DD/fact_brewery_snapshot.parquet
  ```

  ---

  ## 📊 Evidências da execução

  A carga de referência leu 100 registros do Parquet anterior e gerou cinco tabelas do modelo estrela.

  | Medida | Resultado |
  | --- | ---: |
  | Registros na fato de snapshot | **100** |
  | Tabelas Parquet do modelo | **5** |
  | Cervejarias `micro` | **58** |
  | Cervejarias `brewpub` | **26** |
  | Cervejarias `closed` | **4** |
  | Testes automatizados no Docker | **3 aprovados** |

  Uma consulta no DuckDB cruzou a fato com `dim_brewery_type` e `dim_location`. Ela mostrou, por exemplo, 48 microcervejarias nos Estados Unidos e quatro registros encerrados no mesmo país. A carga também trouxe registros de Bélgica, Alemanha, Austrália, Canadá, Irlanda, Portugal, África do Sul e Suécia.

  ---

  ## 🔁 Reexecução e limites

  Cada tabela recebe uma chave de destino formada por data e nome do modelo. Antes de gravar, o pipeline verifica se o arquivo existe. Uma segunda execução da mesma data mantém os cinco arquivos e retorna `written_models: 0`.

  Essa decisão é adequada para um recorte de portfólio e evidencia idempotência. Em uma solução com histórico completo, a evolução natural inclui estratégia de atualização de dimensões, versionamento de schema, qualidade de dados e uma tabela de controle de cargas.

  ---

  ## ⚖️ Comparação com o caminho inicial

  | Caminho | Risco para a análise | Modelo estrela |
  | --- | --- | --- |
  | Dashboard consulta o Parquet de origem | Cada consumidor repete filtros e junções | A fato e as dimensões concentram o contrato analítico |
  | Tabela única muito ampla | Entidades e medidas ficam misturadas | O grão e as relações ficam explícitos |
  | Métrica sem data de observação | Não é possível comparar cargas com clareza | O snapshot preserva a data de referência |

  > 💡 Um modelo estrela não substitui a camada raw nem o Parquet processado. Ele oferece uma camada de consumo em que indicadores podem ser criados com definições mais estáveis.

  ---

  ## 💼 Onde isso ajuda

  - **Expansão de rede:** cobertura de lojas, parceiros ou pontos de atendimento por região.
  - **Catálogo de fornecedores:** produtos e disponibilidade segmentados por categoria e localidade.
  - **Logística:** entregas e ocorrências agrupadas por período, rota e status.
  - **Produto digital:** eventos de uso resumidos por data, funcionalidade e perfil de cliente.

  ---

  ## 🧪 Escopo e próximo passo

  Este é um projeto de portfólio baseado em uma fonte pública, com carga reduzida para validar modelagem dimensional, S3, Parquet, DuckDB, Docker e testes automatizados em uma conta AWS de laboratório.

  O próximo passo pode levar essa camada a uma trust layer com dbt, testes de qualidade, documentação e lineage.
</article>
