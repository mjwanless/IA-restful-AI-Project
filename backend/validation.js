const { body, param, validationResult } = require("express-validator");

const sanitizeInput = (value) => {
    if (typeof value !== "string") return value;

    return value
        .trim()
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/\//g, "&#x2F;")
        .replace(/\\/g, "&#92;")
        .replace(/\r?\n/g, " ")
        .replace(/\s+/g, " ");
};

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.warn("Validation Error:", {
            path: req.path,
            method: req.method,
            errors: errors.array(),
        });
        return res.status(400).json({
            errors: errors.array().map((err) => ({
                field: err.path,
                message: err.msg,
            })),
        });
    }
    next();
};

const emailValidationRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const registrationValidation = [
    body("first_name")
        .trim()
        .notEmpty()
        .withMessage("First name is required")
        .isLength({ min: 2, max: 50 })
        .withMessage("First name must be between 2 and 50 characters")
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage("First name can only contain letters")
        .customSanitizer(sanitizeInput),

    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Invalid email format")
        .matches(emailValidationRegex)
        .withMessage("Email format is invalid")
        .normalizeEmail({
            gmail_remove_dots: false,
            gmail_remove_subaddress: false,
        })
        .customSanitizer(sanitizeInput),

    body("password").notEmpty().withMessage("Password is required").customSanitizer(sanitizeInput),
];

const loginValidation = [
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Invalid email format")
        .matches(emailValidationRegex)
        .withMessage("Email format is invalid")
        .normalizeEmail({
            gmail_remove_dots: false,
            gmail_remove_subaddress: false,
        })
        .customSanitizer(sanitizeInput),

    body("password").notEmpty().withMessage("Password is required").customSanitizer(sanitizeInput),
];

const generateLyricsValidation = [
    body("artist")
        .trim()
        .notEmpty()
        .withMessage("Artist is required")
        .isLength({ max: 100 })
        .withMessage("Artist name too long")
        .matches(/^[a-zA-Z0-9\s\-']+$/)
        .withMessage("Artist name contains invalid characters")
        .customSanitizer(sanitizeInput),

    body("description")
        .trim()
        .notEmpty()
        .withMessage("Description is required")
        .isLength({ max: 500 })
        .withMessage("Description too long")
        .matches(/^[a-zA-Z0-9\s\-.,!?']+$/)
        .withMessage("Description contains invalid characters")
        .customSanitizer(sanitizeInput),

    body("max_length").optional().isInt({ min: 50, max: 200 }).withMessage("Length must be between 50 and 200").toInt(),
];

const userIdValidation = [
    param("id")
        .trim()
        .notEmpty()
        .withMessage("User ID is required")
        .custom((value) => {
            console.log("Received User ID for validation:", value);

            if (!value) {
                throw new Error("User ID cannot be empty");
            }

            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(value)) {
                console.error("Invalid UUID format:", value);
                throw new Error("Invalid User ID format");
            }

            return true;
        }),
];

const deepSanitize = (obj) => {
    if (obj === null || typeof obj !== "object") return obj;

    if (Array.isArray(obj)) {
        return obj.map(deepSanitize);
    }

    const sanitizedObj = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "string") {
            sanitizedObj[key] = sanitizeInput(value);
        } else if (typeof value === "object" && value !== null) {
            sanitizedObj[key] = deepSanitize(value);
        } else {
            sanitizedObj[key] = value;
        }
    }
    return sanitizedObj;
};

module.exports = {
    validate,
    sanitizeInput,
    deepSanitize,
    registrationValidation,
    loginValidation,
    generateLyricsValidation,
    userIdValidation,
};
