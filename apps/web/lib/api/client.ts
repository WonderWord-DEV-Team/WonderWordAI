export type ApiErrorCode = string;

type StructuredErrorBody = {
  error?:
    | string
    | {
        code?: string;
        message?: string;
      };
  message?: string;
};

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;

  constructor({
    status,
    code,
    message
  }: {
    status: number;
    code: ApiErrorCode;
    message: string;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function apiFetchJson<TResponse>(
  input: string,
  init: RequestInit = {}
): Promise<TResponse> {
  const response = await fetch(input, {
    ...init,
    headers: buildHeaders(init.headers, init.body)
  });
  const payload = await readJsonSafely(response);

  if (!response.ok) {
    throw toApiError(response, payload);
  }

  return payload as TResponse;
}

function buildHeaders(headers: RequestInit["headers"], body: RequestInit["body"]) {
  const nextHeaders = new Headers(headers);

  if (!nextHeaders.has("Accept")) {
    nextHeaders.set("Accept", "application/json");
  }

  if (body && !(body instanceof FormData) && !nextHeaders.has("Content-Type")) {
    nextHeaders.set("Content-Type", "application/json");
  }

  return nextHeaders;
}

async function readJsonSafely(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function toApiError(response: Response, payload: unknown) {
  const fallbackMessage = response.statusText || "Request failed.";
  const { code, message } = parseErrorPayload(payload);

  return new ApiError({
    status: response.status,
    code: code ?? `http_${response.status}`,
    message: message ?? fallbackMessage
  });
}

function parseErrorPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { code: null, message: null };
  }

  const errorBody = payload as StructuredErrorBody;

  if (typeof errorBody.error === "string") {
    return {
      code: errorBody.error,
      message: typeof errorBody.message === "string" ? errorBody.message : null
    };
  }

  if (errorBody.error && typeof errorBody.error === "object") {
    return {
      code:
        typeof errorBody.error.code === "string" ? errorBody.error.code : null,
      message:
        typeof errorBody.error.message === "string" ? errorBody.error.message : null
    };
  }

  return { code: null, message: null };
}
