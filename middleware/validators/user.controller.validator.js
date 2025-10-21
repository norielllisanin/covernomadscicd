const { body } = require('express-validator');

exports.validate = (method) => {
	switch (method) {
		case 'logInUser': {
			return [
				body('username')
					.trim()
					.notEmpty()
					.withMessage('username is required.')
					.isString()
					.withMessage('username should be a string.'),
				body('password')
					.trim()
					.notEmpty()
					.withMessage('password is required.')
					.isString()
					.withMessage('password should be a string.'),
			];
		}
		case 'createUser': {
			return [
				body('firstName')
					.trim()
					.notEmpty()
					.withMessage('firstName is required.')
					.isLength({ min: 1, max: 256 })
					.withMessage(
						'firstName length should be between 1 and 256 characters.'
					)
					.matches(/^[A-Za-z\s]+$/)
					.withMessage('firstName must be alphabetic.'),
				body('lastName')
					.trim()
					.notEmpty()
					.withMessage('lastName is required.')
					.isLength({ min: 1, max: 256 })
					.withMessage(
						'lastName length should be between 1 and 256 characters.'
					)
					.matches(/^[A-Za-z\s]+$/)
					.withMessage('lastName must be alphabetic.'),
				body('email')
					.trim()
					.notEmpty()
					.withMessage('Email is required')
					.isEmail()
					.withMessage('Email is invalid')
					.normalizeEmail(),
				body('permission')
					.trim()
					.notEmpty()
					.withMessage('permission is required')
					.isIn(['SUPER', 'STANDARD'])
					.withMessage('permission is invalid'),
				body('dob')
					.trim()
					.notEmpty()
					.isISO8601({ strict: true, strictSeparator: true })
					.withMessage('dob must be in YYYY-MM-DD format'),
				body('landlineNumber')
					.trim()
					.optional()
					.isString()
					.withMessage('landlineNumber should be a string.')
					.isLength({ min: 1, max: 100 })
					.withMessage(
						'landlineNumber length should be between 1 and 100 characters.'
					),
				body('phoneNumber')
					.trim()
					.optional()
					.isString()
					.withMessage('phoneNumber should be a string.')
					.isLength({ min: 1, max: 100 })
					.withMessage(
						'phoneNumber length should be between 1 and 100 characters.'
					),
				body('location')
					.trim()
					.optional()
					.isString()
					.withMessage('location should be a string.')
					.isLength({ min: 1, max: 1000 })
					.withMessage(
						'location length should be between 1 and 1000 characters.'
					),
				body('incentivePercentage')
					.trim()
					.optional()
					.toFloat()
					.isFloat({ min: 0, max: 2.5 })
					.withMessage('incentivePercentage must be a 2.5'),
			];
		}
		case 'updateUser': {
			return [
				body('firstName')
					.trim()
					.optional()
					.isLength({ min: 1, max: 256 })
					.withMessage(
						'firstName length should be between 1 and 256 characters.'
					)
					.matches(/^[A-Za-z\s]+$/)
					.withMessage('firstName must be alphabetic.'),
				body('lastName')
					.trim()
					.optional()
					.isLength({ min: 1, max: 256 })
					.withMessage(
						'lastName length should be between 1 and 256 characters.'
					)
					.matches(/^[A-Za-z\s]+$/)
					.withMessage('lastName must be alphabetic.'),
				body('email')
					.trim()
					.optional()
					.isEmail()
					.withMessage('Email is invalid')
					.normalizeEmail(),
				body('permission')
					.trim()
					.optional()
					.isIn(['SUPER', 'STANDARD'])
					.withMessage('permission is invalid'),
				body('dob')
					.trim()
					.optional()
					.isISO8601({ strict: true, strictSeparator: true })
					.withMessage('dob must be in YYYY-MM-DD format'),
				body('landlineNumber')
					.trim()
					.optional()
					.isString()
					.withMessage('landlineNumber should be a string.')
					.isLength({ min: 1, max: 100 })
					.withMessage(
						'landlineNumber length should be between 1 and 100 characters.'
					),
				body('phoneNumber')
					.trim()
					.optional()
					.isString()
					.withMessage('phoneNumber should be a string.')
					.isLength({ min: 1, max: 100 })
					.withMessage(
						'phoneNumber length should be between 1 and 100 characters.'
					),
				body('location')
					.trim()
					.optional()
					.isString()
					.withMessage('location should be a string.')
					.isLength({ min: 1, max: 1000 })
					.withMessage(
						'location length should be between 1 and 1000 characters.'
					),
				body('incentivePercentage')
					.trim()
					.optional()
					.toFloat()
					.isFloat({ min: 0, max: 2.5 })
					.withMessage('incentivePercentage must be 0 or 2.5'),
			];
		}
	}
};
