const paymentSchema = {
	$jsonSchema: {
		bsonType: 'object',
		title: 'Payment schema',
		required: ['type', 'channel', 'amount', 'createdAt'],
		properties: {
			_id: {
				bsonType: 'objectId',
			},
			agency: {
				bsonType: 'objectId',
			},
			wholeseller: {
				bsonType: 'objectId',
			},
			broker: {
				bsonType: 'objectId',
			},
			type: {
				bsonType: 'string',
				enum: ['BALANCE'],
			},
			channel: {
				bsonType: 'string',
				enum: ['STRIPE', 'MANUAL'],
			},
			amount: {
				bsonType: 'number',
			},
			remarks: {
				bsonType: 'string',
			},
			createdAt: {
				bsonType: 'date',
			},
			metadata: {
				bsonType: 'object',
			},
		},
		additionalProperties: false,
	},
};

module.exports = paymentSchema;
