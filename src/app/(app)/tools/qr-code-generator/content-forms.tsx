'use client';

export type ContentType = 'url' | 'text' | 'email' | 'phone' | 'sms' | 'wifi' | 'vcard';

export interface ContentState {
  url: { value: string };
  text: { value: string };
  email: { to: string; subject: string; body: string };
  phone: { value: string };
  sms: { number: string; message: string };
  wifi: { ssid: string; password: string; encryption: 'WPA' | 'WEP' | 'nopass'; hidden: boolean };
  vcard: {
    firstName: string;
    lastName: string;
    organization: string;
    title: string;
    phone: string;
    email: string;
    url: string;
  };
}

export const INITIAL_CONTENT: ContentState = {
  url: { value: 'https://bauerleopold.de' },
  text: { value: '' },
  email: { to: '', subject: '', body: '' },
  phone: { value: '' },
  sms: { number: '', message: '' },
  wifi: { ssid: '', password: '', encryption: 'WPA', hidden: false },
  vcard: {
    firstName: '',
    lastName: '',
    organization: '',
    title: '',
    phone: '',
    email: '',
    url: '',
  },
};

export const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'url', label: 'URL' },
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'E-Mail' },
  { value: 'phone', label: 'Telefon' },
  { value: 'sms', label: 'SMS' },
  { value: 'wifi', label: 'WiFi' },
  { value: 'vcard', label: 'vCard' },
];

