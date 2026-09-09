// app.js
import express from "express";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger.js";
import { repositorioLivros, repositorioEmprestimos } from "./db.js";
import { validarLivro } from "./validacao.js";

const app = express();
app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ---------------------------------------------------------------------------
// Carregamento inicial dos dados (item 4 - persistência)
// Se ainda não existir nada persistido, a aplicação nasce com um seed padrão
// (mesmos livros do projeto original) e já grava esse seed em disco.
// ---------------------------------------------------------------------------
let livros = repositorioLivros.carregar();
if (livros.length === 0) {
  livros = [
    {
      id: 1,
      titulo: "O escaravelho do diabo",
      autor: "Lucia Machado",
      disponivel: true,
      genero: "Suspense",
    },
    {
      id: 2,
      titulo: "E o vento levou",
      autor: "Erico Veríssimo",
      disponivel: false,
      genero: "Romance",
    },
  ];
  repositorioLivros.salvar(livros);
}

let emprestimos = repositorioEmprestimos.carregar();

function proximoIdLivro() {
  return livros.reduce((max, l) => Math.max(max, l.id), 0) + 1;
}

function proximoIdEmprestimo() {
  return emprestimos.reduce((max, e) => Math.max(max, e.id), 0) + 1;
}

function persistirLivros() {
  repositorioLivros.salvar(livros);
}

function persistirEmprestimos() {
  repositorioEmprestimos.salvar(emprestimos);
}

// ---------------------------------------------------------------------------
// GET /livros — item 3: filtros, ordenação e paginação
// ---------------------------------------------------------------------------

/**
 * @openapi
 * /livros:
 *   get:
 *     summary: Lista livros com filtros, ordenação e paginação
 *     parameters:
 *       - in: query
 *         name: titulo
 *         schema: { type: string }
 *         description: Filtra pelo título (case-insensitive, busca parcial)
 *       - in: query
 *         name: autor
 *         schema: { type: string }
 *         description: Filtra pelo autor (case-insensitive, busca parcial)
 *       - in: query
 *         name: disponivel
 *         schema: { type: boolean }
 *         description: Filtra por disponibilidade
 *       - in: query
 *         name: genero
 *         schema: { type: string }
 *         description: Filtra pelo gênero/categoria
 *       - in: query
 *         name: ordenar
 *         schema: { type: string, enum: [titulo, autor] }
 *         description: Campo usado para ordenar o resultado
 *       - in: query
 *         name: pagina
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limite
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Lista paginada de livros
 */
app.get("/livros", (req, res) => {
  const { titulo, autor, disponivel, genero, ordenar } = req.query;

  let resultado = [...livros];

  if (titulo) {
    resultado = resultado.filter((l) =>
      l.titulo.toLowerCase().includes(String(titulo).toLowerCase())
    );
  }

  if (autor) {
    resultado = resultado.filter((l) =>
      l.autor.toLowerCase().includes(String(autor).toLowerCase())
    );
  }

  if (disponivel !== undefined) {
    const querDisponivel = String(disponivel).toLowerCase() === "true";
    resultado = resultado.filter((l) => Boolean(l.disponivel) === querDisponivel);
  }

  if (genero) {
    resultado = resultado.filter(
      (l) => (l.genero || "").toLowerCase() === String(genero).toLowerCase()
    );
  }

  if (ordenar === "titulo" || ordenar === "autor") {
    resultado = [...resultado].sort((a, b) => a[ordenar].localeCompare(b[ordenar], "pt-BR"));
  }

  const total = resultado.length;

  let pagina = Number.parseInt(req.query.pagina, 10);
  if (!Number.isInteger(pagina) || pagina < 1) pagina = 1;

  let limite = Number.parseInt(req.query.limite, 10);
  if (!Number.isInteger(limite) || limite < 1) limite = 10;

  const inicio = (pagina - 1) * limite;
  const dados = resultado.slice(inicio, inicio + limite);

  res.status(200).json({ total, pagina, limite, dados });
});

/**
 * @openapi
 * /livros/{id}:
 *   get:
 *     summary: Busca um livro pelo id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Livro encontrado }
 *       404: { description: Livro não encontrado }
 */
app.get("/livros/:id", (req, res) => {
  const id = Number(req.params.id);
  const livro = livros.find((item) => item.id === id);

  if (!livro) {
    return res.status(404).json({ erro: "Livro não encontrado" });
  }

  res.status(200).json(livro);
});

// ---------------------------------------------------------------------------
// POST /livros — item 2: validação completa
// ---------------------------------------------------------------------------

/**
 * @openapi
 * /livros:
 *   post:
 *     summary: Cria um novo livro
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [titulo, autor]
 *             properties:
 *               titulo: { type: string }
 *               autor: { type: string }
 *               disponivel: { type: boolean, example: true }
 *               genero: { type: string, example: Romance }
 *     responses:
 *       201: { description: Livro criado com sucesso }
 *       400: { description: Dados inválidos }
 */
app.post("/livros", (req, res) => {
  const dados = req.body || {};
  const erros = validarLivro(dados, { parcial: false });

  if (erros.length > 0) {
    return res.status(400).json({ erro: "Dados inválidos", detalhes: erros });
  }

  const novoLivro = {
    id: proximoIdLivro(),
    titulo: dados.titulo,
    autor: dados.autor,
    disponivel: dados.disponivel ?? false,
    genero: dados.genero ?? null,
  };

  livros.push(novoLivro);
  persistirLivros();

  res.status(201).json(novoLivro);
});

/**
 * @openapi
 * /livros/{id}:
 *   put:
 *     summary: Atualiza um livro pelo id (atualização parcial)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo: { type: string }
 *               autor: { type: string }
 *               disponivel: { type: boolean }
 *               genero: { type: string }
 *     responses:
 *       200: { description: Livro atualizado com sucesso }
 *       400: { description: Dados inválidos }
 *       404: { description: Livro não encontrado }
 */
