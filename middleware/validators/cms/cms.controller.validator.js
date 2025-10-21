const { body } = require('express-validator');

exports.validate = (method) => {
	switch (method) {
		case 'createCms': {
			return [
				body('name')
					.notEmpty()
					.withMessage('Name is required')
					.isString()
					.withMessage('Name must be a string')
					.isLength({ max: 100 })
					.withMessage('Name must be at most 100 characters long'),
				body('code')
					.notEmpty()
					.withMessage('Code is required')
					.isString()
					.withMessage('Code must be a string')
					.isLength({ min: 3, max: 3 })
					.withMessage('Code must be exactly 3 characters long')
					.matches(/^[A-Z]{3}$/)
					.withMessage('Code must be a 3 alphabet uppercase string'),
				body('fixedCommission')
					.optional()
					.isFloat({ min: 1, max: 50 })
					.withMessage(
						'Fixed commission must be a positive number between 1 and 50'
					)
					.custom((value) => {
						if (value && !/^\d+(\.\d{1,2})?$/.test(value.toString())) {
							throw new Error(
								'Fixed commission must have up to 2 decimal places'
							);
						}
						return true;
					}),
				body('cmsAdmin')
					.notEmpty()
					.withMessage('CMS Admin is required')
					.isObject()
					.withMessage('CMS Admin must be an object'),
				body('insurerId')
					.notEmpty()
					.withMessage('Insurer ID is required')
					.isString()
					.withMessage('Insurer ID must be a string')
					.matches(/^[a-f\d]{24}$/i)
					.withMessage('Insurer ID must be a valid 24-character ObjectId'),
				body('cmsAdmin.firstName')
					.notEmpty()
					.withMessage('First name is required')
					.isString()
					.withMessage('First name must be a string')
					.isLength({ max: 30 })
					.withMessage('First name must be at most 30 characters long'),
				body('cmsAdmin.lastName')
					.notEmpty()
					.withMessage('Last name is required')
					.isString()
					.withMessage('Last name must be a string')
					.isLength({ max: 30 })
					.withMessage('Last name must be at most 30 characters long'),
				body('cmsAdmin.email')
					.notEmpty()
					.withMessage('Email is required')
					.isEmail()
					.withMessage('Must be a valid email'),
			];
		}
		case 'logInCmsAdmin': {
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
				body('roles')
					.exists()
					.withMessage('roles is required.')
					.isString()
					.withMessage('roles should be a string.')
					.notEmpty()
					.withMessage('roles should not be empty.'),
			];
		}
	}
};
