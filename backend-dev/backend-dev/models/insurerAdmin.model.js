const insurerAdminSchema = {
	$jsonSchema: {
		bsonType: 'object',
		title: 'insurer Admin document validation',
		required: [
			'insurer',
			'firstName',
			'lastName',
			'username',
			'email',
			'password',
			'isActive',
			// 'createdAt',
		],
		properties: {
			_id: {
				bsonType: 'objectId',
			},
			insurer: {
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
			isActive: {
				bsonType: 'bool',
			},
			createdAt: {
				bsonType: 'date',
			},
			otp: {
				bsonType: 'string',
			},
		},
		additionalProperties: true,
	},
};

module.exports = insurerAdminSchema;
