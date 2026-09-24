/**
 * validators.ts - Form validation utilities
 *
 * Why: Centralized validation logic for form inputs.
 * The user rules (email, password, username, name, URL) mirror
 * backend/app/utils/validators.py so a form that passes here is accepted by the
 * API. Keep both files in sync.
 */

export const EMAIL_MESSAGE = 'Please enter a valid email address';
export const PASSWORD_MESSAGE =
  "Password must be 8-128 characters with uppercase, lowercase, number, and special character, and must not contain common patterns like 'password' or '12345'";
export const USERNAME_MESSAGE = 'Username must be 3-20 characters and contain only letters, numbers, and underscores';
export const NAME_MESSAGE = 'Name may only contain letters, spaces, hyphens, apostrophes and dots (max 100 characters)';

const WEAK_PASSWORD_PATTERNS = ['password', '12345', 'qwerty', 'admin'];

export const validateEmail = (email: string): boolean => {
  if (!email || email.length > 254 || email.includes('..')) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
};

export const validatePassword = (password: string): boolean => {
  if (!password || password.length < 8 || password.length > 128) return false;
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) return false;
  // Special character = anything that isn't a letter, digit or whitespace
  if (!/[^A-Za-z0-9\s]/.test(password)) return false;
  const lower = password.toLowerCase();
  return !WEAK_PASSWORD_PATTERNS.some(pattern => lower.includes(pattern));
};

export const validateUsername = (username: string): boolean => {
  // 3-20 characters, alphanumeric and underscores only
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
};

export const validateName = (name: string): boolean => {
  // Letters from any language (incl. combining marks, e.g. Tamil), spaces, - ' and .
  if (!name || !name.trim() || name.length > 100) return false;
  return /^[\p{L}\p{M} .'-]+$/u.test(name);
};

export const validateHttpUrl = (url: string): boolean => {
  // Empty is allowed (field is optional); otherwise an http(s) URL
  return !url || (url.length <= 500 && /^https?:\/\/\S+$/.test(url));
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

export const validateDate = (date: string): boolean => {
  const dateObject = new Date(date);
  return dateObject instanceof Date && !isNaN(dateObject.getTime());
};

export const validateFutureDate = (date: string): boolean => {
  const dateObject = new Date(date);
  const now = new Date();
  return validateDate(date) && dateObject > now;
};

// Validator entry for schema-based form validation
interface ValidatorEntry {
  validator: (value: string) => boolean;
  message: string;
}

type ValidationSchema = Record<string, ValidatorEntry[]>;

export const eventSchema: ValidationSchema = {
  title: [
    { validator: validateRequired, message: 'Event title is required' },
    { validator: (value: string) => validateMinLength(value, 3), message: 'Title must be at least 3 characters' },
    { validator: (value: string) => validateMaxLength(value, 200), message: 'Title must be 200 characters or fewer' }
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
    { validator: validateName, message: NAME_MESSAGE }
  ],
  username: [
    { validator: validateRequired, message: 'Username is required' },
    { validator: validateUsername, message: USERNAME_MESSAGE }
  ],
  bio: [
    { validator: (value: string) => validateMaxLength(value, 500), message: 'Bio must be 500 characters or fewer' }
  ],
  profile_image_url: [
    { validator: validateHttpUrl, message: 'Profile image URL must start with http:// or https://' }
  ]
};

// Validation result types
interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
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
