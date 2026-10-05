---
layout: ../../layouts/BaseLayout.astro
title: "Do JSON bruto ao Parquet: uma camada pronta para análise"
description: Decisões e evidências da transformação de JSON no S3 em Parquet particionado e consultável com DuckDB.
---

<article class="article container narrow">
  <p class="article-meta">PROJETO · 6 MIN DE LEITURA</p>

  # Do JSON bruto ao Parquet: uma camada pronta para análise

  > 🎯 **Pergunta que orientou o projeto:** depois de preservar uma API no S3, como tornar esses dados eficientes para consulta sem perder a separação entre a origem e a camada de consumo?

  O primeiro projeto deste laboratório criou uma landing zone no Amazon S3. Ele preserva respostas originais da API em JSON, organizadas por data de ingestão e página. Essa escolha favorece rastreabilidade e reprocessamento, mas JSON não é a melhor opção para quem precisa consultar dados com frequência.

  Neste segundo projeto, a camada raw passa por validação e normalização antes de gerar um arquivo Parquet comprimido, particionado pela data de ingestão e pronto para ferramentas analíticas.

  🔗 [Acesse o repositório do projeto](https://github.com/brunomartins94/s3-raw-to-parquet).

  ---

  ## 🧩 A necessidade operacional

  Imagine uma área de operações que recebe o catálogo de um parceiro por API. A empresa precisa guardar a resposta original para investigar divergências, mas também quer responder perguntas como “quantas unidades pertencem a cada categoria?” sem transferir e interpretar vários documentos JSON a cada consulta.

  Manter somente a camada raw deixa a origem disponível, mas transfere custo e tempo de leitura para cada consumidor. Sobrescrever a origem com uma tabela tratada elimina a possibilidade de reconstruir o processamento quando uma regra muda.

  O ponto é manter as duas responsabilidades separadas:

  ```text
  S3 / raw JSON        preserva a resposta recebida
          ↓
  Validação e schema    transforma dados em registros consistentes
          ↓
  S3 / processed        oferece Parquet para análise
          ↓
  DuckDB                consulta sem reler a API ou os JSONs brutos
  ```

  ---

  ## 🛠️ A abordagem do sistema

  O pipeline procura os JSONs de uma data no prefixo raw, consolida os registros e aplica um esquema explícito. O identificador `id` é obrigatório, enquanto campos como nome, cidade e categoria podem ficar nulos quando a fonte não os informa.

  Depois da validação, o processo grava um único arquivo Parquet com compressão Snappy:

  ```text
  processed/open_brewery_db/ingested_date=AAAA-MM-DD/breweries.parquet
  ```

  📌 A chave inclui a mesma data que identifica a carga raw. Isso permite processar um dia específico e também evita a criação de arquivos duplicados quando a execução é repetida.

  ---

  ## 📉 Evidência de armazenamento

  A execução de referência leu 100 registros da Open Brewery DB, previamente preservados na landing zone.

  | Camada | Tamanho |
  | --- | ---: |
  | JSON bruto no S3 | **44.708 bytes** |
  | Parquet processado no S3 | **9.333 bytes** |
  | Redução observada | **79,12%** |

  Essa comparação mede armazenamento, não uma promessa de desempenho. Em conjuntos maiores e consultas que leem apenas algumas colunas, o formato colunar também tende a reduzir leitura desnecessária. O objetivo desta medição é demonstrar que a transformação já produziu uma camada menor e estruturada.

  ---

  ## 🔎 Uma consulta analítica simples

  O projeto baixa o Parquet produzido e o registra em memória no DuckDB. A primeira consulta agrupa as cervejarias por tipo.

  | Tipo | Registros |
  | --- | ---: |
  | `micro` | **58** |
  | `brewpub` | **26** |
  | `large` | **7** |
  | Outros tipos | **9** |

  Essa etapa não substitui um warehouse. Ela evidencia que a camada processed já pode servir exploração local, validações de negócio ou a próxima transformação do pipeline.

  ---

  ## 🔁 Reexecução segura

  O destino é determinístico: uma data de ingestão sempre aponta para a mesma chave Parquet. Antes de gravar, o pipeline verifica se o objeto já existe.

  | Situação | Resultado |
  | --- | --- |
  | Primeira execução da data | Grava o arquivo Parquet. |
  | Segunda execução com a mesma data | Mantém o arquivo e retorna `written: 0`. |
  | Nova regra de transformação | Exige uma decisão explícita de versão ou reprocessamento. |

  Na execução registrada, a segunda chamada encontrou o arquivo existente e não gravou outro objeto. A regra evita duplicação acidental e torna o comportamento do recorte fácil de explicar.

  ---

  ## ⚖️ Comparação com caminhos comuns

  | Caminho | Consequência | Como a camada Parquet responde |
  | --- | --- | --- |
  | Consultar JSON bruto diretamente | Cada leitura interpreta documentos textuais e transfere mais bytes | O formato comprimido e colunar prepara o dado para consumo |
  | Exportar um CSV sem preservar raw | A origem e o histórico ficam frágeis | Raw e processed mantêm responsabilidades distintas |
  | Regravar arquivos sem uma chave de destino | Reexecuções podem duplicar ou sobrescrever resultados | A chave por data torna a escrita previsível |

  > 💡 Parquet não substitui a landing zone. Ele usa a camada raw como fonte para criar uma versão mais apropriada para análise.

  ---

  ## 💼 Onde isso ajuda

  - **Catálogo e estoque:** dados recebidos de fornecedores podem ser preservados em raw e consolidados para análise de disponibilidade.
  - **Eventos logísticos:** entregas e rastreamento chegam de sistemas externos e precisam alimentar consultas por período.
  - **Métricas de produto:** eventos de uso podem ficar em uma camada compacta antes de um modelo dimensional ou dashboard.
  - **Dados públicos:** séries de portais abertos podem ser coletadas uma vez e analisadas localmente sem repetir chamadas à API.

  ---

  ## 🧪 Escopo e próximo passo

  O projeto usa uma fonte pública e uma amostra pequena para validar o desenho em uma conta AWS de laboratório. Ele demonstra S3, Python, PyArrow, DuckDB, Docker, testes automatizados e um resultado mensurável de compactação.

  O próximo passo natural é criar um modelo analítico de consumo, com fatos e dimensões, sobre a camada Parquet.
</article>
