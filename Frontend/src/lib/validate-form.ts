type Rule<T> = (value: T) => string | null;
type FieldRules<T> = { [K in keyof T]?: Rule<T[K]>[] };
type FieldErrors<T> = Partial<Record<keyof T, string>>;

export function createValidator<T extends Record<string, unknown>>(rules: FieldRules<T>) {
  return (data: T): { valid: boolean; errors: FieldErrors<T> } => {
    const errors: FieldErrors<T> = {};

    for (const [field, fieldRules] of Object.entries(rules) as [keyof T, Rule<T[keyof T]>[]][]) {
      if (!fieldRules) continue;
      for (const rule of fieldRules) {
        const error = rule(data[field]);
        if (error) {
          errors[field] = error;
          break;
        }
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  };
}

export const required = (label: string): Rule<unknown> => (value) => {
  if (value === undefined || value === null || (typeof value === "string" && !value.trim())) {
    return `${label} es requerido`;
  }
  return null;
};

export const minLength = (label: string, min: number): Rule<string> => (value) => {
  if (value && value.trim().length < min) {
    return `${label} debe tener al menos ${min} caracteres`;
  }
  return null;
};

export const minNumber = (label: string, min: number): Rule<number> => (value) => {
  if (value !== undefined && value !== null && value < min) {
    return `${label} debe ser al menos ${min}`;
  }
  return null;
};

export const isEmail = (label: string): Rule<string> => (value) => {
  if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    return `${label} no es un email valido`;
  }
  return null;
};

export const isPositiveInt = (label: string): Rule<number> => (value) => {
  if (value !== undefined && value !== null && (!Number.isInteger(value) || value < 1)) {
    return `${label} debe ser un numero entero positivo`;
  }
  return null;
};

export function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-[10px] text-red-500 mt-0.5">{error}</p>;
}
