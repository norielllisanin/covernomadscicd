const productSchema = {
	$jsonSchema: {
		bsonType: 'object',
		title: 'Product document validation',
		required: ['name', 'code'],
		properties: {
			_id: {
				bsonType: 'objectId',
			},
			insurer: {
				bsonType: 'objectId',
			},
			partner: {
				bsonType: 'objectId',
			},
			name: {
				bsonType: 'string',
			},
			code: {
				bsonType: 'string',
			},
			iho: {
				bsonType: 'bool',
			},
			cms: {
				bsonType: 'bool',
			},
			termsAndConditions: {
				bsonType: 'string',
			},
			active: {
				bsonType: 'bool',
			},

			benefits: {
				bsonType: 'array',
				items: {
					bsonType: 'object',
					required: ['item', 'value'],
					properties: {
						item: {
							bsonType: 'string',
						},
						value: {
							bsonType: 'string',
						},
						s_benefit: {
							bsonType: 'string',
						},
						order: {
							bsonType: 'number',
						},
					},
					additionalProperties: true,
				},
			},
		},
		additionalProperties: true,
	},
};

module.exports = productSchema;
