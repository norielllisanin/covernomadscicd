const wholesellerAdminSchema = {
	$jsonSchema: {
		bsonType: 'object',
		title: 'WholeSeller Admin document validation',
		required: [
			'wholeseller',
			'firstName',
			'lastName',
			'username',
			'email',
			'password',
			'isActive',
			'createdAt',
		],
		properties: {
			_id: {
				bsonType: 'objectId',
			},
			wholeseller: {
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

module.exports = wholesellerAdminSchema;
