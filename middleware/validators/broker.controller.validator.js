const { body } = require('express-validator');

exports.validate = (method) => {
	switch (method) {
		case 'createBroker': {
			return [
				body('insurerId')
					.trim()
					.notEmpty()
					.withMessage('insurerId is required.')
					.isMongoId()
					.withMessage('insurerId should be a valid mongo ID.'),
				body('name')
					.trim()
					.notEmpty()
					.withMessage('name is required.')
					.isString()
					.withMessage('name should be a string.')
					.isLength({ min: 1, max: 1024 })
					.withMessage('name length should be between 1 and 1024 characters.'),
				body('code')
					.trim()
					.notEmpty()
					.withMessage('code is required.')
					.isLength({ min: 4, max: 4 })
					.withMessage('Code must be exactly 4 characters long.')
					.isUppercase()
					.withMessage('Code must be in uppercase.')
					.isString()
					.withMessage('Code must only contain alpha numeric characters.'),

				body('firstName')
					.trim()
					.notEmpty()
					.withMessage('firstName is required.')
					.isString()
					.withMessage('firstName should be a string.')
					.isLength({ min: 1, max: 256 })
					.withMessage(
						'firstName length should be between 1 and 256 characters.'
					),
				body('lastName')
					.trim()
					.notEmpty()
					.withMessage('lastName is required.')
					.isString()
					.withMessage('lastName should be a string.')
					.isLength({ min: 1, max: 256 })
					.withMessage(
						'lastName length should be between 1 and 256 characters.'
					),
				body('email')
					.trim()
					.notEmpty()
					.withMessage('Email is required')
					.isEmail()
					.withMessage('Email is invalid')
					.normalizeEmail(),
				body('dob')
					.trim()
					.isISO8601({ strict: true, strictSeparator: true })
					.withMessage('dob must be in YYYY-MM-DD format'),
			];
		}
		// case 'addAgencyCredit': {
		//    return [
		//       body('code')
		//          .trim()
		//          .notEmpty()
		//          .withMessage('code is required.')
		//          .isLength({ min: 3, max: 3 })
		//          .withMessage('Code must be exactly 3 characters long.')
		//          .isUppercase()
		//          .withMessage('Code must be in uppercase.')
		//          .isAlpha()
		//          .withMessage('Code must only contain alphabetic characters.'),
		//       body('topUpValue')
		//          .notEmpty()
		//          .withMessage('topUpValue is required')
		//          .isFloat({ min: 1 })
		//          .withMessage('topUpValue must be greater than 1'),
		//       body('remarks')
		//          .trim()
		//          .notEmpty()
		//          .withMessage('remarks is required.')
		//          .isString()
		//          .withMessage('remarks should be a string.'),
		//    ];
		// }
		// case 'updateAgency': {
		//    return [
		//       body('commissionPercentage')
		//          .notEmpty()
		//          .withMessage('commissionPercentage is required')
		//          .isFloat({ min: 0, max: 60 })
		//          .withMessage(
		//             'Discount Percentage must be an number between 0 and 60.'
		//          ),
		//       body('status')
		//          .notEmpty()
		//          .withMessage('Status is required')
		//          .toBoolean()
		//          .isBoolean({ strict: true })
		//          .withMessage('Status must be a boolean'),
		//       body('user.*.dob')
		//          .notEmpty()
		//          .withMessage('passengers.dob is required')
		//          .isISO8601({ format: 'YYYY-MM-DD' })
		//          .withMessage(
		//             'passengers.dob must be a valid date in "YYYY-MM-DD" format'
		//          ),
		//    ];
		// }
	}
};
