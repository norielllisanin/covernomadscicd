const { body } = require('express-validator');

exports.validate = (method) => {
	switch (method) {
		case 'createBalanceClearanceCheckoutUrl': {
			return [
				body('successUrl')
					.isURL()
					.withMessage('successUrl must be a valid URL.'),
				body('email').isEmail().withMessage('email must be a valid email.'),
				body('balance')
					.isNumeric()
					.withMessage('balance should be a Number.')
					.notEmpty()
					.withMessage('balance is required.')
					.withMessage('balance should be a Number.'),
				body('cancelUrl').isURL().withMessage('cancelUrl must be a valid URL.'),
			];
		}
	}
};
