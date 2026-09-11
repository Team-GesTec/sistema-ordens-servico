import express from 'express';
import routerDP from './routes/routeDepartamento';
import routerPR from './routes/routeProjeto';

const app = express();
const PORT = process.env.PORT || 8000;
app.use(express.json());

app.use('/departamento', routerDP);
app.use('/projeto', routerPR);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
