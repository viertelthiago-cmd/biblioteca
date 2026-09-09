// validacao.js
// Regras de validação dos dados de um livro, usadas tanto no POST (criação,
// onde titulo/autor são obrigatórios) quanto no PUT (atualização parcial,
// onde só validamos os campos que vierem preenchidos no corpo).

export const TAMANHO_MAXIMO_TITULO = 150;
export const TAMANHO_MAXIMO_AUTOR = 100;
export const TAMANHO_MAXIMO_GENERO = 60;

/**
 * @param {object} dados corpo da requisição
 * @param {{ parcial?: boolean }} opcoes quando parcial=true (PUT), só valida
 *        os campos presentes no objeto; quando parcial=false (POST), titulo
 *        e autor são sempre exigidos.
 * @returns {string[]} lista de mensagens de erro (vazia se tudo estiver ok)
 */
export function validarLivro(dados = {}, { parcial = false } = {}) {
  const erros = [];

  const temTitulo = Object.prototype.hasOwnProperty.call(dados, "titulo");
  const temAutor = Object.prototype.hasOwnProperty.call(dados, "autor");

  if (!parcial || temTitulo) {
    if (typeof dados.titulo !== "string" || dados.titulo.trim() === "") {
      erros.push("O campo titulo é obrigatório e não pode ser vazio");
    } else if (dados.titulo.length > TAMANHO_MAXIMO_TITULO) {
      erros.push(`O campo titulo deve ter no máximo ${TAMANHO_MAXIMO_TITULO} caracteres`);
    }
  }

  if (!parcial || temAutor) {
    if (typeof dados.autor !== "string" || dados.autor.trim() === "") {
      erros.push("O campo autor é obrigatório e não pode ser vazio");
    } else if (dados.autor.length > TAMANHO_MAXIMO_AUTOR) {
      erros.push(`O campo autor deve ter no máximo ${TAMANHO_MAXIMO_AUTOR} caracteres`);
    }
  }

  if (dados.disponivel !== undefined && typeof dados.disponivel !== "boolean") {
    erros.push("O campo disponivel deve ser um valor booleano (true ou false)");
  }

  if (dados.genero !== undefined && dados.genero !== null) {
    if (typeof dados.genero !== "string" || dados.genero.trim() === "") {
      erros.push("O campo genero, quando informado, não pode ser vazio");
    } else if (dados.genero.length > TAMANHO_MAXIMO_GENERO) {
      erros.push(`O campo genero deve ter no máximo ${TAMANHO_MAXIMO_GENERO} caracteres`);
    }
  }

  return erros;
}
