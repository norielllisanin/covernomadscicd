const cvnAdminSchema = {
	$jsonSchema: {
		bsonType: 'object',
		title: 'CVN Admin document validation',
		required: [
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
			cvn: {
				bsonType: 'bool',
			},
			admin: {
				bsonType: 'bool',
			},
			isActive: {
				bsonType: 'bool',
			},
			createdAt: {
				bsonType: 'date',
			},
		},
		additionalProperties: true,
	},
};

module.exports = cvnAdminSchema;
