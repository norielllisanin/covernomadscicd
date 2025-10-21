const { body } = require('express-validator');

exports.validate = (method) => {
	switch (method) {
		case 'createInsurer': {
			return [
				body('name')
					.notEmpty()
					.withMessage('name is required.')
					.isString()
					.withMessage('name should be a string.')
					.isLength({ min: 1, max: 1024 })
					.withMessage('name length should be between 1 and 1024 characters.'),
			];
		}
		case 'logInInsurerAdmin': {
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
	}
};
