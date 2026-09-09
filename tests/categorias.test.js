// tests/categorias.test.js — item 5: categorias e gêneros
import fs from "fs";
import path from "path";

const DB_LIVROS = path.resolve("dados/test-categorias-livros.json");
const DB_EMPRESTIMOS = path.resolve("dados/test-categorias-emprestimos.json");

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

// Seed seguro: "O escaravelho do diabo" / Suspense e "E o vento levou" / Romance

describe("GET /categorias", () => {
  test("lista as categorias já existentes no seed, sem duplicar", async () => {
    const resposta = await request(app).get("/categorias");

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual(expect.arrayContaining(["Suspense", "Romance"]));
  });

  test("inclui um novo gênero cadastrado e não duplica gêneros repetidos", async () => {
    await request(app)
      .post("/livros")
      .send({ titulo: "Livro de terror 1", autor: "Autor", genero: "Terror" });
    await request(app)
      .post("/livros")
      .send({ titulo: "Livro de terror 2", autor: "Autor", genero: "Terror" });

    const resposta = await request(app).get("/categorias");

    const ocorrencias = resposta.body.filter((g) => g === "Terror");
    expect(ocorrencias).toHaveLength(1);
  });

  test("não inclui entradas vazias quando um livro não tem gênero definido", async () => {
    await request(app).post("/livros").send({ titulo: "Sem gênero", autor: "Autor" });

    const resposta = await request(app).get("/categorias");

    expect(resposta.body).not.toContain(null);
    expect(resposta.body).not.toContain("");
  });
});

describe("GET /livros?genero=", () => {
  test("filtra livros por gênero", async () => {
    await request(app)
      .post("/livros")
      .send({ titulo: "Ficção científica 1", autor: "Autor", genero: "Ficção científica" });

    const resposta = await request(app)
      .get("/livros")
      .query({ genero: "Ficção científica" });

    expect(resposta.status).toBe(200);
    expect(resposta.body.total).toBe(1);
    expect(resposta.body.dados[0].genero).toBe("Ficção científica");
  });

  test("retorna lista vazia para um gênero sem livros cadastrados", async () => {
    const resposta = await request(app).get("/livros").query({ genero: "Poesia" });

    expect(resposta.status).toBe(200);
    expect(resposta.body.dados).toEqual([]);
  });
});
