'use strict';

/**
 * Minimal JSON Schema validator (subset of Draft 2020-12).
 *
 * Supports only the features used by .github/schemas/episode.schema.json:
 *   type, const, enum, required, properties, additionalProperties,
 *   pattern, minLength, maxLength, minimum, maximum,
 *   minItems, maxItems, items, uniqueItems, format (date-time, uri basic).
 *
 * Why not ajv? The repo has zero npm deps by convention (see
 * tests/test-skill-pack.js, tests/test-context-packets.js, etc.). Adding
 * ajv just for schema validation would violate that convention. This
 * validator is intentionally small and covers only what episode.schema.json
 * actually uses.
 *
 * Returns { valid: boolean, errors: string[] }.
 */

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const URI = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function validate(schema, data, path, errors) {
  if (schema.const !== undefined) {
    if (data !== schema.const) {
      errors.push(`${path || '/'}: expected const ${JSON.stringify(schema.const)}, got ${JSON.stringify(data)}`);
      return;
    }
  }

  if (schema.enum) {
    if (!schema.enum.includes(data)) {
      errors.push(`${path || '/'}: ${JSON.stringify(data)} not in enum ${JSON.stringify(schema.enum)}`);
      return;
    }
  }

  if (schema.type) {
    const t = schema.type;
    const okType =
      (t === 'string' && typeof data === 'string') ||
      (t === 'number' && typeof data === 'number' && Number.isFinite(data)) ||
      (t === 'integer' && typeof data === 'number' && Number.isInteger(data)) ||
      (t === 'boolean' && typeof data === 'boolean') ||
      (t === 'array' && Array.isArray(data)) ||
      (t === 'object' && isPlainObject(data)) ||
      (t === 'null' && data === null);
    if (!okType) {
      errors.push(`${path || '/'}: expected type ${t}, got ${Array.isArray(data) ? 'array' : typeof data}`);
      return;
    }
  }

  if (typeof data === 'string') {
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push(`${path}: minLength ${schema.minLength}, got ${data.length}`);
    }
    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      errors.push(`${path}: maxLength ${schema.maxLength}, got ${data.length}`);
    }
    if (schema.pattern && !(new RegExp(schema.pattern).test(data))) {
      errors.push(`${path}: does not match pattern ${schema.pattern}`);
    }
    if (schema.format === 'date-time' && !DATE_TIME.test(data)) {
      errors.push(`${path}: not a valid date-time`);
    }
    if (schema.format === 'uri' && !URI.test(data)) {
      errors.push(`${path}: not a valid uri`);
    }
  }

  if (typeof data === 'number') {
    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push(`${path}: minimum ${schema.minimum}, got ${data}`);
    }
    if (schema.maximum !== undefined && data > schema.maximum) {
      errors.push(`${path}: maximum ${schema.maximum}, got ${data}`);
    }
  }

  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push(`${path}: minItems ${schema.minItems}, got ${data.length}`);
    }
    if (schema.maxItems !== undefined && data.length > schema.maxItems) {
      errors.push(`${path}: maxItems ${schema.maxItems}, got ${data.length}`);
    }
    if (schema.uniqueItems) {
      const seen = new Set();
      for (const item of data) {
        const key = JSON.stringify(item);
        if (seen.has(key)) {
          errors.push(`${path}: duplicate item`);
          break;
        }
        seen.add(key);
      }
    }
    if (schema.items) {
      for (let i = 0; i < data.length; i++) {
        validate(schema.items, data[i], `${path}[${i}]`, errors);
      }
    }
  }

  if (isPlainObject(data)) {
    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in data)) {
          errors.push(`${path}: missing required "${key}"`);
        }
      }
    }
    const props = schema.properties || {};
    const allowAdditional = schema.additionalProperties !== false;
    for (const key of Object.keys(data)) {
      if (props[key]) {
        validate(props[key], data[key], `${path}/${key}`, errors);
      } else if (!allowAdditional) {
        errors.push(`${path}: additional property "${key}" not allowed`);
      }
    }
  }
}

function validateSchema(schema, data) {
  const errors = [];
  validate(schema, data, '', errors);
  return { valid: errors.length === 0, errors };
}

module.exports = { validateSchema };