app.put("/livros/:id", (req, res) => {
  const id = Number(req.params.id);
  const livro = livros.find((item) => item.id === id);

  if (!livro) {
    return res.status(404).json({ erro: "Livro não encontrado" });
  }

  const dados = req.body || {};
  const erros = validarLivro(dados, { parcial: true });

  if (erros.length > 0) {
    return res.status(400).json({ erro: "Dados inválidos", detalhes: erros });
  }

  if (dados.titulo !== undefined) livro.titulo = dados.titulo;
  if (dados.autor !== undefined) livro.autor = dados.autor;
  if (dados.disponivel !== undefined) livro.disponivel = dados.disponivel;
  if (dados.genero !== undefined) livro.genero = dados.genero;

  persistirLivros();

  res.status(200).json(livro);
});

/**
 * @openapi
 * /livros/{id}:
 *   delete:
 *     summary: Exclui um livro pelo id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204: { description: Livro excluído com sucesso }
 *       404: { description: Livro não encontrado }
 */
app.delete("/livros/:id", (req, res) => {
  const id = Number(req.params.id);
  const indice = livros.findIndex((item) => item.id === id);

  if (indice === -1) {
    return res.status(404).json({ erro: "Livro não encontrado" });
  }

  livros.splice(indice, 1);
  persistirLivros();

  res.status(204).send();
});

// ---------------------------------------------------------------------------
// item 1: empréstimo e devolução  /  item 6: histórico de empréstimos
// ---------------------------------------------------------------------------

/**
 * @openapi
 * /livros/{id}/emprestar:
 *   post:
 *     summary: Registra o empréstimo de um livro
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [usuario]
 *             properties:
 *               usuario: { type: string, example: Maria Silva }
 *     responses:
 *       200: { description: Empréstimo registrado com sucesso }
 *       400: { description: Livro indisponível ou usuário não informado }
 *       404: { description: Livro não encontrado }
 */
app.post("/livros/:id/emprestar", (req, res) => {
  const id = Number(req.params.id);
  const livro = livros.find((item) => item.id === id);

  if (!livro) {
    return res.status(404).json({ erro: "Livro não encontrado" });
  }

  if (!livro.disponivel) {
    return res.status(400).json({ erro: "Livro indisponível para empréstimo" });
  }

  const usuario = req.body?.usuario;
  if (typeof usuario !== "string" || usuario.trim() === "") {
    return res
      .status(400)
      .json({ erro: "O campo usuario é obrigatório para registrar o empréstimo" });
  }

  livro.disponivel = false;
  persistirLivros();

  const registro = {
    id: proximoIdEmprestimo(),
    livroId: livro.id,
    usuario,
    dataEmprestimo: new Date().toISOString(),
    dataDevolucao: null,
  };
  emprestimos.push(registro);
  persistirEmprestimos();

  res.status(200).json({ livro, emprestimo: registro });
});

/**
 * @openapi
 * /livros/{id}/devolver:
 *   post:
 *     summary: Registra a devolução de um livro
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Devolução registrada com sucesso }
 *       400: { description: Livro já está disponível (não estava emprestado) }
 *       404: { description: Livro não encontrado }
 */
app.post("/livros/:id/devolver", (req, res) => {
  const id = Number(req.params.id);
  const livro = livros.find((item) => item.id === id);

  if (!livro) {
    return res.status(404).json({ erro: "Livro não encontrado" });
  }

  if (livro.disponivel) {
    return res.status(400).json({ erro: "Livro já está disponível" });
  }

  livro.disponivel = true;
  persistirLivros();

  const registroAberto = [...emprestimos]
    .reverse()
    .find((e) => e.livroId === livro.id && e.dataDevolucao === null);

  if (registroAberto) {
    registroAberto.dataDevolucao = new Date().toISOString();
    persistirEmprestimos();
  }

  res.status(200).json({ livro, emprestimo: registroAberto ?? null });
});

/**
 * @openapi
 * /emprestimos:
 *   get:
 *     summary: Lista o histórico de empréstimos
 *     parameters:
 *       - in: query
 *         name: livroId
 *         schema: { type: integer }
 *         description: Filtra o histórico por um livro específico
 *     responses:
 *       200: { description: Histórico de empréstimos }
 */
app.get("/emprestimos", (req, res) => {
  const { livroId } = req.query;

  let resultado = [...emprestimos];
  if (livroId !== undefined) {
    resultado = resultado.filter((e) => e.livroId === Number(livroId));
  }

  res.status(200).json(resultado);
});

/**
 * @openapi
 * /livros/{id}/emprestimos:
 *   get:
 *     summary: Consulta o histórico de empréstimos de um livro específico
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Histórico do livro }
 *       404: { description: Livro não encontrado }
 */
app.get("/livros/:id/emprestimos", (req, res) => {
  const id = Number(req.params.id);
  const livro = livros.find((item) => item.id === id);

  if (!livro) {
    return res.status(404).json({ erro: "Livro não encontrado" });
  }

  const historico = emprestimos.filter((e) => e.livroId === id);
  res.status(200).json(historico);
});

// ---------------------------------------------------------------------------
// item 5: categorias e gêneros
// ---------------------------------------------------------------------------

/**
 * @openapi
 * /categorias:
 *   get:
 *     summary: Lista os gêneros/categorias cadastrados nos livros
 *     responses:
 *       200: { description: Lista de categorias }
 */
app.get("/categorias", (req, res) => {
  const categorias = [...new Set(livros.map((l) => l.genero).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  res.status(200).json(categorias);
});

export default app;
