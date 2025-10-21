const { body } = require('express-validator');

exports.validate = (method) => {
	switch (method) {
		case 'logInCvnAdmin': {
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
