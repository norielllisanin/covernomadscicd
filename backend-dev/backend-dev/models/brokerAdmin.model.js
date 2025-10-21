const brokerAdminSchema = {
	$jsonSchema: {
		bsonType: 'object',
		title: 'broker Admin document validation',
		required: [
			'broker',
			'firstName',
			'lastName',
			'username',
			'email',
			'password',
			'isActive',
			'createdAt',
			'permission',
		],
		properties: {
			_id: {
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
			permission: {
				enum: ['SUPER', 'STANDARD'],
				bsonType: 'string',
			},
			isActive: {
				bsonType: 'bool',
			},
			createdAt: {
				bsonType: 'date',
			},
			dob: {
				bsonType: 'date',
			},
			otp: {
				bsonType: 'string',
			},
		},
		additionalProperties: false,
	},
};

module.exports = brokerAdminSchema;
