const { validationResult } = require('express-validator');

const errorHandler = (controller) => {
	return (req, res, next) => {
		const errors = validationResult(req);
		if (errors.isEmpty()) {
			return controller(req, res, next).catch(next);
		}
		const extractedErrors = [];
		errors
			.array()
			.map((err) => extractedErrors.push({ path: err.path, msg: err.msg }));
		return res
			.status(422)
			.json({ msg: extractedErrors?.[0]?.msg, allErrors: extractedErrors });
	};
};

module.exports = { errorHandler };
