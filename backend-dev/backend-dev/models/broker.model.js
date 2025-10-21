const brokerSchema = {
	$jsonSchema: {
		bsonType: 'object',
		title: 'Broker document validation',
		required: ['insurerId', 'name'],
		properties: {
			_id: {
				bsonType: 'objectId',
			},
			insurerId: {
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
			balance: {
				bsonType: 'number',
			},
			maxBalance: {
				bsonType: 'number',
			},
			status: {
				bsonType: 'bool',
			},
			iho: {
				bsonType: 'bool',
			},
			createdAt: {
				bsonType: 'date',
			},
		},
		additionalProperties: false,
	},
};

module.exports = brokerSchema;
