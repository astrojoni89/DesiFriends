import { useState } from 'react';

type ValidationRules<T> = {
  [K in keyof T]?: (value: T[K]) => string | null;
};

export function useValidation<T extends Record<string, any>>(initialValues: T, rules: ValidationRules<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const handleChange = (field: keyof T, value: T[keyof T]) => {
    setValues(prev => ({ ...prev, [field]: value }));
    if (rules[field]) {
      const error = rules[field]!(value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const validate = () => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    (Object.keys(rules) as (keyof T)[]).forEach(field => {
      const value = values[field];
      const rule = rules[field];
      if (rule) {
        const error = rule(value);
        if (error) {
          newErrors[field] = error;
        }
      }
    });
    setErrors(newErrors);
    return newErrors;
  };

  return {
    values,
    errors,
    handleChange,
    validate,
    setValues,
    setErrors,
  };
}
