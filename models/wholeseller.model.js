const wholesellerSchema = {
	$jsonSchema: {
		bsonType: 'object',
		title: 'Wholeseller document validation',
		required: ['name', 'code', 'createdAt'],
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
			fixedCommission: {
				bsonType: 'number',
				description:
					'Hooks a fixed wholeseller commision rate, rather than the agency commision difference',
			},
			isCreditApplicable: {
				bsonType: 'bool',
			},
			credit: {
				bsonType: 'number',
			},
			balance: {
				bsonType: 'number',
			},
			maxBalance: {
				bsonType: 'number',
			},
			createdAt: {
				bsonType: 'date',
			},
			payment: {
				bsonType: 'bool',
			},
		},
		additionalProperties: true,
	},
};

module.exports = wholesellerSchema;
