// ─── KHQR (Bakong) generator ───
// Builds an EMVCo Merchant-Presented QR string per the NBC/Bakong KHQR spec,
// then renders it to a data-URL via the `qrcode` package.
// NOTE: requires the merchant's Bakong account id (e.g. "sok_dara@aclb").
// Verify with the official Bakong app before relying on it in production.

// EMV TLV: 2-digit id + 2-digit zero-padded length + value
function tlv(id, value) {
  if (value == null || value === "") return "";
  const v = String(value);
  const len = v.length.toString().padStart(2, "0");
  return `${id}${len}${v}`;
}

// CRC16/CCITT-FALSE — poly 0x1021, init 0xFFFF. Computed over data + "6304".
function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// cfg: { bakongAccountId, merchantName, merchantCity, mcc }
// amount in the given currency ("KHR" | "USD"); 0/undefined → static (reusable) QR.
export function buildKhqr({ accountId, merchantName, merchantCity, mcc, amount, currency, billNumber }) {
  if (!accountId) return null;
  const dynamic = amount && amount > 0;
  const curCode = currency === "KHR" ? "116" : "840";
  const name = (merchantName || "GARAGE").slice(0, 25);
  const city = (merchantCity || "Phnom Penh").slice(0, 15);

  let s = "";
  s += tlv("00", "01");                       // payload format indicator
  s += tlv("01", dynamic ? "12" : "11");       // dynamic (one-time) vs static (reusable)
  s += tlv("29", tlv("00", accountId));        // merchant account info — Bakong (individual)
  s += tlv("52", mcc || "5999");               // merchant category code
  s += tlv("53", curCode);                     // transaction currency
  if (dynamic) {
    const amt = currency === "KHR" ? String(Math.round(amount)) : Number(amount).toFixed(2);
    s += tlv("54", amt);                       // transaction amount
  }
  s += tlv("58", "KH");                         // country code
  s += tlv("59", name);                         // merchant name
  s += tlv("60", city);                         // merchant city
  if (billNumber) s += tlv("62", tlv("01", String(billNumber).slice(0, 25))); // additional data — bill no.
  s += "6304";                                  // CRC tag + length, value appended below
  return s + crc16(s);
}

// Build the KHQR string + render to a PNG data-URL. Returns { ok, dataUrl, payload } or { ok:false, reason }.
export async function khqrDataUrl(cfg) {
  const payload = buildKhqr(cfg);
  if (!payload) return { ok: false, reason: "no-account" };
  try {
    const QRCode = (await import("qrcode")).default;
    const dataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 256, errorCorrectionLevel: "M" });
    return { ok: true, dataUrl, payload };
  } catch (e) {
    return { ok: false, reason: e.message || "render-failed" };
  }
}
