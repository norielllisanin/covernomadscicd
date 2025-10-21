const quoteSchema = {
	$jsonSchema: {
		bsonType: 'object',
		title: 'quotation document validation',
		required: [
			'product',
			'coverage',
			'price',
			'status',
			'email',
			'priceFactor',
			'code',
		],
		properties: {
			_id: {
				bsonType: 'objectId',
			},
			product: {
				bsonType: 'objectId',
			},
			coverage: {
				bsonType: 'objectId',
			},
			duration: {
				bsonType: 'object',
			},

			addOns: {
				bsonType: 'array',
				items: {
					bsonType: 'objectId',
				},
			},
			email: {
				bsonType: 'string',
			},
			priceFactor: {
				bsonType: 'objectId',
			},
			isAnnual: {
				bsonType: 'bool',
			},
			priceExclVat: {
				bsonType: 'object',
			},
			price: {
				bsonType: 'object',
			},

			vat: {
				bsonType: 'object',
			},
			addOnTotal: {
				bsonType: 'object',
			},
			isReturn: {
				bsonType: 'bool',
			},
			from: {
				bsonType: 'object',
			},
			to: {
				bsonType: 'object',
			},
			departureDate: {
				bsonType: 'date',
			},
			returnDate: {
				bsonType: 'date',
			},
			agency: {
				bsonType: 'objectId',
			},
			wholeseller: {
				bsonType: 'objectId',
			},
			user: {
				bsonType: 'objectId',
			},
			broker: {
				bsonType: 'objectId',
			},
			iho: {
				bsonType: 'bool',
			},
			cms: {
				bsonType: 'bool',
			},
			insurer: {
				bsonType: 'objectId',
			},
			days: {
				bsonType: 'int',
			},
			code: {
				bsonType: 'string',
			},
			policyId: {
				bsonType: 'objectId',
			},
			paymentId: {
				bsonType: 'string',
			},
			paymentLink: {
				bsonType: 'string',
			},
			status: {
				enum: [
					'pending',
					'approved',
					'payment_completed',
					'expired',
					'created',
				],
				bsonType: 'string',
			},
			numOfPax: {
				bsonType: 'object',
			},
			createdAt: {
				bsonType: 'date',
			},
			updatedAt: {
				bsonType: 'date',
			},
			passengerInfo: {
				bsonType: 'array',
				items: {
					bsonType: 'object',
				},
			},
		},
		additionalProperties: true,
	},
};

module.exports = quoteSchema;
