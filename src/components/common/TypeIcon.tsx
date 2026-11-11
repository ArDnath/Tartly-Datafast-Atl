import { Row } from '@talivia/react-zen';
import type { ReactNode } from 'react';

function getIconName(type: 'browser' | 'country' | 'device' | 'os', value: string) {
  const input = (value || 'unknown').trim().toLowerCase();
  let normalized = '';
  let pendingDash = false;

  // Walk the string once instead of running a backtracking-prone regex over
  // untrusted user-agent or geography values.
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    const isLetter = code >= 97 && code <= 122;
    const isDigit = code >= 48 && code <= 57;

    if (isLetter || isDigit) {
      if (pendingDash && normalized) normalized += '-';
      normalized += input[index];
      pendingDash = false;
    } else {
      pendingDash = true;
    }
  }

  if (type !== 'os') {
    return normalized || 'unknown';
  }

  if (['macos', 'mac-os-x', 'os-x', 'macintosh'].includes(normalized)) {
    return 'mac-os';
  }

  if (normalized === 'android') {
    return 'android-os';
  }

  if (normalized === 'chromeos') {
    return 'chrome-os';
  }

  if (normalized === 'windows') {
    return 'windows-10';
  }

  return normalized || 'unknown';
}

export function TypeIcon({
  type,
  value,
  children,
}: {
  type: 'browser' | 'country' | 'device' | 'os';
  value: string;
  children?: ReactNode;
}) {
  return (
    <Row gap="3" alignItems="center">
      <img
        src={`/images/${type}/${getIconName(type, value)}.png`}
        onError={e => {
          e.currentTarget.src = `/images/${type}/unknown.png`;
        }}
        alt={value}
        width={type === 'country' ? undefined : 16}
        height={type === 'country' ? undefined : 16}
      />
      {children}
    </Row>
  );
}
