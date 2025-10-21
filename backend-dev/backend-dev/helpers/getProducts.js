const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');
const calculatePremium = require('./calculatePremium');
const { roundToTwoDecimals, roundToThreeDecimals } = require('../utils');
const Insurer = getCollection('insurers');
const PriceFactors = getCollection('priceFactors');
const Agency = getCollection('agencies');
const Broker = getCollection('brokers');

const getProducts = async ({
	agencyId,
	brokerId,
	returnTrip,
	priceFactorId,
	duration,
	destinationCountry,
	numOfPax,
	family = false,
}) => {
	let productsToOffer = [];
	let foundAgency;
	if (brokerId && brokerId !== '' && brokerId !== undefined) {
		foundAgency = await Broker.findOne({ _id: new ObjectId(brokerId) });
	} else {
		foundAgency = await Agency.findOne({ _id: new ObjectId(agencyId) });
	}

	const indsurerId =
		brokerId && brokerId !== '' && brokerId !== undefined
			? foundAgency?.insurerId
			: foundAgency?.insurer;
	const foundInsurer = await Insurer.findOne({
		_id: new ObjectId(indsurerId),
	});

	//these are the pipelines that are shared for all insurers
	const sharedPipelines = [
		{
			$lookup: {
				from: 'coverages',
				localField: 'coverage',
				foreignField: '_id',
				as: 'coverage',
			},
		},
		{ $addFields: { coverage: { $arrayElemAt: ['$coverage', 0] } } },
		{
			$lookup: {
				from: 'products',
				localField: 'product',
				foreignField: '_id',
				as: 'product',
			},
		},
		{ $addFields: { product: { $arrayElemAt: ['$product', 0] } } },
	];
	//handle different logics for different insurers

	let foundPriceFactors;
	if (destinationCountry === 'ARE') {
		foundPriceFactors = await PriceFactors.aggregate([
			...sharedPipelines,
			{
				$match: {
					...(priceFactorId && { _id: new ObjectId(priceFactorId) }),
					'product.insurer': foundInsurer._id,
					'product.type': 'INBOUND',
					'product.iho': false,
					'duration.min': { $lte: duration },
					'duration.max': { $gte: duration },
					'product.active': true,
					'pax.children.min': { $lte: numOfPax.children },
					'pax.children.max': { $gte: numOfPax.children },
					'pax.adults.min': { $lte: numOfPax.adults },
					'pax.adults.max': { $gte: numOfPax.adults },
					'pax.seniors.min': { $lte: numOfPax.seniors },
					'pax.seniors.max': { $gte: numOfPax.seniors },
					'pax.superSeniors.min': { $lte: numOfPax.superSeniors },
					'pax.superSeniors.max': { $gte: numOfPax.superSeniors },
				},
			},
			{
				$project: {
					'coverage.countries': 0,
					pax: 0,
				},
			},
			{
				$addFields: {
					multipleTripsAllowed: '$multipleTrips',
				},
			},
		]).toArray();
	} else {
		foundPriceFactors = await PriceFactors.aggregate([
			...sharedPipelines,
			{
				$match: {
					...(priceFactorId && { _id: new ObjectId(priceFactorId) }),
					...(family
						? {
								'product.code': 'ELTFAM',
								'coverage._id': new ObjectId('6649ca5aa150800cbe01ad03'),
						  }
						: {
								'coverage.name': destinationCountry,
						  }),
					'product.type': 'OUTBOUND',
					'product.active': true,
					'product.iho': false,
					'product.insurer': foundInsurer?._id,
					...(returnTrip == false
						? {
								'duration.min': { $lte: duration },
								'duration.max': { $gte: duration },
						  }
						: {
								$or: [
									{
										'duration.min': { $lte: duration },
										'duration.max': { $gte: duration },
									},
									{
										//return the annual plan for rreturn trips
										'duration.min': 93,
										'duration.max': 365,
									},
								],
						  }),
					'pax.children.min': { $lte: numOfPax.children },
					'pax.children.max': { $gte: numOfPax.children },
					'pax.adults.min': { $lte: numOfPax.adults },
					'pax.adults.max': { $gte: numOfPax.adults },
					'pax.seniors.min': { $lte: numOfPax.seniors },
					'pax.seniors.max': { $gte: numOfPax.seniors },
					'pax.superSeniors.min': { $lte: numOfPax.superSeniors },
					'pax.superSeniors.max': { $gte: numOfPax.superSeniors },
				},
			},
			{
				$addFields: {
					isAnnual: {
						$cond: {
							if: { $eq: ['$duration.max', 365] },
							then: true,
							else: false,
						},
					},
				},
			},
			{
				$project: {
					'coverage.countries': 0,
					pax: 0,
				},
			},
		]).toArray();
	}
	for (let priceFactor of foundPriceFactors) {
		const { premium } = calculatePremium({
			insurerCode: foundInsurer?.code,
			// premium: priceFactor.price.AED,
			productCode: priceFactor?.product?.code,
			numOfPax: numOfPax,
			multiplier: priceFactor?.multiplier,
			age: priceFactor.age,
			family: family,
		});
		productsToOffer.push({
			...priceFactor,
			price: { AED: roundToThreeDecimals(premium.total, 3) },
			priceExclVat: { AED: roundToThreeDecimals(premium.totalExclVat, 3) },
			vat: { AED: roundToThreeDecimals(premium.totalVat, 3) },

			// price: { AED: roundToThreeDecimals(premium.total, 3) },
			// priceExclVat: { AED: roundToTwoDecimals(premium.total * 0.95, 3) },
			// vat: { AED: roundToTwoDecimals(premium.total * 0.05, 3) },
		});
	}
	if (!family) {
		productsToOffer = productsToOffer.filter(
			(product) => product.product.code !== 'ELTFAM'
		);
	}
	// }
	productsToOffer.sort((a, b) => a.price.AED - b.price.AED);
	return { products: productsToOffer };
};

module.exports = getProducts;
