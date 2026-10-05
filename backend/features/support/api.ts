import request from "supertest";
import { criarApp } from "../../src/app";

export const api = request(criarApp);