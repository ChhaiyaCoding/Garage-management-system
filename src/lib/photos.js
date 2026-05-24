// ─── Job photo storage (Supabase Storage) ───
// Photos live in the `job-photos` bucket at the path:
//   {userId}/{jobId}/{uuid}.{ext}
// The bucket is public-read so we can use the public URL directly in <img>,
// but writes are scoped by RLS to the authenticated user (see schema.sql).
//
// In memory mode (no Supabase configured / not signed in) uploads fail
// gracefully — the caller should show the user a "sign in to upload" hint.

import { supabase, isConfigured } from './supabase';

const BUCKET = 'job-photos';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_SIZE = 8 * 1024 * 1024; // 8 MB

function randomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function extFromType(type) {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/heic') return 'heic';
  return 'jpg';
}

// Upload one file. Returns { ok, photo? , reason? }.
//   photo = { id, url, path, kind, uploadedAt, caption }
export async function uploadJobPhoto(userId, jobId, file, kind = 'other') {
  if (!isConfigured) return { ok: false, reason: 'not-configured' };
  if (!userId) return { ok: false, reason: 'not-signed-in' };
  if (!file) return { ok: false, reason: 'no-file' };
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, reason: 'unsupported-type · ' + file.type };
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, reason: `too-large · ${(file.size / 1024 / 1024).toFixed(1)} MB (max 8 MB)` };
  }

  const id = randomId();
  const path = `${userId}/${jobId}/${id}.${extFromType(file.type)}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (upErr) {
    console.warn('[photos] upload error:', upErr.message);
    return { ok: false, reason: upErr.message };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return {
    ok: true,
    photo: {
      id,
      url: data.publicUrl,
      path,
      kind,
      caption: '',
      uploadedAt: new Date().toISOString(),
    },
  };
}

// Remove the file from storage. Returns { ok, reason? }.
export async function deleteJobPhoto(path) {
  if (!isConfigured) return { ok: false, reason: 'not-configured' };
  if (!path) return { ok: false, reason: 'no-path' };
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    console.warn('[photos] delete error:', error.message);
    return { ok: false, reason: error.message };
  }
  return { ok: true };
}

export const PHOTO_KINDS = [
  { id: 'before', label: 'Before', labelKm: 'មុន' },
  { id: 'after', label: 'After', labelKm: 'ក្រោយ' },
  { id: 'other', label: 'Other', labelKm: 'ផ្សេងៗ' },
];
