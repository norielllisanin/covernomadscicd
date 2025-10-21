const { body } = require('express-validator');

exports.validate = (method) => {
	switch (method) {
		case 'createCmsAgency': {
			return [
				body('cmsId')
					.trim()
					.notEmpty()
					.withMessage('CMS ID is required.')
					.isMongoId()
					.withMessage('CMS ID must be a valid Mongo ObjectId'),

				body('type')
					.optional()
					.trim()
					.isString()
					.withMessage('Type must be a string'),

				body('name')
					.trim()
					.notEmpty()
					.withMessage('Name is required.')
					.isString()
					.withMessage('Name should be a string.')
					.isLength({ min: 1, max: 1024 })
					.withMessage('Name length should be between 1 and 1024 characters.'),

				body('code')
					.trim()
					.notEmpty()
					.withMessage('Code is required.')
					.isLength({ min: 4, max: 4 })
					.withMessage('Code must be exactly 4 characters long.')
					.isUppercase()
					.withMessage('Code must be in uppercase.')
					.isAlphanumeric()
					.withMessage('Code must only contain alphanumeric characters.'),

				body('commissionPercentage')
					.notEmpty()
					.withMessage('Commission percentage is required.')
					.isFloat({ min: 0, max: 60 })
					.withMessage(
						'Commission percentage must be a number between 0 and 60.'
					),

				body('isCreditApplicable')
					.optional()
					.isBoolean()
					.withMessage('isCreditApplicable must be a boolean'),

				body('credit')
					.optional()
					.isFloat({ min: 0 })
					.withMessage('Credit must be a positive number'),

				body('status')
					.optional()
					.isBoolean()
					.withMessage('Status must be a boolean'),

				body('balance')
					.notEmpty()
					.withMessage('Balance is required')
					.isFloat({ min: 0 })
					.withMessage('Balance must be a positive number'),

				body('maxBalance')
					.notEmpty()
					.withMessage('Max balance is required')
					.isFloat({ min: 1 })
					.withMessage('Max balance must be greater than 0'),

				body('offeredProducts')
					.optional()
					.isArray()
					.withMessage('Offered products must be an array'),

				body('offeredProducts.*')
					.optional()
					.isMongoId()
					.withMessage('Each offered product must be a valid Mongo ID'),
			];
		}
	}
};
