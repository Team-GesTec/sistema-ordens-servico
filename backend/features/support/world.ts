import { World, setWorldConstructor } from "@cucumber/cucumber";
import type { Response } from "supertest";

export class CustomWorld extends World{
    response?: Response;
    data: Record<string, any> = {};
}

setWorldConstructor(CustomWorld);