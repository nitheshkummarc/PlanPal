/**
 * validators.ts - Form validation.
 *
 * The user rules (email, password, username, name, URL) and the field length limits
 * mirror backend/app/utils/validators.py, so a form that passes here is accepted by
 * the API. Keep both files in sync. The event form adds a few UI-only minimum lengths.
 */

export const LIMITS = {
  email: 254,
  name: 100,
  bio: 500,
  url: 500,
  tagName: 50,
  eventTitle: 200,
  eventDescription: 10000,
  place: 200,     // place and location
  city: 100,      // city and state
} as const;

export const EMAIL_MESSAGE = 'Please enter a valid email address';
export const PASSWORD_MESSAGE =
  "Password must be 8-128 characters with uppercase, lowercase, number, and special character, and must not contain common patterns like 'password' or '12345'";
export const USERNAME_MESSAGE = 'Username must be 3-20 characters and contain only letters, numbers, and underscores';
export const NAME_MESSAGE = 'Name may only contain letters, spaces, hyphens, apostrophes and dots (max 100 characters)';

const WEAK_PASSWORD_PATTERNS = ['password', '12345', 'qwerty', 'admin'];

export const validateEmail = (email: string): boolean => {
  if (!email || email.length > LIMITS.email || email.includes('..')) return false;
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

export const validateUsername = (username: string): boolean => /^[a-zA-Z0-9_]{3,20}$/.test(username);

export const validateName = (name: string): boolean => {
  // Letters from any script (including combining marks), spaces, - ' and .
  if (!name || !name.trim() || name.length > LIMITS.name) return false;
  return /^[\p{L}\p{M} .'-]+$/u.test(name);
};

export const validateHttpUrl = (url: string): boolean =>
  !url || (url.length <= LIMITS.url && /^https?:\/\/\S+$/.test(url));

export const validateHexColor = (color: string): boolean => !color || /^#[0-9a-fA-F]{6}$/.test(color);

export const validateRequired = (value: string | null | undefined): boolean =>
  value !== null && value !== undefined && value.toString().trim() !== '';

export const validateMinLength = (value: string | null | undefined, minLength: number): boolean =>
  !!value && value.toString().trim().length >= minLength;

export const validateMaxLength = (value: string | null | undefined, maxLength: number): boolean =>
  !value || value.toString().length <= maxLength;

export const validateFutureDate = (date: string): boolean => {
  const value = new Date(date);
  return !isNaN(value.getTime()) && value > new Date();
};

interface ValidatorEntry {
  validator: (value: string) => boolean;
  message: string;
}

type ValidationSchema = Record<string, ValidatorEntry[]>;

const required = (message: string): ValidatorEntry => ({ validator: validateRequired, message });
const minLength = (length: number, label: string): ValidatorEntry => ({
  validator: (value) => validateMinLength(value, length),
  message: `${label} must be at least ${length} characters`,
});
const maxLength = (length: number, label: string): ValidatorEntry => ({
  validator: (value) => validateMaxLength(value, length),
  message: `${label} must be ${length} characters or fewer`,
});

export const eventSchema: ValidationSchema = {
  title: [required('Event title is required'), minLength(3, 'Title'), maxLength(LIMITS.eventTitle, 'Title')],
  description: [
    required('Event description is required'),
    minLength(10, 'Description'),
    maxLength(LIMITS.eventDescription, 'Description'),
  ],
  date_time: [
    required('Event date and time is required'),
    { validator: validateFutureDate, message: 'Event must be scheduled for a future date' },
  ],
  location: [required('Event location is required'), minLength(3, 'Location'), maxLength(LIMITS.place, 'Location')],
  place: [required('Venue/Place is required'), minLength(2, 'Place'), maxLength(LIMITS.place, 'Place')],
  city: [required('City is required'), minLength(2, 'City'), maxLength(LIMITS.city, 'City')],
  state: [required('State is required'), minLength(2, 'State'), maxLength(LIMITS.city, 'State')],
};

export const profileSchema: ValidationSchema = {
  name: [required('Name is required'), { validator: validateName, message: NAME_MESSAGE }],
  username: [required('Username is required'), { validator: validateUsername, message: USERNAME_MESSAGE }],
  bio: [maxLength(LIMITS.bio, 'Bio')],
  profile_image_url: [{ validator: validateHttpUrl, message: 'Profile image URL must start with http:// or https://' }],
};

interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/** Run a schema against form data; reports the first failing rule per field. */
export const validateForm = (data: Record<string, unknown>, schema: ValidationSchema): FormValidationResult => {
  const errors: Record<string, string> = {};
  for (const field of Object.keys(schema)) {
    const raw = data[field];
    const value = typeof raw === 'string' ? raw : '';
    const failed = schema[field].find(({ validator }) => !validator(value));
    if (failed) errors[field] = failed.message;
  }
  return { isValid: Object.keys(errors).length === 0, errors };
};

/** Price field for paid events: a number greater than 0 (NUMERIC(10, 2) on the server). */
export const validatePrice = (value: string): boolean => {
  const price = Number(value);
  return value.trim() !== '' && Number.isFinite(price) && price > 0 && price < 100000000;
};

/** Optional capacity field: empty, or a whole number greater than 0. */
export const validateCapacity = (value: string): boolean => value === '' || /^[1-9]\d*$/.test(value);
