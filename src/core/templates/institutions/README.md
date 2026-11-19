# Schema de Modelos Institucionais (`src/core/templates/institutions/`)

Os modelos institucionais do **RedijaApp** descrevem as adaptações do manual de normalização de uma universidade, instituto federal ou faculdade **por herança** a partir de uma norma base (`abnt_classic`, `abnt_2023`, `article_1col`, etc.) — sem alterar o motor de templates.

## Descoberta Automática

Basta adicionar um arquivo JSON válido em:

```
src/core/templates/institutions/models/<slug>.json
```

Ao compilar o app (`npm run build`) ou executar os testes (`npm test`), o arquivo é descoberto automaticamente:
- aparece na busca de instituições na tela **Novo Trabalho**;
- ganha uma página pública e indexável em `/modelos/<slug>` e entra no `/sitemap.xml`;
- é validado automaticamente pelos testes Vitest no CI.

---

## Campos do Schema

### Metadados obrigatórios

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `slug` | `string` | Identificador único em minúsculas e sem acentos no padrão `<sigla>-<tipo-de-trabalho>` (ex.: `ifsp-tcc`). |
| `institutionName` | `string` | Nome oficial completo da instituição (ex.: `"Instituto Federal de São Paulo"`). |
| `institutionAcronym` | `string` | Sigla oficial (ex.: `"IFSP"`). |
| `cityState` | `string` | Cidade e UF principais (ex.: `"São Paulo / SP"`). |
| `workTypes` | `string[]` | Tipos de trabalho cobertos pelo modelo (ex.: `["TCC", "Monografia"]`). |
| `displayTitle` | `string` | Título amigável exibido nos cartões e na página `/modelos/<slug>`. |
| `description` | `string` | Resumo claro das regras do modelo (também usado na meta description de SEO). |
| `manualUrl` | `string` | Link `https://` do manual oficial de normalização usado como referência. |
| `manualVersion` | `string` | Versão ou ano de publicação do manual oficial (ex.: `"2023"` ou `"4ª ed. (2020)"`). |
| `author` | `string` | Nome ou usuário GitHub de quem contribuiu o modelo. |
| `aliases` | `string[]` *(opcional)* | Termos alternativos para busca (cidade, campus, nome popular). |

### Herança da norma base (obrigatórios)

| Campo | Valores aceitos |
| --- | --- |
| `basePreset` | `"abnt_classic"`, `"abnt_2023"`, `"article_1col"`, `"article_2col"`, `"apa_7"`, `"sbc"`, `"ieee"`, `"poster"` |
| `baseTemplateType` | `"tcc"`, `"artigo"`, `"relatorio"`, `"projeto_pesquisa"`, `"sbc"`, `"ieee"`, `"poster"` |

### Sobrescritas opcionais

#### 1. `templateConfigOverrides` (margens, tipografia, estrutura)
Sobrescreve apenas os campos que diferem da norma base:
- Margens (em cm, valores `>= 0` e `<= 10`): `marginTopCm`, `marginLeftCm`, `marginBottomCm`, `marginRightCm`
- Tipografia: `fontFamily` (`"serif"`, `"sans"`, `"libertinus"`, etc.), `fontSizePt`, `lineSpacing` (`"1.0"`, `"1.5"`, `"2.0"`), `paragraphIndentCm`, `bodyAlignment`
- Estrutura: `includeCoverPage`, `includeTitlePage`, `includeToc`, `h1PageBreak`, `romanPreTextual`, `pageNumbering`, `hideFirstPageNumber`
- Citações e referências: `citationStyle`, `citationFormat`, `referenceHighlight`, `referenceAlignment`, `referenceSpacing`

#### 2. `cover` (capa e brasão)
- `showLogo` (`boolean`): indica que o manual prevê brasão na capa (enviado pelo próprio estudante).
- `logoPosition`: `"top"` | `"above_institution"` | `"below_institution"`.
- `logoHeightCm` (`number`, `0.1` a `8`): altura do brasão na capa.
- `uppercaseInstitution` (`boolean`), `uppercaseTitle` (`boolean`), `showCourse` (`boolean`).

> **Restrição jurídica:** nenhum logo ou brasão (`data:image/...` ou arquivo de imagem) pode ser embutido no repositório sem autorização expressa. O validador rejeita automaticamente modelos com imagens embutidas.

