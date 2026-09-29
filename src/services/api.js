const API_BASE_URL = '/api';

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

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'PDF Upload failed');
  }
  return data;
}

/**
 * Analyze Production PDF
 */
export async function analyzePdfJob(jobId) {
  const response = await fetch(`${API_BASE_URL}/pdfs/${jobId}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'PDF Analysis failed');
  }
  return data;
}

/**
 * Validate Production PDF
 */
export async function validatePdfJob(jobId) {
  const response = await fetch(`${API_BASE_URL}/pdfs/${jobId}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'PDF Validation failed');
  }
  return data;
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

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'PDF Crop failed');
  }
  return data;
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

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'PDF Imposition failed');
  }
  return data;
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
