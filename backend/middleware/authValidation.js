const { body, validationResult } = require("express-validator");

const handleValidation = (req, res, next) => {
  const errors = validationResult(req).formatWith((error) => ({
    field: error.path,
    message: error.msg,
  }));

  if (errors.isEmpty()) {
    return next();
  }

  return res.status(400).json({
    message: "Validation failed.",
    errors: errors.array({ onlyFirstError: true }),
  });
};

const validateRegister = [
  body("name")
    .trim()
    .notEmpty()
    .bail()
    .withMessage("Name is required.")
    .isLength({ min: 2, max: 60 })
    .withMessage("Name must be between 2 and 60 characters."),
  body("email")
    .trim()
    .notEmpty()
    .bail()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Enter a valid email address.")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .bail()
    .withMessage("Password is required.")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long."),
  body("role")
    .notEmpty()
    .bail()
    .withMessage("Role is required.")
    .isIn(["patient", "doctor"])
    .withMessage("Role must be either patient or doctor."),
  body("phone")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ min: 7, max: 20 })
    .withMessage("Phone must be between 7 and 20 characters."),
  handleValidation,
];

const validateLogin = [
  body("email")
    .trim()
    .notEmpty()
    .bail()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Enter a valid email address.")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required."),
  handleValidation,
];

module.exports = {
  validateRegister,
  validateLogin,
};
