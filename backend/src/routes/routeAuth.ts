import { Router, type Request, type Response } from "express";
import { ControllerAuth, controller } from "../controllers/controllerAuth";
import { autenticar } from "../middlewares/authMiddleware";

export function criarRotasAuth(controllerAuth: ControllerAuth = controller) {
    const router = Router();

    router.post("/login", (req: Request, res: Response) =>
        controllerAuth.login(req, res)
    );

    router.get("/me", autenticar, (req: Request, res: Response) =>
        controllerAuth.me(req, res)
    );

    return router;
}

export default criarRotasAuth();