import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { BASIS } from './admission.js';

export function loadV34(promptFile) {
  const bytes = readFileSync(promptFile);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== BASIS.prompt) throw new Error('PROMPT_SHA_MISMATCH');
  return Object.freeze({ id: 'jiegua/v34', sha256, text: bytes.toString('utf8') });
}

// Historical X-1 settings do not establish an adopted backend runtime.
export function checkRuntimeBinding(binding = {}) {
  const required = ['provider', 'model', 'maxOutputTokens', 'thinking', 'safety', 'evidenceRef'];
  if (required.some(k => binding[k] === undefined) ||
      !Number.isInteger(binding.maxOutputTokens) || binding.maxOutputTokens <= 0 ||
      !['off', 'low', 'medium', 'high'].includes(binding.thinking?.mode) ||
      typeof binding.safety?.profile !== 'string' || !binding.safety.profile ||
      !Array.isArray(binding.safety?.categories) || !binding.safety.categories.length ||
      binding.status !== 'VERIFIED' || typeof binding.evidenceRef !== 'string' || !binding.evidenceRef.trim() ||
      /UNKNOWN|DEFAULT/i.test(JSON.stringify(binding))) throw new Error('RUNTIME_BINDING_UNVERIFIED');
  return structuredClone(binding);
}
