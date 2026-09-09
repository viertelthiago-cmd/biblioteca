// tests/emprestimos.test.js — item 1: empréstimo/devolução, item 6: histórico
import fs from "fs";
import path from "path";

const DB_LIVROS = path.resolve("dados/test-emprestimos-livros.json");
const DB_EMPRESTIMOS = path.resolve("dados/test-emprestimos-emprestimos.json");

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

// Seed: id 1 disponível / id 2 indisponível

describe("POST /livros/:id/emprestar", () => {
  test("empresta um livro disponível informando o usuário", async () => {
    const resposta = await request(app)
      .post("/livros/1/emprestar")
      .send({ usuario: "Maria Silva" });

    expect(resposta.status).toBe(200);
    expect(resposta.body.livro.disponivel).toBe(false);
    expect(resposta.body.emprestimo).toMatchObject({
      livroId: 1,
      usuario: "Maria Silva",
      dataDevolucao: null,
    });
    expect(typeof resposta.body.emprestimo.dataEmprestimo).toBe("string");
  });

  test("não permite emprestar um livro já indisponível", async () => {
    const resposta = await request(app)
      .post("/livros/2/emprestar")
      .send({ usuario: "João" });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toBe("Livro indisponível para empréstimo");
  });

  test("retorna 404 para livro inexistente", async () => {
    const resposta = await request(app)
      .post("/livros/9999/emprestar")
      .send({ usuario: "João" });

    expect(resposta.status).toBe(404);
  });

  test("exige o campo usuario", async () => {
    const criado = await request(app)
      .post("/livros")
      .send({ titulo: "Disponível para teste", autor: "Autor", disponivel: true });

    const resposta = await request(app).post(`/livros/${criado.body.id}/emprestar`).send({});

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toBe(
      "O campo usuario é obrigatório para registrar o empréstimo"
    );
  });

  test("rejeita usuario vazio", async () => {
    const criado = await request(app)
      .post("/livros")
      .send({ titulo: "Outro disponível", autor: "Autor", disponivel: true });

    const resposta = await request(app)
      .post(`/livros/${criado.body.id}/emprestar`)
      .send({ usuario: "   " });

    expect(resposta.status).toBe(400);
  });
});

describe("POST /livros/:id/devolver", () => {
  test("devolve um livro emprestado e fecha o registro de histórico", async () => {
    const criado = await request(app)
      .post("/livros")
      .send({ titulo: "Livro para devolução", autor: "Autor", disponivel: true });

    await request(app).post(`/livros/${criado.body.id}/emprestar`).send({ usuario: "Ana" });

    const resposta = await request(app).post(`/livros/${criado.body.id}/devolver`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.livro.disponivel).toBe(true);
    expect(resposta.body.emprestimo.dataDevolucao).not.toBeNull();
  });

  test("não permite devolver um livro que já está disponível", async () => {
    const criado = await request(app)
      .post("/livros")
      .send({ titulo: "Nunca foi emprestado", autor: "Autor", disponivel: true });

    const resposta = await request(app).post(`/livros/${criado.body.id}/devolver`);

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toBe("Livro já está disponível");
  });

  test("retorna 404 para livro inexistente", async () => {
    const resposta = await request(app).post("/livros/9999/devolver");
    expect(resposta.status).toBe(404);
  });

  test("devolve normalmente mesmo sem um registro de empréstimo aberto correspondente", async () => {
    // livro marcado como indisponível via PUT, sem ter passado por /emprestar
    const criado = await request(app)
      .post("/livros")
      .send({ titulo: "Indisponível manualmente", autor: "Autor", disponivel: true });

    await request(app).put(`/livros/${criado.body.id}`).send({ disponivel: false });

    const resposta = await request(app).post(`/livros/${criado.body.id}/devolver`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.livro.disponivel).toBe(true);
    expect(resposta.body.emprestimo).toBeNull();
  });
});

describe("GET /emprestimos e histórico por livro", () => {
  test("GET /emprestimos lista todo o histórico", async () => {
    const resposta = await request(app).get("/emprestimos");

    expect(resposta.status).toBe(200);
    expect(Array.isArray(resposta.body)).toBe(true);
    expect(resposta.body.length).toBeGreaterThan(0);
  });

  test("GET /emprestimos?livroId= filtra pelo livro", async () => {
    const criado = await request(app)
      .post("/livros")
      .send({ titulo: "Livro filtrado", autor: "Autor", disponivel: true });
    await request(app).post(`/livros/${criado.body.id}/emprestar`).send({ usuario: "Carlos" });

    const resposta = await request(app)
      .get("/emprestimos")
      .query({ livroId: criado.body.id });

    expect(resposta.status).toBe(200);
    resposta.body.forEach((registro) => expect(registro.livroId).toBe(criado.body.id));
  });

  test("GET /livros/:id/emprestimos retorna o histórico daquele livro", async () => {
    const criado = await request(app)
      .post("/livros")
      .send({ titulo: "Outro livro filtrado", autor: "Autor", disponivel: true });
    await request(app).post(`/livros/${criado.body.id}/emprestar`).send({ usuario: "Beatriz" });
    await request(app).post(`/livros/${criado.body.id}/devolver`);

    const resposta = await request(app).get(`/livros/${criado.body.id}/emprestimos`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(1);
    expect(resposta.body[0].usuario).toBe("Beatriz");
    expect(resposta.body[0].dataDevolucao).not.toBeNull();
  });

  test("GET /livros/:id/emprestimos retorna array vazio quando o livro nunca foi emprestado", async () => {
    const criado = await request(app)
      .post("/livros")
      .send({ titulo: "Nunca emprestado", autor: "Autor" });

    const resposta = await request(app).get(`/livros/${criado.body.id}/emprestimos`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual([]);
  });

  test("GET /livros/:id/emprestimos retorna 404 para livro inexistente", async () => {
    const resposta = await request(app).get("/livros/9999/emprestimos");
    expect(resposta.status).toBe(404);
  });
});
