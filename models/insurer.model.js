const insurerSchema = {
	$jsonSchema: {
		bsonType: 'object',
		title: 'Insurer document validation',
		required: ['name', 'code'],
		properties: {
			_id: {
				bsonType: 'objectId',
			},

			name: {
				bsonType: 'string',
			},
			code: {
				bsonType: 'string',
			},
		},
		additionalProperties: true,
	},
};

module.exports = insurerSchema;
