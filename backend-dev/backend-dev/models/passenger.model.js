const passengerSchema = {
	$jsonSchema: {
		bsonType: 'object',
		title: 'Passenger document validation',
		required: ['policy', 'type', 'firstName', 'gender', 'email'],
		properties: {
			_id: {
				bsonType: 'objectId',
			},
			policy: {
				bsonType: 'objectId',
			},
			type: {
				bsonType: 'string',
				enum: ['MOST SENIOR', 'SUPER SENIOR', 'SENIOR', 'ADULT', 'CHILD'],
			},
			firstName: {
				bsonType: 'string',
			},
			lastName: {
				bsonType: 'string',
			},
			gender: {
				bsonType: 'string',
				enum: ['MALE', 'FEMALE'],
			},
			nationality: {
				bsonType: 'string',
			},
			dob: {
				bsonType: 'date',
			},
			passportNumber: {
				bsonType: 'string',
			},
			countryOfResidence: {
				bsonType: 'string',
			},
			mobileNumber: {
				bsonType: 'string',
			},
			cityOfResidence: {
				bsonType: 'string',
			},
			email: {
				bsonType: 'string',
			},
		},
		additionalProperties: true,
	},
};

module.exports = passengerSchema;
