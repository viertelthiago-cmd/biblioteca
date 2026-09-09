// tests/validacao.test.js — item 2: validação completa dos livros
import fs from "fs";
import path from "path";
import { validarLivro, TAMANHO_MAXIMO_TITULO, TAMANHO_MAXIMO_AUTOR } from "../validacao.js";

const DB_LIVROS = path.resolve("dados/test-validacao-livros.json");
const DB_EMPRESTIMOS = path.resolve("dados/test-validacao-emprestimos.json");

[DB_LIVROS, DB_EMPRESTIMOS].forEach((arquivo) => {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  if (fs.existsSync(arquivo)) fs.unlinkSync(arquivo);
});

process.env.DB_FILE_LIVROS = DB_LIVROS;
process.env.DB_FILE_EMPRESTIMOS = DB_EMPRESTIMOS;

const request = (await import("supertest")).default;
const { default: app } = await import("../app.js");

afterAll(() => {
  [DB_LIVROS, DB_EMPRESTIMOS].forEach((arquivo) => {
    if (fs.existsSync(arquivo)) fs.unlinkSync(arquivo);
  });
});

// --- testes unitários da função validarLivro -------------------------------

describe("validarLivro (unitário)", () => {
  test("aceita um livro válido completo", () => {
    expect(
      validarLivro({ titulo: "Dom Casmurro", autor: "Machado de Assis", disponivel: true })
    ).toEqual([]);
  });

  test("rejeita título ausente", () => {
    const erros = validarLivro({ autor: "Autor" });
    expect(erros).toContain("O campo titulo é obrigatório e não pode ser vazio");
  });

  test("rejeita título vazio (apenas espaços)", () => {
    const erros = validarLivro({ titulo: "   ", autor: "Autor" });
    expect(erros).toContain("O campo titulo é obrigatório e não pode ser vazio");
  });

  test("rejeita autor ausente", () => {
    const erros = validarLivro({ titulo: "Título" });
    expect(erros).toContain("O campo autor é obrigatório e não pode ser vazio");
  });

  test("rejeita autor vazio", () => {
    const erros = validarLivro({ titulo: "Título", autor: "" });
    expect(erros).toContain("O campo autor é obrigatório e não pode ser vazio");
  });

  test("rejeita título acima do tamanho máximo", () => {
    const erros = validarLivro({
      titulo: "a".repeat(TAMANHO_MAXIMO_TITULO + 1),
      autor: "Autor",
    });
    expect(erros).toContain(
      `O campo titulo deve ter no máximo ${TAMANHO_MAXIMO_TITULO} caracteres`
    );
  });

  test("rejeita autor acima do tamanho máximo", () => {
    const erros = validarLivro({
      titulo: "Título",
      autor: "a".repeat(TAMANHO_MAXIMO_AUTOR + 1),
    });
    expect(erros).toContain(`O campo autor deve ter no máximo ${TAMANHO_MAXIMO_AUTOR} caracteres`);
  });

  test("rejeita disponivel que não é booleano", () => {
    const erros = validarLivro({ titulo: "Título", autor: "Autor", disponivel: "sim" });
    expect(erros).toContain("O campo disponivel deve ser um valor booleano (true ou false)");
  });

  test("rejeita genero acima do tamanho máximo", () => {
    const erros = validarLivro({
      titulo: "Título",
      autor: "Autor",
      genero: "a".repeat(61),
    });
    expect(erros).toContain("O campo genero deve ter no máximo 60 caracteres");
  });

  test("rejeita genero vazio quando informado", () => {
    const erros = validarLivro({ titulo: "Título", autor: "Autor", genero: "  " });
    expect(erros).toContain("O campo genero, quando informado, não pode ser vazio");
  });

  test("usa valores padrão quando chamada sem argumentos", () => {
    const erros = validarLivro();
    expect(erros).toContain("O campo titulo é obrigatório e não pode ser vazio");
    expect(erros).toContain("O campo autor é obrigatório e não pode ser vazio");
  });

  test("modo parcial (PUT) não exige titulo/autor quando ausentes", () => {
    expect(validarLivro({ disponivel: true }, { parcial: true })).toEqual([]);
  });

  test("modo parcial (PUT) ainda valida os campos presentes", () => {
    const erros = validarLivro({ titulo: "" }, { parcial: true });
    expect(erros).toContain("O campo titulo é obrigatório e não pode ser vazio");
  });
});

