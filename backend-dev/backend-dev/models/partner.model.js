const partnerSchema = {
	$jsonSchema: {
		bsonType: 'object',
		title: 'Partner document validation',
		required: [
			'insurer',
			'name',
			'code',
			'countryCode',
			'commissionPercentage',
			'apiKey',
			'reportRecipients',
		],
		properties: {
			_id: {
				bsonType: 'objectId',
			},
			insurer: {
				bsonType: 'objectId',
			},
			name: {
				bsonType: 'string',
			},
			code: {
				bsonType: 'string',
			},
			countryCode: {
				bsonType: 'string',
			},
			commissionPercentage: {
				bsonType: 'int',
			},
			apiKey: {
				bsonType: 'string',
			},
			reportRecipients: {
				bsonType: 'array',
				items: {
					bsonType: 'string',
				},
			},
		},
		additionalProperties: false,
	},
};

module.exports = partnerSchema;
