const { body } = require('express-validator');

exports.validate = (method) => {
	switch (method) {
		case 'createPartner': {
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
					.isLength({ min: 3, max: 3 })
					.withMessage('Code must be exactly 3 characters long.')
					.isUppercase()
					.withMessage('Code must be in uppercase.')
					.isAlpha()
					.withMessage('Code must only contain alphabetic characters.'),
				body('countryCode')
					.trim()
					.notEmpty()
					.withMessage('countryCode is required')
					.isISO31661Alpha2()
					.withMessage('countryCode must be a valid alpha-2 country code'),
				body('commissionPercentage')
					.notEmpty()
					.withMessage('commissionPercentage is required')
					.isInt({ min: 0, max: 100 })
					.withMessage(
						'commissionPercentage must be an integer between 1 and 100'
					),
			];
		}
	}
};
