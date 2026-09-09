// tests/inicializacao.test.js — item 4: carregar dados já persistidos ao iniciar
import fs from "fs";
import path from "path";

const DB_LIVROS = path.resolve("dados/test-init-livros.json");
const DB_EMPRESTIMOS = path.resolve("dados/test-init-emprestimos.json");

fs.mkdirSync(path.dirname(DB_LIVROS), { recursive: true });

const livrosPreExistentes = [
  { id: 42, titulo: "Livro já salvo", autor: "Autor salvo", disponivel: true, genero: "Épico" },
];
fs.writeFileSync(DB_LIVROS, JSON.stringify(livrosPreExistentes, null, 2));
if (fs.existsSync(DB_EMPRESTIMOS)) fs.unlinkSync(DB_EMPRESTIMOS);

process.env.DB_FILE_LIVROS = DB_LIVROS;
process.env.DB_FILE_EMPRESTIMOS = DB_EMPRESTIMOS;

const request = (await import("supertest")).default;
const { default: app } = await import("../app.js");

afterAll(() => {
  [DB_LIVROS, DB_EMPRESTIMOS].forEach((arquivo) => {
    if (fs.existsSync(arquivo)) fs.unlinkSync(arquivo);
  });
});

test("a aplicação carrega os livros já persistidos em vez de recriar o seed padrão", async () => {
  const resposta = await request(app).get("/livros");

  expect(resposta.status).toBe(200);
  expect(resposta.body.total).toBe(1);
  expect(resposta.body.dados[0]).toMatchObject({ id: 42, titulo: "Livro já salvo" });
});
