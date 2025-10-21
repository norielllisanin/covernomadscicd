const addOnSchema = {
	$jsonSchema: {
		bsonType: 'object',
		title: 'Add on document validation',
		required: ['insurer', 'code', 'label'],
		properties: {
			_id: {
				bsonType: 'objectId',
			},
			insurer: {
				bsonType: 'objectId',
			},
			productId: {
				bsonType: 'objectId',
			},
			code: {
				bsonType: 'string',
			},
			label: {
				bsonType: 'string',
			},
			iho: {
				bsonType: 'bool',
			},
			cms: {
				bsonType: 'bool',
			},
			multiplier: {
				bsonType: 'number',
			},
		},
		additionalProperties: true,
	},
};

module.exports = addOnSchema;
