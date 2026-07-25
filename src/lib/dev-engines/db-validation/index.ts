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
  required?: boolean;
  defaultValue?: any;
}

export type ConciseDbSchema = Record<
  string,
  DbFieldType | `${DbFieldType}?` | DbFieldDefinition
>;

export interface DbValidationResult<T = Record<string, any>> {
  valid: boolean;
  sanitizedData: T;
  errors: string[];
}

export class DbValidationHandler {
  public validateAndSanitize<T = Record<string, any>>(
    data: Record<string, any>,
    schema: ConciseDbSchema,
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

      const normalizedSchema = this.normalizeSchema(schema);

      for (const [key, def] of Object.entries(normalizedSchema)) {
        const val = data[key];
        const isPresent = val !== undefined && val !== null && val !== '';

        if (!isPresent) {
          if (def.required) {
            errors.push(
              `Field '${key}' is required and cannot be null or empty.`,
            );
          } else {
            // Fill fallback for optional missing field
            sanitizedData[key] =
              def.defaultValue !== undefined ? def.defaultValue : null;
          }
          continue;
        }

        // Coerce type safely
        const coerced = this.coerceType(val, def.type, key, errors);
        sanitizedData[key] = coerced;
      }

      // Preserve extra keys safely
      for (const [key, val] of Object.entries(data)) {
        if (!(key in normalizedSchema)) {
          sanitizedData[key] = val;
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

  private normalizeSchema(
    schema: ConciseDbSchema,
  ): Record<string, DbFieldDefinition> {
    const normalized: Record<string, DbFieldDefinition> = {};

    for (const [rawKey, rawDef] of Object.entries(schema)) {
      let isOptional = rawKey.endsWith('?');
      let cleanKey = isOptional ? rawKey.slice(0, -1) : rawKey;
      let type: DbFieldType = 'string';
      let defaultValue: any = undefined;
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
        required =
          rawDef.required !== undefined ? rawDef.required : !isOptional;
        defaultValue = rawDef.defaultValue;
      }

      normalized[cleanKey] = {
        type,
        required,
        defaultValue,
      };
    }

    return normalized;
  }

  private coerceType(
    val: any,
    targetType: DbFieldType,
    fieldName: string,
    errors: string[],
  ): any {
    switch (targetType) {
      case 'string':
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);

      case 'number':
        const num = Number(val);
        if (isNaN(num)) {
          errors.push(`Field '${fieldName}' must be a valid number.`);
          return 0;
        }
        return num;

      case 'boolean':
        if (typeof val === 'string') {
          const l = val.toLowerCase().trim();
          if (l === 'true' || l === '1') return true;
          if (l === 'false' || l === '0') return false;
        }
        return Boolean(val);

      case 'date':
        const date = new Date(val);
        if (isNaN(date.getTime())) {
          errors.push(`Field '${fieldName}' must be a valid ISO date.`);
          return new Date().toISOString();
        }
        return date.toISOString();

      case 'json':
      case 'object':
        if (typeof val === 'object' && val !== null) return val;
        try {
          return JSON.parse(String(val));
        } catch {
          errors.push(`Field '${fieldName}' must be valid JSON/Object.`);
          return {};
        }

      case 'array':
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) return parsed;
          } catch {
            return val.split(',').map((s) => s.trim());
          }
        }
        return [val];

      default:
        return val;
    }
  }
}
