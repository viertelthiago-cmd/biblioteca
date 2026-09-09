// tests/db.test.js — item 4: persistência dos dados em JSON
import fs from "fs";
import path from "path";

const ARQUIVO = path.resolve("dados/test-db-unit-livros.json");

fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
if (fs.existsSync(ARQUIVO)) fs.unlinkSync(ARQUIVO);

process.env.DB_FILE_LIVROS = ARQUIVO;

const { repositorioLivros } = await import("../db.js");

afterAll(() => {
  if (fs.existsSync(ARQUIVO)) fs.unlinkSync(ARQUIVO);
});

test("carregar retorna array vazio quando o arquivo ainda não existe", () => {
  if (fs.existsSync(ARQUIVO)) fs.unlinkSync(ARQUIVO);
  expect(repositorioLivros.carregar()).toEqual([]);
});

test("salvar grava os dados e carregar lê exatamente o que foi salvo", () => {
  const dados = [{ id: 1, titulo: "Livro de teste", autor: "Autor teste" }];

  repositorioLivros.salvar(dados);

  expect(fs.existsSync(ARQUIVO)).toBe(true);
  expect(repositorioLivros.carregar()).toEqual(dados);
});

test("carregar retorna array vazio quando o arquivo está vazio", () => {
  fs.writeFileSync(ARQUIVO, "");
  expect(repositorioLivros.carregar()).toEqual([]);
});

test("carregar retorna array vazio quando o conteúdo do arquivo é inválido", () => {
  fs.writeFileSync(ARQUIVO, "{ isto não é um json válido");
  expect(repositorioLivros.carregar()).toEqual([]);
});

test("carregar retorna array vazio quando o conteúdo é um JSON que não é array", () => {
  fs.writeFileSync(ARQUIVO, JSON.stringify({ nao: "é um array" }));
  expect(repositorioLivros.carregar()).toEqual([]);
});

test("getArquivo respeita a variável de ambiente configurada", () => {
  expect(repositorioLivros.getArquivo()).toBe(ARQUIVO);
});

test("getArquivo usa o caminho padrão quando a variável de ambiente não está definida", async () => {
  const original = process.env.DB_FILE_LIVROS;
  delete process.env.DB_FILE_LIVROS;

  const { criarRepositorio } = await import("../db.js");
  const repositorioTemporario = criarRepositorio("arquivo-padrao-teste.json", "DB_FILE_LIVROS");

  expect(repositorioTemporario.getArquivo()).toContain("arquivo-padrao-teste.json");
  expect(repositorioTemporario.getArquivo()).not.toBe(ARQUIVO);

  process.env.DB_FILE_LIVROS = original;
});
