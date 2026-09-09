// swagger.js
import swaggerJsdoc from "swagger-jsdoc";

const opcoes = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API de Biblioteca",
      version: "2.0.0",
      description:
        "API REST para gerenciamento de livros: CRUD, empréstimo/devolução, " +
        "filtros/ordenação/paginação, categorias e histórico de empréstimos.",
    },
  },
  apis: ["./app.js"],
};

export default swaggerJsdoc(opcoes);
