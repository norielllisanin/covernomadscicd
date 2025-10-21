const policySchema = {
	$jsonSchema: {
		bsonType: 'object',
		title: 'Policy document validation',
		required: [
			'number',
			'returnTrip',
			'from',
			'to',
			'departureDate',
			'priceFactor',
			'productName',
			'totalPremium',
			'createdAt',
			'expiresAt',
		],
		properties: {
			_id: {
				bsonType: 'objectId',
			},
			amend: {
				bsonType: 'object',
				properties: {
					departureDate: {
						bsonType: 'bool',
					},
					returnDate: {
						bsonType: 'bool',
					},
				},
			},
			agency: {
				bsonType: 'objectId',
			},
			broker: {
				bsonType: 'objectId',
			},
			partner: {
				bsonType: 'objectId',
			},
			createdBy: {
				bsonType: 'objectId',
			},
			number: {
				bsonType: 'string',
			},
			returnTrip: {
				bsonType: 'bool',
			},
			from: {
				bsonType: 'string',
			},
			to: {
				bsonType: 'string',
			},
			family: {
				bsonType: 'bool',
			},
			departureDate: {
				bsonType: 'date',
			},
			returnDate: {
				bsonType: 'date',
			},
			priceFactor: {
				bsonType: 'objectId',
			},
			productName: {
				bsonType: 'string',
			},
			totalPremium: {
				bsonType: 'object',
			},
			vat: {
				bsonType: 'object',
			},
			remarks: {
				bsonType: 'string',
			},
			status: {
				bsonType: 'string',
				enum: ['confirmed', 'cancelled', 'unpaid'],
			},
			cancellation: {
				bsonType: 'bool',
			},
			expiresAt: {
				bsonType: 'date',
			},
			createdAt: {
				bsonType: 'date',
			},
			updatedAt: {
				bsonType: 'date',
			},
		},
		additionalProperties: true,
	},
};

module.exports = policySchema;
