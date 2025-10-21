const reportSchema = {
	$jsonSchema: {
		bsonType: 'object',
		title: 'report schema',
		properties: {
			_id: {
				bsonType: 'objectId',
			},
			// priceFactor: {
			// 	bsonType: 'object',
			// },
			product: {
				bsonType: 'object',
			},
			passengers: {
				bsonType: 'array',
			},
			agency: {
				bsonType: 'object',
			},
			policy: {
				bsonType: 'object',
			},
			user: {
				bsonType: 'object',
			},
			wholesaler: {
				bsonType: 'object',
			},
			broker: {
				bsonType: 'object',
			},
			partner: {
				bsonType: 'object',
			},
			addons: {
				bsonType: 'array',
			},
			createdAt: {
				bsonType: 'date',
			},
		},
		additionalProperties: true,
	},
};

module.exports = reportSchema;
