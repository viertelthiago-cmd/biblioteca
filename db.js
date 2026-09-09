// db.js
// Módulo genérico de persistência em arquivo JSON.
// Cada "repositório" cuida de um arquivo (livros.json, emprestimos.json etc).
// O caminho do arquivo pode ser sobrescrito por variável de ambiente,
// o que é usado pelos testes para isolar o estado de cada suíte.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PASTA_DADOS = path.join(__dirname, "dados");

/**
 * Cria um repositório de persistência simples baseado em arquivo JSON.
 * @param {string} nomeArquivoPadrao nome do arquivo dentro da pasta "dados"
 * @param {string} variavelAmbiente nome da env var que pode sobrescrever o caminho do arquivo
 */
export function criarRepositorio(nomeArquivoPadrao, variavelAmbiente) {
  function getArquivo() {
    return process.env[variavelAmbiente] || path.join(PASTA_DADOS, nomeArquivoPadrao);
  }

  function carregar() {
    const arquivo = getArquivo();

    if (!fs.existsSync(arquivo)) {
      return [];
    }

    const conteudo = fs.readFileSync(arquivo, "utf-8");

    if (!conteudo || conteudo.trim() === "") {
      return [];
    }

    try {
      const dados = JSON.parse(conteudo);
      return Array.isArray(dados) ? dados : [];
    } catch {
      // Arquivo corrompido/ inválido: não derruba a aplicação, apenas
      // assume que não há dados persistidos ainda.
      return [];
    }
  }

  function salvar(dados) {
    const arquivo = getArquivo();
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2));
  }

  return { getArquivo, carregar, salvar };
}

export const repositorioLivros = criarRepositorio("livros.json", "DB_FILE_LIVROS");
export const repositorioEmprestimos = criarRepositorio("emprestimos.json", "DB_FILE_EMPRESTIMOS");
