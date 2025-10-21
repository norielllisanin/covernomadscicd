const priceFactorSchema = {
	$jsonSchema: {
		bsonType: 'object',
		title: 'Price factor document validation',
		required: ['product', 'coverage', 'duration', 'price'],
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
				required: ['min', 'max'],
				properties: {
					min: {
						bsonType: 'number',
					},
					max: {
						bsonType: 'number',
					},
				},
			},
			age: {
				bsonType: 'array',
				properties: {
					min: {
						bsonType: 'number',
					},
					max: {
						bsonType: 'number',
					},
					price: {
						bsonType: 'object',
					},
					net: {
						bsonType: 'object',
					},
					vat: {
						bsonType: 'object',
					},
				},
			},

			premiumCondition: {
				bsonType: 'array',
				properties: {
					min: {
						bsonType: 'number',
					},
					max: {
						bsonType: 'number',
					},
					multiplier: {
						bsonType: 'number',
					},
				},
			},
			pax: {
				bsonType: 'object',
				required: ['children', 'adults', 'seniors'],
				properties: {
					children: {
						bsonType: 'object',
						required: ['min', 'max'],
						properties: {
							min: {
								bsonType: 'number',
							},
							max: {
								bsonType: 'number',
							},
						},
					},
					adults: {
						bsonType: 'object',
						required: ['min', 'max'],
						properties: {
							min: {
								bsonType: 'number',
							},
							max: {
								bsonType: 'number',
							},
						},
					},
					seniors: {
						bsonType: 'object',
						required: ['min', 'max'],
						properties: {
							min: {
								bsonType: 'number',
							},
							max: {
								bsonType: 'number',
							},
						},
					},
					superSeniors: {
						bsonType: 'object',
						required: ['min', 'max'],
						properties: {
							min: {
								bsonType: 'number',
							},
							max: {
								bsonType: 'number',
							},
						},
					},
				},
			},
			price: {
				bsonType: 'object',
			},
		},
		additionalProperties: true,
	},
};

module.exports = priceFactorSchema;
