const creditHistorySchema = {
	$jsonSchema: {
		bsonType: 'object',
		title: 'Credit history schema',
		required: [
			'oldValue',
			'topUpValue',
			'newValue',
			'remarks',
			'createdBy',
			'createdAt',
		],
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
			oldValue: {
				bsonType: 'number',
			},
			topUpValue: {
				bsonType: 'number',
			},
			newValue: {
				bsonType: 'number',
			},
			remarks: {
				bsonType: 'string',
			},
			createdBy: {
				bsonType: 'objectId',
			},
			createdAt: {
				bsonType: 'date',
			},
		},
		additionalProperties: false,
	},
};

module.exports = creditHistorySchema;
