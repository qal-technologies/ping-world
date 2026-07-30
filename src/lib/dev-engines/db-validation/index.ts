// ============================================================
// DB Validation Handler — TypeScript-style schema validation
// Supports ? optional syntax, default values, type coercion,
// SQL/NoSQL injection sanitization, relational + document DBs
// ============================================================

/**
 * Schema definition — use actual TS types as values.
 * Append "?" to a key name to mark it as optional.
 * Examples:
 *   { name: String, 'age?': Number, 'bio?': String }
 *   { active: Boolean, createdAt: Date, 'tags?': Array }
 */
export type DbSchemaType =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | DateConstructor
  | ArrayConstructor
  | ObjectConstructor
  | typeof JSON;

export type DbSchema = Record<string, DbSchemaType>;

export interface DbFieldResult {
  key: string;
  rawValue: unknown;
  coercedValue: unknown;
  type: string;
  required: boolean;
  hadDefault: boolean;
  validationError?: string;
  injectionFlag?: boolean;
}

export interface DbValidationResult {
  valid: boolean;
  sanitized: Record<string, unknown>;
  errors: string[];
  warnings: string[];
  fields: DbFieldResult[];
  injectionAttempts: number;
}

// ---- SQL injection patterns ----
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|EXEC|EXECUTE|UNION|CAST|CONVERT|DECLARE|GRANT|REVOKE|MERGE)\b)/gi,
  /('|"|;|--|\*|\/\*|\*\/|xp_|sp_|0x[0-9a-f]+)/gi,
  /(\bOR\b|\bAND\b)\s+['"0-9]/gi,
  /(SLEEP|WAITFOR|BENCHMARK|EXTRACTVALUE|UPDATEXML)\s*\(/gi,
];

const NOSQL_INJECTION_PATTERNS = [
  /\$where/gi,
  /\$gt|\$lt|\$gte|\$lte|\$ne|\$in|\$nin|\$or|\$and|\$not|\$nor/g,
  /\$regex|\$options|\$text|\$search/gi,
  /\$expr|\$jsonSchema|\$mod|\$type|\$size/gi,
  /javascript:/gi,
  /__proto__/g,
  /constructor\s*\[/g,
];

function hasInjection(val: string): boolean {
  return (
    SQL_INJECTION_PATTERNS.some((p) => p.test(val)) ||
    NOSQL_INJECTION_PATTERNS.some((p) => p.test(val))
  );
}

function sanitizeString(val: string): string {
  return val
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
    .replace(/`/g, '&#x60;');
}

/**
 * DB Validation Handler
 *
 * Usage:
 *   const db = new DbValidationHandler();
 *   const result = db.validate(
 *     { name: 'Alice', age: '28' },
 *     { name: String, 'age?': Number, 'bio?': String },
 *     { age: 0, bio: null }  // defaults
 *   );
 */
export class DbValidationHandler {
  /**
   * Validate and sanitize an object against a schema.
   * @param data      - The raw input object
   * @param schema    - Type schema using actual constructors (String, Number, Boolean, Date, Array, Object)
   *                    Append ? to key to mark optional: { 'field?': String }
   * @param defaults  - Default values for unset keys (nullifies required error for that key)
   */
  public validate(
    data: Record<string, unknown>,
    schema: DbSchema,
    defaults: Record<string, unknown> = {},
  ): DbValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sanitized: Record<string, unknown> = {};
    const fields: DbFieldResult[] = [];
    let injectionAttempts = 0;

    try {
      for (const rawKey of Object.keys(schema)) {
        const isOptional = rawKey.endsWith('?');
        const key = isOptional ? rawKey.slice(0, -1) : rawKey;
        const typeConstructor = schema[rawKey];
        const typeName = this._typeName(typeConstructor);
        const required = !isOptional;

        const rawValue =
          Object.prototype.hasOwnProperty.call(data, key) ?
            data[key]
          : undefined;
        const hasDefault = Object.prototype.hasOwnProperty.call(defaults, key);
        const effectiveRaw =
          rawValue === undefined && hasDefault ? defaults[key] : rawValue;

        const fieldResult: DbFieldResult = {
          key,
          rawValue: effectiveRaw,
          coercedValue: null,
          type: typeName,
          required,
          hadDefault: rawValue === undefined && hasDefault,
        };

        // Missing required field
        if (effectiveRaw === undefined || effectiveRaw === null) {
          if (required) {
            const msg = `Field "${key}" is required (type: ${typeName}) but was not provided.`;
            errors.push(msg);
            fieldResult.validationError = msg;
            sanitized[key] = null;
          } else {
            sanitized[key] = null;
            warnings.push(
              `Optional field "${key}" was not set. Defaulting to null.`,
            );
          }
          fields.push(fieldResult);
          continue;
        }

        // Injection check for strings
        if (typeof effectiveRaw === 'string') {
          if (hasInjection(effectiveRaw)) {
            injectionAttempts++;
            const msg = `Field "${key}" contains potentially malicious content and was sanitized.`;
            warnings.push(msg);
            fieldResult.injectionFlag = true;
          }
        }

        // Type coercion
        const { value, error } = this._coerce(
          effectiveRaw,
          typeConstructor,
          key,
        );
        if (error) {
          errors.push(error);
          fieldResult.validationError = error;
        }

        fieldResult.coercedValue = value;
        sanitized[key] =
          typeof value === 'string' ? sanitizeString(value) : value;
        fields.push(fieldResult);
      }

      // Warn about extra keys not in schema
      for (const dataKey of Object.keys(data)) {
        const inSchema = Object.keys(schema).some(
          (k) => k.replace(/\?$/, '') === dataKey,
        );
        if (!inSchema) {
          warnings.push(
            `Unknown field "${dataKey}" is not in the schema and was excluded.`,
          );
        }
      }

      return {
        valid: errors.length === 0,
        sanitized,
        errors,
        warnings,
        fields,
        injectionAttempts,
      };
    } catch (e) {
      return {
        valid: false,
        sanitized: {},
        errors: [`Validation error: ${(e as Error).message}`],
        warnings: [],
        fields: [],
        injectionAttempts: 0,
      };
    }
  }

  /** Backwards-compatible alias */
  public validateAndSanitize(
    data: Record<string, unknown>,
    schema: DbSchema,
    defaults: Record<string, unknown> = {},
  ): DbValidationResult {
    return this.validate(data, schema, defaults);
  }

  /** Quick schema check — returns true if valid */
  public isValid(
    data: Record<string, unknown>,
    schema: DbSchema,
    defaults: Record<string, unknown> = {},
  ): boolean {
    return this.validate(data, schema, defaults).valid;
  }

  /** Sanitize a raw string for safe DB insertion */
  public sanitizeInput(input: string): string {
    return sanitizeString(input);
  }

  /** Check a string for injection attempts */
  public hasInjectionRisk(input: string): boolean {
    return hasInjection(input);
  }

  // ---- Private ----

  private _coerce(
    val: unknown,
    type: DbSchemaType,
    key: string,
  ): { value: unknown; error?: string } {
    try {
      if (val === null || val === undefined) return { value: null };

      switch (type) {
        case String:
          return { value: String(val) };

        case Number: {
          const n = Number(val);
          if (isNaN(n))
            return {
              value: 0,
              error: `Field "${key}" expected Number but got non-numeric value "${val}". Defaulted to 0.`,
            };
          return { value: n };
        }

        case Boolean: {
          if (typeof val === 'boolean') return { value: val };
          const s = String(val).toLowerCase().trim();
          if (s === 'true' || s === '1' || s === 'yes') return { value: true };
          if (s === 'false' || s === '0' || s === 'no') return { value: false };
          return {
            value: Boolean(val),
            error: `Field "${key}" coerced ambiguous value "${val}" to Boolean.`,
          };
        }

        case Date: {
          const d =
            val instanceof Date ? val : new Date(val as string | number);
          if (isNaN(d.getTime()))
            return {
              value: null,
              error: `Field "${key}" has invalid date value "${val}".`,
            };
          return { value: d.toISOString() };
        }

        case Array: {
          if (Array.isArray(val)) return { value: val };
          try {
            const parsed = JSON.parse(String(val));
            return { value: Array.isArray(parsed) ? parsed : [val] };
          } catch {
            return { value: [val] };
          }
        }

        case Object: {
          if (typeof val === 'object' && !Array.isArray(val))
            return { value: val };
          try {
            const parsed = JSON.parse(String(val));
            return { value: typeof parsed === 'object' ? parsed : {} };
          } catch {
            return {
              value: {},
              error: `Field "${key}" expected Object but got "${typeof val}".`,
            };
          }
        }

        case JSON: {
          if (typeof val === 'string') {
            try {
              return { value: JSON.parse(val) };
            } catch {
              return { value: val, error: `Field "${key}" is not valid JSON.` };
            }
          }
          return { value: val };
        }

        default:
          return { value: val };
      }
    } catch (e) {
      return {
        value: null,
        error: `Field "${key}" coercion failed: ${(e as Error).message}`,
      };
    }
  }

  private _typeName(type: DbSchemaType): string {
    if (type === String) return 'string';
    if (type === Number) return 'number';
    if (type === Boolean) return 'boolean';
    if (type === Date) return 'date';
    if (type === Array) return 'array';
    if (type === Object) return 'object';
    if (type === JSON) return 'json';
    return 'unknown';
  }
}
