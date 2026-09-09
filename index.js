// index.js
import app from "./app.js";

const PORTA = process.env.PORT || 3000;

app.listen(PORTA, () => console.log(`Servidor rodando na porta ${PORTA}`));
