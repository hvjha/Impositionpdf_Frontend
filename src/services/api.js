const API_BASE_URL = '/api';

/**
 * Robust JSON response handler that gracefully handles 502 Bad Gateway,
 * HTML proxy errors, or server disconnects without throwing "Unexpected end of JSON input".
 */
async function handleResponse(response, defaultErrMsg = 'Request failed') {
  if (!response.ok) {
    let errMsg = `${defaultErrMsg} (${response.status} ${response.statusText || 'Error'})`;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errData = await response.json();
        if (errData?.message) errMsg = errData.message;
      } else {
        const text = await response.text();
        if (text && text.length < 150 && !text.includes('<!DOCTYPE')) {
          errMsg = `${defaultErrMsg}: ${text}`;
        } else if (response.status === 502) {
          errMsg = 'Backend server is temporarily unavailable or restarting (502 Bad Gateway). Please retry in a moment.';
        }
      }
    } catch {
      // Fallback to errMsg
    }
    throw new Error(errMsg);
  }

  try {
    return await response.json();
  } catch (err) {
    throw new Error(`Failed to parse server response: ${err.message}`);
  }
}

/**
 * Authentication: Login
 */
export async function loginUser(username, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  return handleResponse(response, 'Login failed. Please verify credentials.');
}

/**
 * Authentication: Get Current Session
 */
export async function getCurrentUser(token) {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return handleResponse(response, 'Session expired');
}

/**
 * Upload PDF File
 */
export async function uploadPdfFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/pdfs/upload`, {
    method: 'POST',
    body: formData,
  });

  return handleResponse(response, 'PDF Upload failed');
}

/**
 * Get Job History (Dual: Upload History & Output History)
 */
export async function getJobHistory() {
  const response = await fetch(`${API_BASE_URL}/pdfs/history`);
  return handleResponse(response, 'Failed to fetch job history');
}

/**
 * Get Full Job Details
 */
export async function getJobDetails(jobId) {
  const response = await fetch(`${API_BASE_URL}/pdfs/job/${jobId}`);
  return handleResponse(response, 'Failed to retrieve job details');
}

/**
 * Delete Job from History
 */
export async function deleteJob(jobId) {
  const response = await fetch(`${API_BASE_URL}/pdfs/job/${jobId}`, {
    method: 'DELETE'
  });
  return handleResponse(response, 'Failed to delete job');
}

/**
 * Analyze Production PDF
 */
export async function analyzePdfJob(jobId) {
  const response = await fetch(`${API_BASE_URL}/pdfs/${jobId}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  return handleResponse(response, 'PDF Analysis failed');
}

/**
 * Validate Production PDF
 */
export async function validatePdfJob(jobId) {
  const response = await fetch(`${API_BASE_URL}/pdfs/${jobId}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  return handleResponse(response, 'PDF Validation failed');
}

/**
 * Crop Production PDF
 */
export async function cropPdfJob(jobId, cropRule) {
  const response = await fetch(`${API_BASE_URL}/pdfs/${jobId}/crop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cropRule }),
  });

  return handleResponse(response, 'PDF Crop failed');
}

/**
 * Impose Production PDF
 */
export async function imposePdfJob(jobId, config) {
  const response = await fetch(`${API_BASE_URL}/pdfs/${jobId}/impose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  return handleResponse(response, 'PDF Imposition failed');
}

/**
 * Detect Artwork Non-White Margin Bounds
 */
export async function detectArtworkMargins(jobId) {
  const response = await fetch(`${API_BASE_URL}/pdfs/${jobId}/detect-margins`);
  return handleResponse(response, 'Failed to detect artwork margins');
}

/**
 * Get Output PDF details / stream URL
 */
export function getOutputPdfUrl(fileId) {
  return `${API_BASE_URL}/pdfs/output/${fileId}`;
}

/**
 * Get Job Output Direct Stream URL
 */
export function getJobOutputUrl(jobId) {
  return `${API_BASE_URL}/pdfs/${jobId}/output`;
}

/**
 * Get Job Source / Active Input PDF Stream URL
 */
export function getSourcePdfUrl(jobId) {
  return `${API_BASE_URL}/pdfs/${jobId}/source`;
}

/**
 * Health Check
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.success;
  } catch (err) {
    return false;
  }
}
