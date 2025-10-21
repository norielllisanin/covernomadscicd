const coverageSchema = {
	$jsonSchema: {
		bsonType: 'object',
		title: 'Coverage document validation',
		required: ['name', 'countries'],
		properties: {
			_id: {
				bsonType: 'objectId',
			},
			name: {
				bsonType: 'string',
			},
			countries: {
				bsonType: 'array',
				items: {
					bsonType: 'string',
				},
			},
		},
		additionalProperties: true,
	},
};

module.exports = coverageSchema;
