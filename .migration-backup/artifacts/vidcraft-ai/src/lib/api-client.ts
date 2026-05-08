const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getToken() { return localStorage.getItem('vc_token'); }

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as any) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers, credentials: 'include' });
  return res;
}

export async function enhancePrompt(briefIdea: string): Promise<{ enhancedPrompt: string }> {
  const res = await apiFetch('/api/ai/enhance-prompt', { method: 'POST', body: JSON.stringify({ briefIdea }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Enhancement failed. Please try again.');
  return data;
}

export async function generateVideo(input: {
  prompt: string; model: string; ratio: string;
  imageUrl?: string; endImageUrl?: string;
}): Promise<{ videoUrl: string }> {
  const res = await apiFetch('/api/ai/generate-video', { method: 'POST', body: JSON.stringify(input) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Generation failed. Please try again.');
  return data;
}

export async function uploadToTmpFiles(formData: FormData): Promise<{ url: string }> {
  const file = formData.get('file') as File;
  if (!file) throw new Error('No file provided');
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  const res = await apiFetch('/api/ai/upload', {
    method: 'POST',
    body: JSON.stringify({ file: base64, filename: file.name, mimetype: file.type }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed. Please try again.');
  return data;
}

export async function downloadVideo(videoUrl: string, prompt: string): Promise<void> {
  const token = getToken();
  const slug = prompt.slice(0, 40).replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '-');
  const filename = `VidCraft-AI-${slug || Date.now()}`;
  const res = await fetch(`${BASE}/api/ai/download-video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: 'include',
    body: JSON.stringify({ videoUrl, filename }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any).error || 'Download failed. Please try again.');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.mp4`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function initializePayment(planId: string): Promise<{ authorizationUrl: string }> {
  const res = await apiFetch('/api/payments/initialize', { method: 'POST', body: JSON.stringify({ planId }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Payment initialization failed.');
  return data;
}

export async function verifyPayment(reference: string): Promise<{ message: string; user: any }> {
  const res = await apiFetch('/api/payments/verify', { method: 'POST', body: JSON.stringify({ reference }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Payment verification failed.');
  return data;
}

export async function getVideoHistory(page = 1, limit = 20, filters?: { model?: string; favorites?: boolean; search?: string }): Promise<{ videos: any[]; total: number; pages: number; page: number }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filters?.model && filters.model !== 'all') params.set('model', filters.model);
  if (filters?.favorites) params.set('favorites', 'true');
  if (filters?.search) params.set('search', filters.search);
  const res = await apiFetch(`/api/videos?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not load history.');
  return data;
}

export async function toggleFavorite(id: string): Promise<{ isFavorited: boolean }> {
  const res = await apiFetch(`/api/videos/${id}/favorite`, { method: 'PATCH' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not update favourite.');
  return data;
}

export async function deleteVideo(id: string): Promise<void> {
  const res = await apiFetch(`/api/videos/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not delete video.');
}

export async function getVideoStats(): Promise<{ totalVideos: number; byModel: { _id: string; count: number }[]; favorites: number }> {
  const res = await apiFetch('/api/videos/stats');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not load stats.');
  return data;
}

export async function updateProfile(name: string): Promise<void> {
  const res = await apiFetch('/api/auth/profile', { method: 'PATCH', body: JSON.stringify({ name }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Update failed.');
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await apiFetch('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Password change failed.');
}

export async function getReferralInfo(): Promise<{ referralCode: string; referralCount: number; creditsEarned: number }> {
  const res = await apiFetch('/api/auth/referral-info');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not load referral info.');
  return data;
}
