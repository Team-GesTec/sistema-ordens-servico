import express from 'express';
import router from './routes/routeDepartamento';

const app = express();
const PORT = process.env.PORT || 8000;
app.use(express.json());

app.use('/departamento', router);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
