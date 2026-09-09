# Biblioteca API

API REST para gerenciamento de livros, desenvolvida com Node.js e Express.

Projeto evoluído a partir do template original (`caixetovisk/biblioteca`), com:
empréstimo/devolução de livros, validação completa, filtros/ordenação/paginação,
persistência em arquivo JSON, categorias/gêneros e histórico de empréstimos.

## Tecnologias

- Node.js / Express
- Jest + SuperTest (testes, com 100% de cobertura)
- Swagger UI + swagger-jsdoc (documentação interativa)

## Instalação

```bash
npm install
```

## Execução

Modo de desenvolvimento (reinício automático):
```bash
npm run dev
```

Modo de produção:
```bash
npm run prod
```

O servidor sobe em `http://localhost:3000`.

## Documentação da API (Swagger)

```
http://localhost:3000/docs
```

## Testes

```bash
npm test
```

Roda toda a suíte com relatório de cobertura (statements, branches, functions e
lines em 100%). Cada arquivo de teste usa seu próprio arquivo de persistência
temporário (via variáveis de ambiente `DB_FILE_LIVROS` / `DB_FILE_EMPRESTIMOS`),
para que as suítes não interfiram umas nas outras.

## Modelo de livro

```json
{
  "id": 1,
  "titulo": "O escaravelho do diabo",
  "autor": "Lucia Machado",
  "disponivel": true,
  "genero": "Suspense"
}
```

## Endpoints

### Livros (CRUD)

| Método | Rota          | Descrição                     |
|--------|---------------|--------------------------------|
| GET    | `/livros`     | Lista livros (filtros/paginação abaixo) |
| GET    | `/livros/:id` | Busca um livro pelo id        |
| POST   | `/livros`     | Cria um livro                 |
| PUT    | `/livros/:id` | Atualiza um livro (parcial)   |
| DELETE | `/livros/:id` | Remove um livro               |

**Validações do POST/PUT** (retornam `400` com `{ "erro": "Dados inválidos", "detalhes": [...] }`):
- `titulo` e `autor` obrigatórios e não vazios (no POST).
- `titulo` até 150 caracteres, `autor` até 100 caracteres.
- `disponivel`, quando informado, deve ser booleano.
- `genero`, quando informado, não pode ser vazio e tem até 60 caracteres.

### Filtros, ordenação e paginação

```
GET /livros?titulo=&autor=&disponivel=&genero=&ordenar=titulo|autor&pagina=1&limite=10
```

Exemplo do enunciado:
```
GET /livros?autor=Machado&disponivel=true&ordenar=titulo
```

Resposta:
```json
{ "total": 2, "pagina": 1, "limite": 10, "dados": [ /* livros */ ] }
```

### Empréstimo e devolução

| Método | Rota                     | Corpo               |
|--------|--------------------------|----------------------|
| POST   | `/livros/:id/emprestar`  | `{ "usuario": "Maria" }` |
| POST   | `/livros/:id/devolver`   | —                    |

- Não é possível emprestar um livro já indisponível (`400`).
- Não é possível devolver um livro que já está disponível (`400`).
- `disponivel` é atualizado automaticamente.

### Categorias

```
GET /categorias
```
Retorna a lista (sem duplicatas) dos gêneros já cadastrados nos livros.

### Histórico de empréstimos

| Método | Rota                        | Descrição                              |
|--------|-----------------------------|------------------------------------------|
| GET    | `/emprestimos`              | Lista todo o histórico (aceita `?livroId=`) |
| GET    | `/livros/:id/emprestimos`   | Histórico de um livro específico       |

Cada registro tem `{ id, livroId, usuario, dataEmprestimo, dataDevolucao }`.

## Persistência

Os dados são salvos em arquivos JSON dentro de `dados/` (`livros.json` e
`emprestimos.json`), carregados automaticamente ao iniciar a aplicação e
regravados após qualquer `POST`, `PUT`, `DELETE`, empréstimo ou devolução.
Se os arquivos não existirem, a aplicação nasce com um conjunto inicial de
livros de exemplo.
