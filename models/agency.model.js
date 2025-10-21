const agencySchema = {
	$jsonSchema: {
		bsonType: 'object',
		title: 'Agency document validation',
		required: ['insurer', 'name', 'commissionPercentage'],
		properties: {
			_id: {
				bsonType: 'objectId',
			},
			insurer: {
				bsonType: 'objectId',
			},
			wholeseller: {
				bsonType: 'objectId',
			},
			broker: {
				bsonType: 'objectId',
			},
			name: {
				bsonType: 'string',
			},
			code: {
				bsonType: 'string',
			},
			commissionPercentage: {
				bsonType: 'int',
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
			status: {
				bsonType: 'bool',
			},
			offeredProducts: {
				bsonType: 'array',
				items: {
					bsonType: 'objectId',
				},
			},
			createdAt: {
				bsonType: 'date',
			},
		},
		additionalProperties: true,
	},
};

module.exports = agencySchema;
