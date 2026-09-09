// tests/livros.test.js — CRUD básico + item 3: filtros, ordenação e paginação
import fs from "fs";
import path from "path";

const DB_LIVROS = path.resolve("dados/test-livros-livros.json");
const DB_EMPRESTIMOS = path.resolve("dados/test-livros-emprestimos.json");

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

// A aplicação nasce com o seed padrão: 2 livros
// (id 1: "O escaravelho do diabo" / Suspense / disponível
//  id 2: "E o vento levou" / Romance / indisponível)

describe("GET /livros", () => {
  test("retorna os livros do seed inicial dentro do envelope de paginação", async () => {
    const resposta = await request(app).get("/livros");

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ total: 2, pagina: 1, limite: 10 });
    expect(resposta.body.dados).toHaveLength(2);
  });

  test("filtra por título, sem diferenciar maiúsculas de minúsculas", async () => {
    const resposta = await request(app).get("/livros").query({ titulo: "ESCARAVELHO" });

    expect(resposta.status).toBe(200);
    expect(resposta.body.total).toBe(1);
    expect(resposta.body.dados[0].titulo).toBe("O escaravelho do diabo");
  });

  test("filtra por autor", async () => {
    const resposta = await request(app).get("/livros").query({ autor: "veríssimo" });

    expect(resposta.status).toBe(200);
    expect(resposta.body.total).toBe(1);
    expect(resposta.body.dados[0].autor).toBe("Erico Veríssimo");
  });

  test("filtra por disponivel=true", async () => {
    const resposta = await request(app).get("/livros").query({ disponivel: "true" });

    expect(resposta.status).toBe(200);
    resposta.body.dados.forEach((livro) => expect(livro.disponivel).toBe(true));
  });

  test("filtra por disponivel=false", async () => {
    const resposta = await request(app).get("/livros").query({ disponivel: "false" });

    expect(resposta.status).toBe(200);
    resposta.body.dados.forEach((livro) => expect(livro.disponivel).toBe(false));
  });

  test("filtra por gênero", async () => {
    const resposta = await request(app).get("/livros").query({ genero: "Romance" });

    expect(resposta.status).toBe(200);
    expect(resposta.body.total).toBe(1);
    expect(resposta.body.dados[0].titulo).toBe("E o vento levou");
  });

  test("retorna lista vazia quando o título não é encontrado", async () => {
    const resposta = await request(app).get("/livros").query({ titulo: "livro inexistente" });

    expect(resposta.status).toBe(200);
    expect(resposta.body.dados).toEqual([]);
    expect(resposta.body.total).toBe(0);
  });

  test("ordena por título", async () => {
    const resposta = await request(app).get("/livros").query({ ordenar: "titulo" });

    const titulos = resposta.body.dados.map((l) => l.titulo);
    const titulosOrdenados = [...titulos].sort((a, b) => a.localeCompare(b, "pt-BR"));
    expect(titulos).toEqual(titulosOrdenados);
  });

  test("ordena por autor", async () => {
    const resposta = await request(app).get("/livros").query({ ordenar: "autor" });

    const autores = resposta.body.dados.map((l) => l.autor);
    const autoresOrdenados = [...autores].sort((a, b) => a.localeCompare(b, "pt-BR"));
    expect(autores).toEqual(autoresOrdenados);
  });

  test("ignora valores de ordenação desconhecidos", async () => {
    const resposta = await request(app).get("/livros").query({ ordenar: "id" });
    expect(resposta.status).toBe(200);
  });

  test("pagina os resultados respeitando limite e página", async () => {
    // garante massa de dados suficiente para paginar
    for (let i = 0; i < 5; i += 1) {
      await request(app)
        .post("/livros")
        .send({ titulo: `Livro extra ${i}`, autor: "Autor extra" });
    }

    const pagina1 = await request(app).get("/livros").query({ pagina: 1, limite: 3 });
    const pagina2 = await request(app).get("/livros").query({ pagina: 2, limite: 3 });

    expect(pagina1.body.dados).toHaveLength(3);
    expect(pagina2.body.dados.length).toBeGreaterThan(0);
    expect(pagina1.body.dados).not.toEqual(pagina2.body.dados);
  });

  test("usa página e limite padrão quando os parâmetros são inválidos", async () => {
    const resposta = await request(app).get("/livros").query({ pagina: "abc", limite: "-1" });

    expect(resposta.status).toBe(200);
    expect(resposta.body.pagina).toBe(1);
    expect(resposta.body.limite).toBe(10);
  });

  test("combina múltiplos filtros e ordenação, como no exemplo do enunciado", async () => {
    await request(app)
      .post("/livros")
      .send({ titulo: "Memórias Póstumas", autor: "Machado de Assis", disponivel: true });

    const resposta = await request(app)
      .get("/livros")
      .query({ autor: "Machado", disponivel: "true", ordenar: "titulo" });

    expect(resposta.status).toBe(200);
    resposta.body.dados.forEach((livro) => {
      expect(livro.autor.toLowerCase()).toContain("machado");
      expect(livro.disponivel).toBe(true);
    });
  });
});

describe("GET /livros/:id", () => {
  test("retorna o livro encontrado", async () => {
    const resposta = await request(app).get("/livros/1");

    expect(resposta.status).toBe(200);
    expect(resposta.body.id).toBe(1);
  });

  test("retorna 404 para livro inexistente", async () => {
    const resposta = await request(app).get("/livros/9999");

    expect(resposta.status).toBe(404);
    expect(resposta.body).toEqual({ erro: "Livro não encontrado" });
  });
});

describe("POST /livros", () => {
  test("cria um novo livro com id incremental", async () => {
    const resposta = await request(app)
      .post("/livros")
      .send({ titulo: "Novo livro", autor: "Novo autor" });

    expect(resposta.status).toBe(201);
    expect(resposta.body.titulo).toBe("Novo livro");
    expect(typeof resposta.body.id).toBe("number");
  });
});

describe("PUT /livros/:id", () => {
  test("atualiza os campos informados", async () => {
    const resposta = await request(app)
      .put("/livros/1")
      .send({ titulo: "Título atualizado", autor: "Novo autor", disponivel: true });

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({
      id: 1,
      titulo: "Título atualizado",
      autor: "Novo autor",
      disponivel: true,
    });
  });

  test("retorna 404 quando o livro não existe", async () => {
    const resposta = await request(app).put("/livros/9999").send({ titulo: "Título" });

    expect(resposta.status).toBe(404);
    expect(resposta.body).toEqual({ erro: "Livro não encontrado" });
  });
});

describe("DELETE /livros/:id", () => {
  test("remove o livro encontrado", async () => {
    const criado = await request(app)
      .post("/livros")
      .send({ titulo: "Para remover", autor: "Autor" });

    const resposta = await request(app).delete(`/livros/${criado.body.id}`);

    expect(resposta.status).toBe(204);

    const busca = await request(app).get(`/livros/${criado.body.id}`);
    expect(busca.status).toBe(404);
  });

  test("retorna 404 quando o livro não existe", async () => {
    const resposta = await request(app).delete("/livros/9999");

    expect(resposta.status).toBe(404);
    expect(resposta.body).toEqual({ erro: "Livro não encontrado" });
  });
});
