import { Router } from 'express';
import { controllerNotificacao } from '../controllers/controllerNotificacao';

const router = Router();

router.get('/', (req, res) => controllerNotificacao.listarMinhas(req, res));
router.get('/nao-lidas/contagem', (req, res) => controllerNotificacao.contarNaoLidas(req, res));
router.patch('/lidas', (req, res) => controllerNotificacao.marcarTodasComoLidas(req, res));
router.get('/:id', (req, res) => controllerNotificacao.consultar(req, res));
router.patch('/:id/lida', (req, res) => controllerNotificacao.marcarUmaComoLida(req, res));

export default router;