#### 3. `titlePage` (folha de rosto)
- `natureWidthPct` (`number`, `30` a `80`): largura do recuo da nota de natureza do trabalho (padrão ABNT: `50`).
- `showInstitution`, `showAdvisor`, `showCoadvisor` (`boolean`).

#### 4. `preTextualOrder` (ordem dos elementos pré-textuais)
Lista opcional com a ordem exigida pelo manual. Valores válidos:
`"approval_page"`, `"dedicatory"`, `"acknowledgments"`, `"epigraph"`, `"abstract"`, `"foreign_abstract"`, `"figures_list"`, `"boxes_list"`, `"tables_list"`, `"abbreviations"`, `"symbols"`, `"toc"`.

#### 5. `defaultMetadata` (textos padrão ao criar o projeto)
Valores pré-preenchidos na criação do projeto:
`institution`, `course`, `location`, `nature`, `includeApprovalPage`, `includeFiguresList`, `includeTablesList`, `includeBoxesList`, `abstract`, `keywords`, `foreignAbstract`, `foreignKeywords`.

#### 6. `requiredFields` e `linterOverrides` (regras nos linters)
- `requiredFields`: lista de campos obrigatórios segundo o manual (ex.: `["title", "author", "advisor", "nature", "abstract", "keywords", "includeApprovalPage"]`).
- `linterOverrides`:
  - `abstractMinWords` / `abstractMaxWords`: faixa de palavras aceita para o resumo.
  - `requireApprovalPage`: emite aviso citando o manual se a Folha de Aprovação for desativada.
  - `requireForeignAbstract`: emite aviso citando o manual se o Abstract em língua estrangeira estiver vazio.
  - `requireKeywords`: emite aviso se não houver palavras-chave.
  - `customRulesNote`: observação complementar exibida nos avisos.

---

## Exemplo Completo

```json
{
  "slug": "ifsp-tcc",
  "institutionName": "Instituto Federal de São Paulo",
  "institutionAcronym": "IFSP",
  "cityState": "São Paulo / SP",
  "workTypes": ["TCC", "Monografia"],
  "displayTitle": "TCC IFSP",
  "description": "Modelo oficial baseado no Manual de Normalização de Trabalhos Acadêmicos do IFSP (ABNT NBR 14724), com capa, folha de rosto, folha de aprovação, resumo, abstract e sumário.",
  "manualUrl": "https://www.ifsp.edu.br/images/pre/Manual_Normalizacao_IFSP.pdf",
  "manualVersion": "2023",
  "author": "Comunidade RedijaApp",
  "aliases": ["Instituto Federal", "Sao Paulo", "IFSP"],
  "basePreset": "abnt_classic",
  "baseTemplateType": "tcc",
  "templateConfigOverrides": {
    "fontFamily": "sans",
    "fontSizePt": 12,
    "lineSpacing": "1.5",
    "marginTopCm": 3,
    "marginLeftCm": 3,
    "marginBottomCm": 2,
    "marginRightCm": 2,
    "includeCoverPage": true,
    "includeTitlePage": true,
    "includeToc": true
  },
  "cover": {
    "showLogo": true,
    "logoPosition": "top",
    "logoHeightCm": 2.4,
    "uppercaseInstitution": true,
    "uppercaseTitle": true,
    "showCourse": true
  },
  "titlePage": {
    "natureWidthPct": 50,
    "showAdvisor": true,
    "showCoadvisor": true
  },
  "preTextualOrder": [
    "approval_page",
    "dedicatory",
    "acknowledgments",
    "epigraph",
    "abstract",
    "foreign_abstract",
    "figures_list",
    "boxes_list",
    "tables_list",
    "abbreviations",
    "symbols",
    "toc"
  ],
  "defaultMetadata": {
    "institution": "Instituto Federal de Educação, Ciência e Tecnologia de São Paulo",
    "course": "Curso Superior de Tecnologia / Bacharelado",
    "location": "São Paulo",
    "nature": "Trabalho de Conclusão de Curso apresentado ao Instituto Federal de Educação, Ciência e Tecnologia de São Paulo (IFSP), como requisito parcial para obtenção do título de graduado.",
    "includeApprovalPage": true
  },
  "requiredFields": [
    "title",
    "author",
    "institution",
    "course",
    "advisor",
    "nature",
    "abstract",
    "keywords",
    "includeApprovalPage"
  ],
  "linterOverrides": {
    "requireApprovalPage": true,
    "requireKeywords": true
  }
}
```