function escapeWifi(value: string): string {
  return value.replace(/([\\;,":])/g, '\\$1');
}

export function buildQrString(type: ContentType, c: ContentState): string {
  switch (type) {
    case 'url':
      return c.url.value.trim();
    case 'text':
      return c.text.value;
    case 'email': {
      const params: string[] = [];
      if (c.email.subject) params.push(`subject=${encodeURIComponent(c.email.subject)}`);
      if (c.email.body) params.push(`body=${encodeURIComponent(c.email.body)}`);
      const query = params.length ? `?${params.join('&')}` : '';
      return c.email.to ? `mailto:${c.email.to}${query}` : '';
    }
    case 'phone':
      return c.phone.value ? `tel:${c.phone.value.replace(/\s+/g, '')}` : '';
    case 'sms':
      return c.sms.number
        ? `sms:${c.sms.number.replace(/\s+/g, '')}${c.sms.message ? `?body=${encodeURIComponent(c.sms.message)}` : ''}`
        : '';
    case 'wifi': {
      const { ssid, password, encryption, hidden } = c.wifi;
      if (!ssid) return '';
      const parts = [
        `T:${encryption}`,
        `S:${escapeWifi(ssid)}`,
        encryption !== 'nopass' && password ? `P:${escapeWifi(password)}` : '',
        hidden ? 'H:true' : '',
      ].filter(Boolean);
      return `WIFI:${parts.join(';')};;`;
    }
    case 'vcard': {
      const v = c.vcard;
      if (!v.firstName && !v.lastName && !v.email && !v.phone) return '';
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${v.lastName};${v.firstName}`,
        `FN:${[v.firstName, v.lastName].filter(Boolean).join(' ')}`,
        v.organization ? `ORG:${v.organization}` : '',
        v.title ? `TITLE:${v.title}` : '',
        v.phone ? `TEL:${v.phone}` : '',
        v.email ? `EMAIL:${v.email}` : '',
        v.url ? `URL:${v.url}` : '',
        'END:VCARD',
      ].filter(Boolean);
      return lines.join('\n');
    }
  }
}

const inputClass =
  'w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm font-sans placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors';
const labelClass = 'block text-white/40 text-xs font-sans tracking-wider uppercase mb-1.5';

export function ContentForm({
  type,
  state,
  onChange,
}: {
  type: ContentType;
  state: ContentState;
  onChange: <K extends ContentType>(type: K, value: ContentState[K]) => void;
}) {
  switch (type) {
    case 'url':
      return (
        <div>
          <label className={labelClass}>URL</label>
          <input
            type="url"
            inputMode="url"
            placeholder="https://example.com"
            value={state.url.value}
            onChange={(e) => onChange('url', { value: e.target.value })}
            className={inputClass}
          />
        </div>
      );
    case 'text':
      return (
        <div>
          <label className={labelClass}>Text</label>
          <textarea
            rows={4}
            placeholder="Beliebiger Text..."
            value={state.text.value}
            onChange={(e) => onChange('text', { value: e.target.value })}
            className={`${inputClass} resize-none`}
          />
        </div>
      );
    case 'email':
      return (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Empfänger</label>
            <input
              type="email"
              placeholder="name@domain.de"
              value={state.email.to}
              onChange={(e) => onChange('email', { ...state.email, to: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Betreff</label>
            <input
              type="text"
              value={state.email.subject}
              onChange={(e) => onChange('email', { ...state.email, subject: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Nachricht</label>
            <textarea
              rows={3}
              value={state.email.body}
              onChange={(e) => onChange('email', { ...state.email, body: e.target.value })}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
      );
    case 'phone':
      return (
        <div>
          <label className={labelClass}>Telefonnummer</label>
          <input
            type="tel"
            placeholder="+49 ..."
            value={state.phone.value}
            onChange={(e) => onChange('phone', { value: e.target.value })}
            className={inputClass}
          />
        </div>
      );
    case 'sms':
      return (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Nummer</label>
            <input
              type="tel"
              placeholder="+49 ..."
              value={state.sms.number}
              onChange={(e) => onChange('sms', { ...state.sms, number: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Nachricht</label>
            <textarea
              rows={3}
              value={state.sms.message}
              onChange={(e) => onChange('sms', { ...state.sms, message: e.target.value })}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
      );
    case 'wifi':
      return (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Netzwerkname (SSID)</label>
            <input
              type="text"
              value={state.wifi.ssid}
              onChange={(e) => onChange('wifi', { ...state.wifi, ssid: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Passwort</label>
            <input
              type="text"
              value={state.wifi.password}
              onChange={(e) => onChange('wifi', { ...state.wifi, password: e.target.value })}
              className={inputClass}
              disabled={state.wifi.encryption === 'nopass'}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Verschlüsselung</label>
              <select
                value={state.wifi.encryption}
                onChange={(e) =>
                  onChange('wifi', {
                    ...state.wifi,
                    encryption: e.target.value as 'WPA' | 'WEP' | 'nopass',
                  })
                }
                className={inputClass}
              >
                <option value="WPA">WPA / WPA2</option>
                <option value="WEP">WEP</option>
                <option value="nopass">Keine</option>
              </select>
            </div>
            <label className="flex items-end gap-2 pb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={state.wifi.hidden}
                onChange={(e) => onChange('wifi', { ...state.wifi, hidden: e.target.checked })}
                className="accent-white"
              />
              <span className="text-white/60 text-sm font-sans">Verstecktes Netzwerk</span>
            </label>
          </div>
        </div>
      );
    case 'vcard':
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Vorname</label>
              <input
                type="text"
                value={state.vcard.firstName}
                onChange={(e) => onChange('vcard', { ...state.vcard, firstName: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Nachname</label>
              <input
                type="text"
                value={state.vcard.lastName}
                onChange={(e) => onChange('vcard', { ...state.vcard, lastName: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Firma</label>
              <input
                type="text"
                value={state.vcard.organization}
                onChange={(e) =>
                  onChange('vcard', { ...state.vcard, organization: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Position</label>
              <input
                type="text"
                value={state.vcard.title}
                onChange={(e) => onChange('vcard', { ...state.vcard, title: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>E-Mail</label>
            <input
              type="email"
              value={state.vcard.email}
              onChange={(e) => onChange('vcard', { ...state.vcard, email: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Telefon</label>
            <input
              type="tel"
              value={state.vcard.phone}
              onChange={(e) => onChange('vcard', { ...state.vcard, phone: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Website</label>
            <input
              type="url"
              value={state.vcard.url}
              onChange={(e) => onChange('vcard', { ...state.vcard, url: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
      );
  }
}
