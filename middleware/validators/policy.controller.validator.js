const { body, check } = require('express-validator');
const moment = require('moment');

const validDestinationCountries = [
	'SCH',
	'Worldwide EXCL - USA, CAN',
	'Worldwide',
	'ARE',
	'IND',
	'COD',
].map((country) => country);
exports.validate = (method) => {
	switch (method) {
		case 'getPolicyProducts': {
			return [
				body('returnTrip')
					.notEmpty()
					.withMessage('returnTrip is required')
					.isBoolean({ strict: true })
					.withMessage('returnTrip must be a boolean'),
				body('duration')
					.notEmpty()
					.withMessage('duration is required.')
					.isInt({ min: 1, max: 365 })
					.withMessage('duration should be an integer between 1 and 365.'),
				body('destinationCountry')
					.notEmpty()
					.withMessage('destinationCountry is required.')
					.custom((value) => validDestinationCountries.includes(value))
					.withMessage('destinationCountry should be a valid'),
				body('numOfPax').isObject().withMessage('numOfPax must be an object'),
				body('numOfPax.children')
					.notEmpty()
					.withMessage('children is required')
					.toInt()
					.withMessage('children must be an integer')
					.isInt({ min: 0, max: 100 })
					.withMessage('children must be an integer between 0 and 100'),
				body('numOfPax.adults')
					.notEmpty()
					.withMessage('adults is required')
					.toInt()
					.withMessage('adults must be an integer')
					.isInt({ min: 0, max: 100 })
					.withMessage('adults must be an integer between 0 and 100'),
				body('numOfPax.seniors')
					.notEmpty()
					.withMessage('seniors is required')
					.toInt()
					.withMessage('seniors must be an integer')
					.isInt({ min: 0, max: 100 })
					.withMessage('seniors must be an integer between 0 and 100'),
				body('numOfPax.superSeniors')
					.notEmpty()
					.withMessage('superSeniors is required')
					.toInt()
					.withMessage('superSeniors must be an integer')
					.isInt({ min: 0, max: 100 })
					.withMessage('superSeniors must be an integer between 0 and 100'),
				body('numOfPax').custom((value) => {
					const total =
						value.children + value.adults + value.seniors + value.superSeniors;
					if (total < 1) {
						throw new Error(
							'The sum of children, adults, seniors, and superSeniors must be at least 1'
						);
					}
					return true;
				}),
			];
		}
		case 'createPolicy': {
			return [
				body('returnTrip')
					.notEmpty()
					.withMessage('returnTrip is required')
					.isBoolean({ strict: true })
					.withMessage('returnTrip must be a boolean'),
				body('from')
					.notEmpty()
					.withMessage('from is required')
					.isISO31661Alpha3()
					.withMessage('from must be a valid alpha-3 country code'),
				body('to')
					.notEmpty()
					.withMessage('to is required')
					.custom((value) => validDestinationCountries.includes(value))
					.withMessage('destinationCountry should be a valid')
					.custom((value, { req }) => {
						if (req.body.from === value) {
							throw new Error('from country cannot be the same as to country');
						}
						if (
							['BLR', 'CUB', 'IRN', 'MMR', 'RUS', 'SYR', 'VEN'].includes(value)
						)
							throw new Error('`to` country is sanctioned for travel.');
						return true;
					}),
				body('departureDate')
					.notEmpty()
					.withMessage('departureDate is required')
					.isISO8601({ format: 'YYYY-MM-DD' })
					.withMessage(
						'departureDate must be a valid date in "YYYY-MM-DD" format'
					)
					.custom((value, { req }) => {
						const todaysDate = moment().format('YYYY-MM-DD');
						if (moment(value).isBefore(moment(todaysDate))) {
							throw new Error('departureDate is cannot be before today');
						}
						return true;
					}),
				body('returnDate')
					.if(body('returnTrip').isBoolean({ strict: true }).equals('true'))
					.notEmpty()
					.withMessage('returnDate is required for return trips')
					.isISO8601({ format: 'YYYY-MM-DD' })
					.withMessage('returnDate must be a valid date in "YYYY-MM-DD" format')
					.custom((value, { req }) => {
						if (moment(value).isBefore(moment(req.body.departureDate))) {
							throw new Error('returnDate cannot be before departureDate');
						}
						return true;
					}),
				body('priceFactorId')
					.notEmpty()
					.withMessage('priceFactorId is required')
					.isMongoId()
					.withMessage('priceFactorId must be a valid MongoDB ObjectID'),
				body('remarks')
					.optional()
					.trim()
					.isString()
					.withMessage('remarks must be a string')
					.isLength({ min: 1, max: 1000 })
					.withMessage('remarks length must be between 1 and 1000 characters.'),
				body('addOns')
					.optional()
					.isArray({ min: 1 })
					.withMessage('addOns must be an array with at least one element'),
				body('addOns.*')
					.optional()
					.isMongoId()
					.withMessage('each addOn must be a valid MongoDB ObjectID'),
				body('passengers')
					.notEmpty()
					.withMessage('passengers is required')
					.isArray({ min: 1, max: 100 })
					.withMessage('number of passenger must be between 1 and 100'),
				body('passengers.*.type')
					.trim()
					.notEmpty()
					.withMessage('passengers.type is required')
					.isString()
					.withMessage('type must be a string')
					.isIn(['SUPER SENIOR', 'SENIOR', 'ADULT', 'CHILD'])
					.withMessage(
						'type must be one of "SUPER SENIOR", "SENIOR", "ADULT", "CHILD"'
					),
				body('passengers.*.firstName')
					.trim()
					.notEmpty()
					.withMessage('passengers.firstName is required')
					.isString()
					.withMessage('passengers.firstName must be a string')
					.isLength({ max: 50 })
					.withMessage(
						'passengers.firstName must be at most 50 characters long'
					)
					.matches(/^[A-Za-z\s]+$/)
					.withMessage(
						'passengers.firstName can only contain alphabets and spaces'
					),
				// body('passengers.*.lastName')
				// 	.trim()
				// 	.notEmpty()
				// 	.withMessage('passengers.lastName is required')
				// 	.isString()
				// 	.withMessage('passengers.lastName must be a string')
				// 	.isLength({ max: 50 })
				// 	.withMessage('passengers.lastName must be at most 50 characters long')
				// 	.matches(/^[A-Za-z\s]+$/)
				// 	.withMessage(
				// 		'passengers.lastName can only contain alphabets and spaces'
				// 	),
				body('passengers.*.gender')
					.notEmpty()
					.withMessage('passengers.gender is required')
					.isString()
					.withMessage('passengers.gender must be a string')
					.isIn(['MALE', 'FEMALE'])
					.withMessage('passengers.gender must be either "MALE" or "FEMALE"'),
				body('passengers.*.nationality')
					.notEmpty()
					.withMessage('passengers.nationality is required')
					.isISO31661Alpha3()
					.withMessage(
						'passengers.nationality must be a valid alpha-3 country code'
					),
				body('passengers.*.dob')
					.notEmpty()
					.withMessage('passengers.dob is required')
					.isISO8601({ format: 'YYYY-MM-DD' })
					.withMessage(
						'passengers.dob must be a valid date in "YYYY-MM-DD" format'
					)
					.custom((value, { req }) => {
						const todaysDate = moment().format('YYYY-MM-DD');
						const age = moment(todaysDate).diff(moment(value), 'years');
						const passengerType = req.body.passengers.find(
							(passenger) => passenger.dob === value
						).type;

						if (value === todaysDate)
							throw new Error('passengers.dob cannot be todays date');

						if (moment(value).isAfter(moment(moment().format('YYYY-MM-DD'))))
							throw new Error('passengers.dob cannot be after todays date');
						// if (passengerType === 'CHILD' && age > 17)
						// 	throw new Error('CHILD passenger age must be between 1D-17y');
						// if (passengerType === 'ADULT' && (age < 18 || age > 70))
						// 	throw new Error('ADULT passenger age must be between 18y-70y');
						// if (passengerType === 'SENIOR' && (age < 71 || age > 75))
						// 	throw new Error('SENIOR passenger age must be between 71y-75y');
						// if (passengerType === 'SUPER SENIOR' && (age < 76 || age > 80))
						// 	throw new Error(
						// 		'SUPER SENIOR passenger age must be between 76y-80y'
						// 	);
						return true;
					}),
				body('passengers.*.passportNumber')
					.trim()
					.notEmpty()
					.withMessage('passengers.passportNumber is required')
					.isString()
					.withMessage('passengers.passportNumber must be a string')
					.isLength({ max: 100 })
					.withMessage(
						'passengers.passportNumber must be at most 100 characters long'
					),
				body('passengers.*.countryOfResidence')
					.notEmpty()
					.withMessage('passengers.countryOfResidence is required')
					.custom((value) => {
						const { isISO31661Alpha3 } = require('validator');
						const allowedExtras = ['DEP']; // Add any custom codes you want to allow

						if (allowedExtras.includes(value) || isISO31661Alpha3(value)) {
							return true;
						}
						throw new Error(
							'passengers.countryOfResidence must be a valid alpha-3 country code or "DEP"'
						);
					}),
				body('passengers.*.mobileNumber')
					.trim()
					.optional()
					.isString()
					.withMessage('passengers.mobileNumber must be a string')
					.isLength({ max: 100 })
					.withMessage(
						'passengers.mobileNumber must be at most 100 characters long'
					),
				body('passengers.*.cityOfResidence')
					.trim()
					.optional()
					.isString()
					.withMessage('passengers.cityOfResidence must be a string')
					.isLength({ max: 100 })
					.withMessage(
						'passengers.cityOfResidence must be at most 100 characters long'
					),
				body('passengers.*.email')
					.trim()
					.notEmpty()
					.withMessage('passengers.email is required')
					.isEmail()
					.withMessage('passengers.email must be a valid email format'),
			];
		}
		case 'updatePolicy': {
			return [
				body('departureDate')
					.notEmpty()
					.withMessage('departureDate is required')
					.isISO8601({ format: 'YYYY-MM-DD' })
					.withMessage(
						'departureDate must be a valid date in "YYYY-MM-DD" format'
					)
					.custom((value, { req }) => {
						const todaysDate = moment().format('YYYY-MM-DD');
						if (moment(value).isBefore(moment(todaysDate))) {
							throw new Error('departureDate is cannot be before today');
						}
						return true;
					}),
			];
		}
		case 'policyTicket': {
			return [
				body('subject')
					.notEmpty()
					.withMessage('subject is required')
					.isString()
					.withMessage('subject must be a string'),
				body('message')
					.notEmpty()
					.withMessage('message is required')
					.isString()
					.withMessage('message must be a string'),
			];
		}
		case 'emailPolicy': {
			return [
				body('email')
					.trim()
					.notEmpty()
					.withMessage('email is required')
					.isEmail()
					.withMessage('email must be a valid email'),
			];
		}
	}
};
