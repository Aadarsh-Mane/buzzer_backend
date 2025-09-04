// utils/validation.js

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password validation regex (at least 6 characters, 1 uppercase, 1 lowercase, 1 number)
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/;

// Phone number validation regex
const phoneRegex = /^\+?[\d\s\-\(\)]+$/;

// URL validation regex
const urlRegex = /^https?:\/\/.+/;

// Validate email
export const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, message: "Email is required" };
  }

  if (!emailRegex.test(email)) {
    return { isValid: false, message: "Please enter a valid email address" };
  }

  return { isValid: true };
};

// Validate password
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, message: "Password is required" };
  }

  if (password.length < 6) {
    return {
      isValid: false,
      message: "Password must be at least 6 characters long",
    };
  }

  if (!passwordRegex.test(password)) {
    return {
      isValid: false,
      message:
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    };
  }

  return { isValid: true };
};

// Validate name
export const validateName = (name, fieldName = "Name") => {
  if (!name) {
    return { isValid: false, message: `${fieldName} is required` };
  }

  if (typeof name !== "string") {
    return { isValid: false, message: `${fieldName} must be a string` };
  }

  if (name.trim().length < 2) {
    return {
      isValid: false,
      message: `${fieldName} must be at least 2 characters long`,
    };
  }

  if (name.trim().length > 50) {
    return {
      isValid: false,
      message: `${fieldName} cannot exceed 50 characters`,
    };
  }

  return { isValid: true };
};

// Validate phone number
export const validatePhoneNumber = (phone) => {
  if (!phone) {
    return { isValid: true }; // Phone is optional
  }

  if (!phoneRegex.test(phone)) {
    return { isValid: false, message: "Please enter a valid phone number" };
  }

  return { isValid: true };
};

// Validate URL
export const validateUrl = (url, fieldName = "URL") => {
  if (!url) {
    return { isValid: true }; // URL is optional
  }

  if (!urlRegex.test(url)) {
    return { isValid: false, message: `Please enter a valid ${fieldName}` };
  }

  return { isValid: true };
};

// Validate user type
export const validateUserType = (userType) => {
  const validTypes = ["candidate", "interviewer", "admin"];

  if (!userType) {
    return { isValid: true }; // User type is optional, defaults to candidate
  }

  if (!validTypes.includes(userType)) {
    return {
      isValid: false,
      message: "User type must be candidate, interviewer, or admin",
    };
  }

  return { isValid: true };
};

// Main validation function for user input
export const validateInput = (data) => {
  const errors = [];

  // Validate email
  if (data.email !== undefined) {
    const emailValidation = validateEmail(data.email);
    if (!emailValidation.isValid) {
      errors.push({ field: "email", message: emailValidation.message });
    }
  }

  // Validate password
  if (data.password !== undefined) {
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid) {
      errors.push({ field: "password", message: passwordValidation.message });
    }
  }

  // Validate first name
  if (data.firstName !== undefined) {
    const firstNameValidation = validateName(data.firstName, "First name");
    if (!firstNameValidation.isValid) {
      errors.push({ field: "firstName", message: firstNameValidation.message });
    }
  }

  // Validate last name
  if (data.lastName !== undefined) {
    const lastNameValidation = validateName(data.lastName, "Last name");
    if (!lastNameValidation.isValid) {
      errors.push({ field: "lastName", message: lastNameValidation.message });
    }
  }

  // Validate phone number
  if (data.phoneNumber !== undefined) {
    const phoneValidation = validatePhoneNumber(data.phoneNumber);
    if (!phoneValidation.isValid) {
      errors.push({ field: "phoneNumber", message: phoneValidation.message });
    }
  }

  // Validate user type
  if (data.userType !== undefined) {
    const userTypeValidation = validateUserType(data.userType);
    if (!userTypeValidation.isValid) {
      errors.push({ field: "userType", message: userTypeValidation.message });
    }
  }

  // Validate website
  if (data.website !== undefined) {
    const websiteValidation = validateUrl(data.website, "website");
    if (!websiteValidation.isValid) {
      errors.push({ field: "website", message: websiteValidation.message });
    }
  }

  // Validate LinkedIn
  if (data.linkedin !== undefined) {
    const linkedinValidation = validateUrl(data.linkedin, "LinkedIn URL");
    if (!linkedinValidation.isValid) {
      errors.push({ field: "linkedin", message: linkedinValidation.message });
    } else if (data.linkedin && !data.linkedin.includes("linkedin.com")) {
      errors.push({
        field: "linkedin",
        message: "Please enter a valid LinkedIn URL",
      });
    }
  }

  // Validate GitHub
  if (data.github !== undefined) {
    const githubValidation = validateUrl(data.github, "GitHub URL");
    if (!githubValidation.isValid) {
      errors.push({ field: "github", message: githubValidation.message });
    } else if (data.github && !data.github.includes("github.com")) {
      errors.push({
        field: "github",
        message: "Please enter a valid GitHub URL",
      });
    }
  }

  // Validate bio
  if (data.bio !== undefined && data.bio.length > 500) {
    errors.push({ field: "bio", message: "Bio cannot exceed 500 characters" });
  }

  // Validate location
  if (data.location !== undefined && data.location.length > 100) {
    errors.push({
      field: "location",
      message: "Location cannot exceed 100 characters",
    });
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
};

// Validate registration data
export const validateRegistration = (data) => {
  const requiredFields = ["email", "password", "firstName", "lastName"];
  const errors = [];

  // Check for required fields
  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push({ field, message: `${field} is required` });
    }
  }

  // If required fields are missing, return early
  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Validate the input data
  return validateInput(data);
};

// Validate login data
export const validateLogin = (data) => {
  const errors = [];

  if (!data.email) {
    errors.push({ field: "email", message: "Email is required" });
  }

  if (!data.password) {
    errors.push({ field: "password", message: "Password is required" });
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
};

// Sanitize user input
export const sanitizeInput = (data) => {
  const sanitized = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      sanitized[key] = value.trim();
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};
