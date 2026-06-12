const BASE_URL = '/api';

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erreur HTTP ${res.status}`);
  }
  return data;
}

export async function getDefaultPipeline() {
  const res = await fetch(`${BASE_URL}/pipelines/default`);
  return handleResponse(res);
}

export async function runPipeline({ repoUrl, branch, stages }) {
  const res = await fetch(`${BASE_URL}/pipelines/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoUrl, branch, stages })
  });
  return handleResponse(res);
}

export async function getDeployments() {
  const res = await fetch(`${BASE_URL}/deployments`);
  return handleResponse(res);
}

export async function getDeployment(id) {
  const res = await fetch(`${BASE_URL}/deployments/${id}`);
  return handleResponse(res);
}
