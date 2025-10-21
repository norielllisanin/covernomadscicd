const cmsAgencySchema = {
	$jsonSchema: {
		bsonType: 'object',
		title: 'cms Agency document validation',
		required: ['type', 'name', 'role'],
		properties: {
			_id: {
				bsonType: 'objectId',
			},
			cmsId: {
				bsonType: 'objectId',
			},
			insurer: {
				bsonType: 'objectId',
			},
			type: {
				enum: [
					'call_center',
					'branch',
					'TA',
					'broker',
					'bank',
					'corporate_client',
				],
				description: 'Type of cms agency',
				bsonType: 'string', // for example: call center, branch, TA, broker, corporate client, etc.
			},
			role: {
				enum: ['direct', 'indirect'],
				description: 'Role of cms agency',
				bsonType: 'string', // for example: direct, indirect
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
			city: {
				bsonType: 'string',
			},
			state: {
				bsonType: 'string',
			},
			offeredProducts: {
				bsonType: 'array',
			},
			createdAt: {
				bsonType: 'date',
			},
		},
		additionalProperties: false,
	},
};

module.exports = cmsAgencySchema;