// --- testes de integração via HTTP ------------------------------------------

describe("POST /livros - validação", () => {
  test("cria um livro válido", async () => {
    const resposta = await request(app)
      .post("/livros")
      .send({ titulo: "Drácula", autor: "Bram Stoker", genero: "Terror" });

    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({
      titulo: "Drácula",
      autor: "Bram Stoker",
      genero: "Terror",
      disponivel: false,
    });
  });

  test("retorna 400 padronizado quando título não é informado", async () => {
    const resposta = await request(app).post("/livros").send({ autor: "Autor sem título" });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toBe("Dados inválidos");
    expect(resposta.body.detalhes).toContain(
      "O campo titulo é obrigatório e não pode ser vazio"
    );
  });

  test("retorna 400 padronizado quando autor não é informado", async () => {
    const resposta = await request(app).post("/livros").send({ titulo: "Sem autor" });

    expect(resposta.status).toBe(400);
    expect(resposta.body.detalhes).toContain("O campo autor é obrigatório e não pode ser vazio");
  });

  test("retorna 400 quando disponivel não é booleano", async () => {
    const resposta = await request(app)
      .post("/livros")
      .send({ titulo: "Título", autor: "Autor", disponivel: "talvez" });

    expect(resposta.status).toBe(400);
    expect(resposta.body.detalhes).toContain(
      "O campo disponivel deve ser um valor booleano (true ou false)"
    );
  });

  test("acumula mais de um erro de validação ao mesmo tempo", async () => {
    const resposta = await request(app).post("/livros").send({});

    expect(resposta.status).toBe(400);
    expect(resposta.body.detalhes.length).toBeGreaterThanOrEqual(2);
  });

  test("retorna 400 quando nenhum corpo é enviado", async () => {
    const resposta = await request(app).post("/livros");

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toBe("Dados inválidos");
  });
});

describe("PUT /livros/:id - validação", () => {
  test("retorna 404 para livro inexistente", async () => {
    const resposta = await request(app).put("/livros/9999").send({ titulo: "Novo título" });
    expect(resposta.status).toBe(404);
    expect(resposta.body.erro).toBe("Livro não encontrado");
  });

  test("retorna 400 quando envia título vazio", async () => {
    const criado = await request(app)
      .post("/livros")
      .send({ titulo: "Original", autor: "Autor" });

    const resposta = await request(app).put(`/livros/${criado.body.id}`).send({ titulo: "" });

    expect(resposta.status).toBe(400);
  });

  test("atualiza apenas os campos enviados", async () => {
    const criado = await request(app)
      .post("/livros")
      .send({ titulo: "Original", autor: "Autor", disponivel: true });

    const resposta = await request(app)
      .put(`/livros/${criado.body.id}`)
      .send({ disponivel: false });

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({
      titulo: "Original",
      autor: "Autor",
      disponivel: false,
    });
  });

  test("atualiza apenas o título, preservando disponivel e genero", async () => {
    const criado = await request(app)
      .post("/livros")
      .send({ titulo: "Original 2", autor: "Autor", disponivel: true, genero: "Drama" });

    const resposta = await request(app)
      .put(`/livros/${criado.body.id}`)
      .send({ titulo: "Título alterado" });

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({
      titulo: "Título alterado",
      disponivel: true,
      genero: "Drama",
    });
  });

  test("atualiza o gênero de um livro existente", async () => {
    const criado = await request(app)
      .post("/livros")
      .send({ titulo: "Original 4", autor: "Autor", genero: "Aventura" });

    const resposta = await request(app)
      .put(`/livros/${criado.body.id}`)
      .send({ genero: "Fantasia" });

    expect(resposta.status).toBe(200);
    expect(resposta.body.genero).toBe("Fantasia");
  });

  test("não falha quando o PUT é enviado sem corpo algum", async () => {
    const criado = await request(app)
      .post("/livros")
      .send({ titulo: "Original 3", autor: "Autor" });

    const resposta = await request(app).put(`/livros/${criado.body.id}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.titulo).toBe("Original 3");
  });
});
