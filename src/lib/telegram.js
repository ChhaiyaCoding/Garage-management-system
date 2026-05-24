// ─── Telegram Bot integration ───
// All calls go directly to api.telegram.org from the browser. The bot
// token is stored per-user in state.config.telegram (Supabase JSONB),
// so it's only visible to the signed-in owner.
//
// Setup: owner creates a bot via @BotFather, pastes the token + their
// own chat ID into Settings → Integrations.  Customer chat IDs are
// optional — when missing, we fall back to the t.me/share URL.

const API_BASE = 'https://api.telegram.org';

// POST helper. Returns { ok, result?, description? }.
async function call(token, method, payload) {
  if (!token) return { ok: false, description: 'no-token' };
  try {
    const res = await fetch(`${API_BASE}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    return { ok: false, description: e.message || 'network-error' };
  }
}

// Verify the token belongs to a real bot.  Used by the "Test" button.
export async function getBotMe(token) {
  return call(token, 'getMe', {});
}

// Send a plain text message. `text` supports HTML formatting (use
// <b>, <i>, <code>, <a href=""> tags — see Telegram docs).
export async function sendMessage(token, chatId, text, opts = {}) {
  if (!chatId) return { ok: false, description: 'no-chat-id' };
  return call(token, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: opts.parseMode || 'HTML',
    disable_web_page_preview: opts.disablePreview ?? true,
  });
}

// Build a t.me share URL.  Falls back when we don't have the customer's
// chat ID — opens Telegram with a pre-filled message that the owner
// can forward to any chat manually.
export function buildShareUrl(text, urlToShare) {
  const params = new URLSearchParams();
  if (urlToShare) params.set('url', urlToShare);
  if (text) params.set('text', text);
  return `https://t.me/share/url?${params.toString()}`;
}

// Quick check whether owner has configured the bot.
export function isConfigured(config) {
  return !!(config?.telegram?.botToken && config?.telegram?.ownerChatId);
}

// ─── Pre-formatted Khmer messages ───

const STATUS_LABELS_KM = {
  waiting: 'រង់ចាំ',
  diagnose: 'ត្រួតពិនិត្យ',
  progress: 'កំពុងធ្វើ',
  parts: 'រង់ចាំ Parts',
  qc: 'ត្រួតពិនិត្យចុង',
  done: 'បានបញ្ចប់',
};

export function jobStatusMessage(job, customer, vehicle, garageName) {
  const status = STATUS_LABELS_KM[job.status] || job.status;
  return (
    `<b>🔧 ${garageName || 'Garage'}</b>\n` +
    `\n` +
    `ជម្រាបសួរ ${customer?.name || 'លោកអ្នក'},\n\n` +
    `Job <code>${job.id}</code> · ${job.title}\n` +
    `រថយន្ត: <b>${vehicle?.plate || '—'}</b>\n` +
    `ស្ថានភាព: <b>${status}</b>\n` +
    `\n` +
    `សូមអរគុណ​ដែល​ប្រើ​សេវាកម្ម​យើង។`
  );
}

export function newBookingMessage(booking, customer, vehicle) {
  return (
    `<b>📅 ការកក់​ថ្មី</b>\n` +
    `\n` +
    `<b>${customer?.name || booking.customer}</b>\n` +
    `📞 ${customer?.phone || '—'}\n` +
    `🚗 ${vehicle?.plate || booking.vehicle}\n` +
    `🛠 ${booking.service}\n` +
    `🕐 ${booking.date} · ${booking.time}`
  );
}

export function lowStockMessage(part) {
  return (
    `<b>⚠️ Parts ស្ទើរ​អស់</b>\n` +
    `\n` +
    `<b>${part.name}</b>\n` +
    `SKU: <code>${part.sku}</code>\n` +
    `សល់: <b>${part.stock}</b> (min ${part.minStock})\n` +
    `\n` +
    `សូម​ ​reorder ឆាប់​ៗ។`
  );
}

export function invoiceShareMessage(invoice, customer, garageName) {
  return (
    `🧾 *${garageName || 'Garage'}*\n` +
    `\n` +
    `${customer?.name || 'លោកអ្នក'},\n` +
    `Invoice ${invoice.id}\n` +
    `សរុប: $${(invoice.total || 0).toFixed(2)}\n` +
    `ស្ថានភាព: ${invoice.status?.toUpperCase() || '—'}`
  );
}

export function quoteShareMessage(quote, customer, garageName) {
  return (
    `📋 *${garageName || 'Garage'}*\n` +
    `\n` +
    `${customer?.name || 'លោកអ្នក'},\n` +
    `តម្លៃប៉ាន់ស្មាន ${quote.id}\n` +
    `សរុប: $${(quote.total || 0).toFixed(2)}\n` +
    `សុពលភាព: ${quote.valid || '—'}`
  );
}
