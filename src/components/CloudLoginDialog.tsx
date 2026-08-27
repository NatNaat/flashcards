import { useState } from 'react';
import { useObservable } from 'dexie-react-hooks';
import { db } from '../db/db';

/** Alert messages carry placeholders like "{email}" to be filled in from `messageParams`. */
function formatMessage(message: string, params: Record<string, string>): string {
  return message.replace(/\{(\w+)\}/g, (match, key) => params[key] ?? match);
}

function inputProps(type: 'text' | 'email' | 'otp' | 'password') {
  switch (type) {
    case 'email':
      return { type: 'email', autoComplete: 'email', inputMode: 'email' as const };
    case 'otp':
      return { type: 'text', autoComplete: 'one-time-code', inputMode: 'numeric' as const, pattern: '[0-9]*' };
    case 'password':
      return { type: 'password', autoComplete: 'current-password' };
    default:
      return { type: 'text' };
  }
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: 15,
  fontFamily: 'inherit',
};

/**
 * Renders dexie-cloud's login/OTP/error prompts as real in-app UI (see `customLoginGui` in
 * db.ts) instead of the addon's default window.prompt() flow, which installed/standalone PWAs
 * on iOS silently fail to display — leaving the app stuck behind an invisible dialog.
 */
export default function CloudLoginDialog() {
  const interaction = useObservable(db.cloud.userInteraction);
  const [values, setValues] = useState<Record<string, string>>({});
  const [shownFor, setShownFor] = useState(interaction);

  // A new interaction (new prompt object) means the form fields reset, without a render-then-
  // reset round trip through an effect.
  if (interaction !== shownFor) {
    setShownFor(interaction);
    setValues({});
  }

  if (!interaction) return null;

  // Every union member's `fields` conforms to DXCInputField even though the object shapes
  // themselves differ per interaction type, and only DXCEmailPrompt/DXCGenericUserInteraction
  // declare `options` at all — normalize both here rather than narrowing per interaction type.
  const fields = Object.entries(
    interaction.fields as Record<string, { type: 'text' | 'email' | 'otp' | 'password'; label?: string; placeholder?: string }>,
  );
  const options = 'options' in interaction ? interaction.options : undefined;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(2px)' }} />
      <form
        className="card-surface card-enter"
        style={{ position: 'relative', width: '100%', maxWidth: 360, padding: 24 }}
        onSubmit={(e) => {
          e.preventDefault();
          interaction.onSubmit(values);
        }}
      >
        <h2 style={{ fontSize: 19, marginBottom: 14 }}>{interaction.title}</h2>

        {interaction.alerts?.map((alert, i) => (
          <p
            key={i}
            className="selectable-text"
            style={{
              fontSize: 13,
              marginBottom: 12,
              color: alert.type === 'error' ? 'var(--again)' : alert.type === 'warning' ? 'var(--hard)' : 'var(--text-dim)',
            }}
          >
            {formatMessage(alert.message, alert.messageParams)}
          </p>
        ))}

        {options && options.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: fields.length > 0 ? 16 : 0 }}>
            {options.map((opt) => (
              <button
                key={`${opt.name}:${opt.value}`}
                type="button"
                className="btn-pill"
                style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                onClick={() => interaction.onSubmit({ [opt.name]: opt.value })}
              >
                {opt.displayName}
              </button>
            ))}
          </div>
        )}

        {fields.map(([name, field], i) => (
          <div key={name} style={{ marginBottom: 16 }}>
            {field.label && (
              <label htmlFor={`cloud-login-${name}`} style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                {field.label}
              </label>
            )}
            <input
              id={`cloud-login-${name}`}
              className="selectable-text"
              value={values[name] ?? ''}
              placeholder={field.placeholder}
              onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
              autoFocus={i === 0}
              style={inputStyle}
              {...inputProps(field.type)}
            />
          </div>
        ))}

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className="btn-pill btn-primary" style={{ flex: 1 }}>
            {interaction.submitLabel}
          </button>
          {interaction.cancelLabel && (
            <button
              type="button"
              className="btn-pill"
              style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
              onClick={() => interaction.onCancel()}
            >
              {interaction.cancelLabel}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
