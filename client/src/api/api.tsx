import axios from "axios";
import type { ApiResponse } from "../types";

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";

export const api = axios.create({
  baseURL,
});

// types
export type SaveSchedulePayload = {
  resident_mcr: string;
  current_year: { month_block: number; posting_code: string }[];
  context: ApiResponse;
};

type JobStatus = "pending" | "running" | "completed" | "failed";

type JobStatusResponse = {
  id: string;
  status: JobStatus;
  progress: string;
  error?: string;
};

type SolveJobResponse = {
  job_id: string;
  status: string;
};

const pollJobStatus = async (
  jobId: string,
  onProgress?: (progress: string) => void,
  pollInterval: number = 3000
): Promise<ApiResponse> => {
  while (true) {
    const { data: status } = await api.get<JobStatusResponse>(`/jobs/${jobId}`);

    if (onProgress && status.progress) {
      onProgress(status.progress);
    }

    if (status.status === "completed") {
      const { data: result } = await api.get<ApiResponse>(`/jobs/${jobId}/result`);
      return result;
    }

    if (status.status === "failed") {
      throw new Error(status.error || "Solver failed");
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
};

// routes
export const solve = async (
  formData: FormData,
  onProgress?: (progress: string) => void
): Promise<ApiResponse> => {
  try {
    const { data } = await api.post<SolveJobResponse>("/solve", formData);

    if (onProgress) {
      onProgress("Starting solver...");
    }

    return await pollJobStatus(data.job_id, onProgress);
  } catch (err: any) {
    throw err;
  }
};

export const saveSchedule = async (
  payload: SaveSchedulePayload
): Promise<ApiResponse> => {
  try {
    const { data } = await api.post<ApiResponse>("/save", payload);
    return data;
  } catch (err: any) {
    throw err;
  }
};

export const checkDbStatus = async (): Promise<{ available: boolean }> => {
  const { data } = await api.get<{ available: boolean }>("/db-status");
  return data;
};

export const downloadCsv = async (apiResponse: ApiResponse): Promise<Blob> => {
  try {
    const { success, residents, resident_history } =
      apiResponse ?? {};

    const payload = {
      success,
      residents,
      resident_history,
    };

    const { data } = await api.post("/download-csv", payload, {
      responseType: "blob",
      headers: { "Content-Type": "application/json" },
    });
    return data as Blob;
  } catch (err: any) {
    throw err;
  }
};

export type SessionSummary = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  academic_year: string | null;
  notes: string | null;
  resident_count: number;
};

export type SessionFull = SessionSummary & {
  api_response: ApiResponse;
};

export type CreateSessionPayload = {
  name: string;
  api_response: ApiResponse;
  academic_year?: string;
  notes?: string;
};

export type UpdateSessionPayload = {
  name?: string;
  notes?: string;
  academic_year?: string;
  api_response?: ApiResponse;
};

export const listSessions = async (): Promise<{ sessions: SessionSummary[] }> => {
  const { data } = await api.get<{ sessions: SessionSummary[] }>("/sessions");
  return data;
};

export const createSession = async (
  payload: CreateSessionPayload
): Promise<{ success: boolean; session: SessionSummary }> => {
  const { data } = await api.post<{ success: boolean; session: SessionSummary }>(
    "/sessions",
    payload
  );
  return data;
};

export const getSession = async (sessionId: number): Promise<SessionFull> => {
  const { data } = await api.get<SessionFull>(`/sessions/${sessionId}`);
  return data;
};

export const getLatestSession = async (): Promise<{ session: SessionFull | null }> => {
  const { data } = await api.get<{ session: SessionFull | null }>("/sessions/latest");
  return data;
};

export const updateSession = async (
  sessionId: number,
  payload: UpdateSessionPayload
): Promise<{ success: boolean; session: SessionSummary }> => {
  const { data } = await api.put<{ success: boolean; session: SessionSummary }>(
    `/sessions/${sessionId}`,
    payload
  );
  return data;
};

export const deleteSession = async (
  sessionId: number
): Promise<{ success: boolean; message: string }> => {
  const { data } = await api.delete<{ success: boolean; message: string }>(
    `/sessions/${sessionId}`
  );
  return data;
};
