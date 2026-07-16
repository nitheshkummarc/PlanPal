/**
 * validators.ts - Form validation utilities
 *
 * Why: Centralized validation logic for form inputs
 */

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const validateUsername = (username: string): boolean => {
  // 3-20 characters, alphanumeric and underscores only
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

export const validatePhone = (phone: string): boolean => {
  // Basic phone number validation (digits, spaces, hyphens, parentheses)
  const phoneRegex = /^[+]?[\d\s\-()]{10,15}$/;
  return phoneRegex.test(phone);
};

export const validateRequired = (value: string | null | undefined): boolean => {
  return value !== null && value !== undefined && value.toString().trim() !== '';
};

export const validateMinLength = (value: string | null | undefined, minLength: number): boolean => {
  return !!value && value.toString().length >= minLength;
};

export const validateMaxLength = (value: string | null | undefined, maxLength: number): boolean => {
  return !value || value.toString().length <= maxLength;
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateDate = (date: string): boolean => {
  const dateObject = new Date(date);
  return dateObject instanceof Date && !isNaN(dateObject.getTime());
};

export const validateFutureDate = (date: string): boolean => {
  const dateObject = new Date(date);
  const now = new Date();
  return validateDate(date) && dateObject > now;
};

export const validateRange = (value: string | number, min: number, max: number): boolean => {
  const numValue = Number(value);
  return !isNaN(numValue) && numValue >= min && numValue <= max;
};

export const validateAge = (birthDate: string): boolean => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age >= 13 && age <= 120; // Reasonable age range
};

// Validator entry for schema-based form validation
interface ValidatorEntry {
  validator: (value: string) => boolean;
  message: string;
}

type ValidationSchema = Record<string, ValidatorEntry[]>;

// Form validation schemas
export const loginSchema: ValidationSchema = {
  email: [
    { validator: validateRequired, message: 'Email is required' },
    { validator: validateEmail, message: 'Please enter a valid email address' }
  ],
  password: [
    { validator: validateRequired, message: 'Password is required' }
  ]
};

export const registerSchema: ValidationSchema = {
  username: [
    { validator: validateRequired, message: 'Username is required' },
    { validator: validateUsername, message: 'Username must be 3-20 characters, alphanumeric and underscores only' }
  ],
  email: [
    { validator: validateRequired, message: 'Email is required' },
    { validator: validateEmail, message: 'Please enter a valid email address' }
  ],
  password: [
    { validator: validateRequired, message: 'Password is required' },
    { validator: validatePassword, message: 'Password must be at least 8 characters with uppercase, lowercase, and number' }
  ],
  name: [
    { validator: validateRequired, message: 'Name is required' },
    { validator: (value: string) => validateMinLength(value, 2), message: 'Name must be at least 2 characters' },
    { validator: (value: string) => validateMaxLength(value, 50), message: 'Name must be less than 50 characters' }
  ]
};

export const eventSchema: ValidationSchema = {
  title: [
    { validator: validateRequired, message: 'Event title is required' },
    { validator: (value: string) => validateMinLength(value, 3), message: 'Title must be at least 3 characters' },
    { validator: (value: string) => validateMaxLength(value, 100), message: 'Title must be less than 100 characters' }
  ],
  description: [
    { validator: validateRequired, message: 'Event description is required' },
    { validator: (value: string) => validateMinLength(value, 10), message: 'Description must be at least 10 characters' }
  ],
  date_time: [
    { validator: validateRequired, message: 'Event date and time is required' },
    { validator: validateFutureDate, message: 'Event must be scheduled for a future date' }
  ],
  location: [
    { validator: validateRequired, message: 'Event location is required' },
    { validator: (value: string) => validateMinLength(value, 3), message: 'Location must be at least 3 characters' }
  ],
  place: [
    { validator: validateRequired, message: 'Venue/Place is required' },
    { validator: (value: string) => validateMinLength(value, 2), message: 'Place must be at least 2 characters' }
  ],
  city: [
    { validator: validateRequired, message: 'City is required' },
    { validator: (value: string) => validateMinLength(value, 2), message: 'City must be at least 2 characters' }
  ],
  state: [
    { validator: validateRequired, message: 'State is required' },
    { validator: (value: string) => validateMinLength(value, 2), message: 'State must be at least 2 characters' }
  ]
};

export const profileSchema: ValidationSchema = {
  name: [
    { validator: validateRequired, message: 'Name is required' },
    { validator: (value: string) => validateMinLength(value, 2), message: 'Name must be at least 2 characters' },
    { validator: (value: string) => validateMaxLength(value, 50), message: 'Name must be less than 50 characters' }
  ],
  email: [
    { validator: validateRequired, message: 'Email is required' },
    { validator: validateEmail, message: 'Please enter a valid email address' }
  ],
  phone: [
    { validator: (value: string) => !value || validatePhone(value), message: 'Please enter a valid phone number' }
  ],
  bio: [
    { validator: (value: string) => validateMaxLength(value, 500), message: 'Bio must be less than 500 characters' }
  ]
};

// Validation result types
interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

interface FieldValidationResult {
  isValid: boolean;
  error: string | null;
}

// Validation runner function
export const validateForm = (data: Record<string, any>, schema: ValidationSchema): FormValidationResult => {
  const errors: Record<string, string> = {};
  
  for (const field in schema) {
    const value = data[field];
    const validators = schema[field];
    
    for (const { validator, message } of validators) {
      if (!validator(value)) {
        errors[field] = message;
        break; // Stop at first validation error for this field
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Field-specific validation function
export const validateField = (value: string, fieldValidators: ValidatorEntry[]): FieldValidationResult => {
  for (const { validator, message } of fieldValidators) {
    if (!validator(value)) {
      return { isValid: false, error: message };
    }
  }
  return { isValid: true, error: null };
};
