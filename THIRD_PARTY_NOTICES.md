# Avisos e Licenças de Terceiros (Third-Party Notices)

O **RedijaApp** é distribuído sob a licença **GNU Affero General Public License v3.0 (`AGPL-3.0`)**, conforme [`LICENSE`](LICENSE).  
Como aplicação web executada diretamente no navegador do usuário (*local-first* via WebAssembly), o projeto empacota e redistribui os componentes, motores e fontes de terceiros listados abaixo, cada qual sob seus respectivos termos originais.

---

## 1. Motor Tipográfico e Bindings WebAssembly (`Apache-2.0`)

| Componente | Projeto / Autor | Versão | Licença | Repositório |
| :--- | :--- | :---: | :--- | :--- |
| **Typst Engine** | The Typst Project | Integrado via `typst-ts` | `Apache-2.0` | https://github.com/typst/typst |
| **`@myriaddreamin/typst.ts`** | Myriad-Dreamin | `^0.7.0` | `Apache-2.0` | https://github.com/Myriad-Dreamin/typst.ts |
| **`@myriaddreamin/typst-ts-web-compiler`** | Myriad-Dreamin | `^0.7.0` | `Apache-2.0` | https://github.com/Myriad-Dreamin/typst.ts |
| **`@myriaddreamin/typst-ts-renderer`** | Myriad-Dreamin | `^0.7.0` | `Apache-2.0` | https://github.com/Myriad-Dreamin/typst.ts |
| **`@myriaddreamin/typst-ts-node-compiler`** | Myriad-Dreamin *(dev/testes)* | `^0.7.0` | `Apache-2.0` | https://github.com/Myriad-Dreamin/typst.ts |

> O RedijaApp utiliza o compilador e renderizador **Typst** em WebAssembly sem modificações no núcleo do compilador, preservando os direitos autorais e a licença `Apache-2.0` dos projetos originais. O uso do motor não implica endosso oficial do projeto Typst ao RedijaApp.

---

## 2. Fontes Tipográficas Embutidas (`public/fonts/`)

| Família | Autor / Origem | Licença |
| :--- | :--- | :--- |
| **Tinos** (`Regular`, `Bold`, `Italic`, `BoldItalic`) | Steve Matteson / Google Fonts | `Apache-2.0` |
| **Arimo** (`Regular`, `Italic`) | Steve Matteson / Google Fonts | `Apache-2.0` |

---

## 3. Principais Bibliotecas de Aplicação

| Biblioteca | Licença | Finalidade no RedijaApp |
| :--- | :--- | :--- |
| **React / React DOM** | `MIT` | Interface de usuário |
| **TipTap / ProseMirror** | `MIT` | Editor visual em blocos |
| **Dexie.js** | `Apache-2.0` | Camada IndexedDB (*local-first*) |
| **Mammoth** | `BSD-2-Clause` | Importação de arquivos Word (`.docx`) |
| **JSZip** | `MIT OR GPL-3.0-or-later` | Empacotamento e importação de arquivos `.zip` |
| **PeerJS** | `MIT` | Colaboração P2P em tempo real (WebRTC) |
| **Tailwind CSS** | `MIT` | Sistema de estilização |
| **Lucide React** | `ISC` | Ícones de interface |
| **Resend** | `MIT` | Envio de relatos no endpoint serverless `/api/feedback` |

---

## 4. Aviso sobre Marca e Identidade Visual

A licença `AGPL-3.0` concede amplas liberdades sobre o **código-fonte** do RedijaApp, mas **não autoriza** o uso comercial ou enganoso do nome **RedijaApp**, do domínio `app.redija.com.br` nem do logotipo oficial (`public/logo.png`) para se passar pelo serviço oficial mantido pelo autor. Instâncias modificadas hospedadas por terceiros devem adotar identidade visual própria e cumprir integralmente os termos de exibição de código-fonte da Seção 13 da GNU AGPL-3.0.
