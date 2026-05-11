import { client } from '../api/client';

export interface AuditIssue {
  severity: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  action: string;
  actionTab: string;
}

export interface AuditResult {
  summary: {
    totalDocuments: number;
    authorizedDocuments: number;
    pendingDocuments: number;
    rejectedDocuments: number;
    totalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  };
  issues: AuditIssue[];
  stats: {
    currentMonthInvoices: number;
    lastMonthInvoices: number;
    totalClients: number;
    lowStockProducts: number;
    subscriptionDaysRemaining: number | null;
  };
  recommendations: string[];
  generatedAt: string;
}

/**
 * Obtiene auditoría real de documentos, inventario y suscripción desde el backend.
 * No usa IA generativa - analiza directamente la base de datos.
 */
export const getAuditReport = async (): Promise<AuditResult> => {
  const response = await client.get<AuditResult>('/api/ai/audit');
  return response.data;
};

/**
 * Obtiene recomendaciones de negocio desde el backend de IA.
 * Esta función es segura y no expone la API key.
 * @param salesData - Datos de ventas para el análisis.
 * @returns Una cadena de texto con las recomendaciones.
 */
export const getBusinessInsights = async (salesData: any): Promise<string> => {
  try {
    const response = await client.post<{ insights: string }>('/api/ai/insights', { salesData });
    return response.data.insights;
  } catch (error: any) {
    console.error("Error fetching AI insights:", error);
    if (error.response?.data?.error) {
      return `Error del servidor de IA: ${error.response.data.error}`;
    }
    return "No se pudo conectar con el servicio de análisis de IA.";
  }
};
