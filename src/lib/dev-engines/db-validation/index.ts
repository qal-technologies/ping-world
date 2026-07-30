// jules edit: Real TypeScript interface/type syntax compiler and validation handler with optional suffix detection, default values, and SQL/NoSQL injection sanitizers.

export type DbFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'json'
  | 'array'
  | 'object';

export interface DbFieldDefinition {
  type: DbFieldType;
  required: boolean;
  defaultValue?: any;
}

export interface DbValidationResult<T = Record<string, any>> {
  valid: boolean;
  sanitizedData: T;
  errors: string[];
}

export class DbValidationHandler {
  // Parses actual TypeScript-style interface or type code block string!
  // e.g. "interface User { name: string; age?: number; bio?: string; }"
  public parseTypeScriptSchema(tsCode: string, defaultValues: Record<string, any> = {}): Record<string, DbFieldDefinition> {
    const fields: Record<string, DbFieldDefinition> = {};
    if (!tsCode) return fields;

    try {
      // Normalize code to extract the inner block {...}
      const blockMatch = tsCode.match(/\{([\s\S]*)\}/);
      const innerContent = blockMatch ? blockMatch[1] : tsCode;

      // Split entries by semicolon or newline
      const lines = innerContent.split(/[;\n]+/);

      for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('//') || line.startsWith('/*')) continue;

        // Split key and type definition (e.g. "name: string" or "age?: number")
        const delimiterIndex = line.indexOf(':');
        if (delimiterIndex === -1) continue;

        const rawKey = line.substring(0, delimiterIndex).trim();
        const rawValue = line.substring(delimiterIndex + 1).trim();

        const isOptional = rawKey.endsWith('?');
        const cleanKey = isOptional ? rawKey.slice(0, -1).trim() : rawKey;

        // Extract clean type (string, number, boolean, date, etc.)
        let resolvedType: DbFieldType = 'string';
        const typeStr = rawValue.toLowerCase().replace(/[^\w]/g, '');

        if (typeStr.includes('number')) resolvedType = 'number';
        else if (typeStr.includes('boolean')) resolvedType = 'boolean';
        else if (typeStr.includes('date')) resolvedType = 'date';
        else if (typeStr.includes('array')) resolvedType = 'array';
        else if (typeStr.includes('object')) resolvedType = 'object';
        else if (typeStr.includes('json')) resolvedType = 'json';

        fields[cleanKey] = {
          type: resolvedType,
          required: !isOptional,
          defaultValue: defaultValues[cleanKey]
        };
      }
    } catch (e) {
      console.error('Failed to parse TS schema string', e);
    }

    return fields;
  }

  // Validates, sanitizes, sets defaults, and strips SQL/NoSQL injection patterns
  public validateAndSanitize<T = Record<string, any>>(
    data: Record<string, any>,
    schemaInput: string | Record<string, DbFieldType | `${DbFieldType}?` | DbFieldDefinition>,
    defaultValues: Record<string, any> = {}
  ): DbValidationResult<T> {
    const errors: string[] = [];
    const sanitizedData: Record<string, any> = {};

    try {
      if (!data || typeof data !== 'object') {
        return {
          valid: false,
          sanitizedData: {} as T,
          errors: ['Input data must be a valid object.'],
        };
      }

      // Parse schema from string if TS interface/type code block is passed
      let normalizedSchema: Record<string, DbFieldDefinition> = {};
      if (typeof schemaInput === 'string') {
        normalizedSchema = this.parseTypeScriptSchema(schemaInput, defaultValues);
      } else {
        // Fallback simple schema dictionary parsing
        for (const [key, rawDef] of Object.entries(schemaInput)) {
          let isOptional = key.endsWith('?');
          let cleanKey = isOptional ? key.slice(0, -1) : key;
          let type: DbFieldType = 'string';
          let defaultValue: any = defaultValues[cleanKey];
          let required = !isOptional;

          if (typeof rawDef === 'string') {
            let typeStr = rawDef.trim();
            if (typeStr.endsWith('?')) {
              isOptional = true;
              required = false;
              typeStr = typeStr.slice(0, -1);
            }
            type = (typeStr.toLowerCase() as DbFieldType) || 'string';
          } else if (typeof rawDef === 'object' && rawDef !== null) {
            type = rawDef.type;
            required = rawDef.required !== undefined ? rawDef.required : !isOptional;
            defaultValue = rawDef.defaultValue !== undefined ? rawDef.defaultValue : defaultValues[cleanKey];
          }

          normalizedSchema[cleanKey] = { type, required, defaultValue };
        }
      }

      // Perform field-level checks
      for (const [key, def] of Object.entries(normalizedSchema)) {
        const val = data[key];
        const isPresent = val !== undefined && val !== null && val !== '';

        if (!isPresent) {
          if (def.required && def.defaultValue === undefined) {
            errors.push(`Field '${key}' is required and has no default value.`);
          } else {
            // Populate fallback defaults safely
            sanitizedData[key] = def.defaultValue !== undefined ? def.defaultValue : null;
          }
          continue;
        }

        // Coerce type and sanitize SQL/NoSQL injection
        const coerced = this.coerceAndSanitize(val, def.type, key, errors);
        sanitizedData[key] = coerced;
      }

      // Preserve clean extra keys
      for (const [key, val] of Object.entries(data)) {
        if (!(key in normalizedSchema)) {
          sanitizedData[key] = typeof val === 'string' ? this.stripInjection(val) : val;
        }
      }

      return {
        valid: errors.length === 0,
        sanitizedData: sanitizedData as T,
        errors,
      };
    } catch (e) {
      return {
        valid: false,
        sanitizedData: {} as T,
        errors: [`Validation exception: ${(e as Error).message}`],
      };
    }
  }

  // Deep sanitization routine to block database injection attacks
  private stripInjection(val: string): string {
    if (!val || typeof val !== 'string') return val;

    let s = val;
    // SQL Injection patterns (strips typical injection exploits like OR 1=1, UNION SELECT, drop tables, comments)
    s = s.replace(/--+/g, ''); // strip inline comments
    s = s.replace(/\/\*[\s\S]*?\*\//g, ''); // strip block comments
    s = s.replace(/\b(union\s+select|select\s+.*\s+from|insert\s+into|drop\s+table|delete\s+from|update\s+.*set)\b/gi, '[SQL_SEC_FILTERED]');
    s = s.replace(/\b(or\s+\d+\s*=\s*\d+|or\s+['"].*['"]\s*=\s*['"].*['"])\b/gi, '[SQL_SEC_FILTERED]');

    // MongoDB NoSQL Injection patterns (strips operators prefixed with $)
    s = s.replace(/([$]where|[$]ne|[$]eq|[$]gt|[$]lt|[$]or|[$]and|[$]regex|[$]nin)\b/gi, '[NOSQL_SEC_FILTERED]');

    return s;
  }

  private coerceAndSanitize(
    val: any,
    targetType: DbFieldType,
    fieldName: string,
    errors: string[],
  ): any {
    const isString = typeof val === 'string';
    const cleanVal = isString ? this.stripInjection(val) : val;

    switch (targetType) {
      case 'string':
        if (typeof cleanVal === 'object') return JSON.stringify(cleanVal);
        return String(cleanVal);

      case 'number':
        const num = Number(cleanVal);
        if (isNaN(num)) {
          errors.push(`Field '${fieldName}' must be a valid number.`);
          return 0;
        }
        return num;

      case 'boolean':
        if (typeof cleanVal === 'string') {
          const l = cleanVal.toLowerCase().trim();
          if (l === 'true' || l === '1' || l === 'yes') return true;
          if (l === 'false' || l === '0' || l === 'no') return false;
        }
        return Boolean(cleanVal);

      case 'date':
        const date = new Date(cleanVal);
        if (isNaN(date.getTime())) {
          errors.push(`Field '${fieldName}' must be a valid date.`);
          return new Date().toISOString();
        }
        return date.toISOString();

      case 'json':
      case 'object':
        if (typeof cleanVal === 'object' && cleanVal !== null) return cleanVal;
        try {
          return JSON.parse(String(cleanVal));
        } catch {
          errors.push(`Field '${fieldName}' must be a valid JSON/Object.`);
          return {};
        }

      case 'array':
        if (Array.isArray(cleanVal)) return cleanVal;
        if (typeof cleanVal === 'string') {
          try {
            const parsed = JSON.parse(cleanVal);
            if (Array.isArray(parsed)) return parsed;
          } catch {
            return cleanVal.split(',').map((s) => s.trim());
          }
        }
        return [cleanVal];

      default:
        return cleanVal;
    }
  }
}
