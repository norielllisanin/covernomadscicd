const userSchema = {
	$jsonSchema: {
		bsonType: 'object',
		title: 'User document validation',
		required: [
			'firstName',
			'lastName',
			'username',
			'email',
			'password',
			'dob',
			'permission',
			'isActive',
			'createdAt',
		],
		properties: {
			_id: {
				bsonType: 'objectId',
			},
			agency: {
				bsonType: 'objectId',
			},
			broker: {
				bsonType: 'objectId',
			},
			firstName: {
				bsonType: 'string',
			},
			lastName: {
				bsonType: 'string',
			},
			username: {
				bsonType: 'string',
			},
			email: {
				bsonType: 'string',
			},
			password: {
				bsonType: 'string',
			},
			dob: {
				bsonType: 'date',
			},
			landlineNumber: {
				bsonType: 'string',
			},
			phoneNumber: {
				bsonType: 'string',
			},
			location: {
				bsonType: 'string',
			},
			permission: {
				enum: ['SUPER', 'STANDARD'],
				bsonType: 'string',
			},
			isActive: {
				bsonType: 'bool',
			},
			incentivePercentage: {
				bsonType: 'number',
				description: 'Gives the percentage of incentive given per policy',
			},
			latestLoginTimestamp: {
				bsonType: 'date',
			},
			otp: {
				bsonType: 'string',
			},
			createdAt: {
				bsonType: 'date',
			},
		},
		additionalProperties: true,
	},
};

module.exports = userSchema;
