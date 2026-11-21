import { apiRequest } from "./api";
import type { DashboardHoras } from "../types/api";

export const dashboardService = {
    horas(): Promise<DashboardHoras> {
        return apiRequest<DashboardHoras>("/dashboard/horas");
    },
};
