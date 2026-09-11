import express from 'express';
import router from './routes/routeDepartamento';

const app = express();

app.use(express.json());
app.use('/departamento', router);
