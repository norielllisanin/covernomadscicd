const { ObjectId } = require('mongodb');
const { getCollection } = require('../../db');
const calculatePremium = require('./../calculatePremium');
const { roundToTwoDecimals } = require('../../utils');
const calculateCmsPremium = require('./calculateCmsPremium');
const Insurer = getCollection('insurers');
const PriceFactors = getCollection('priceFactors');
const Cms = getCollection('cms');
const CmsAgency = getCollection('cmsAgency');
const Broker = getCollection('brokers');

const getCmsProducts = async ({
	returnTrip,
	priceFactorId,
	duration,
	destinationCountry,
	numOfPax,
	family = false,
}) => {
	let productsToOffer = [];

	const foundInsurer = await Insurer.findOne({
		_id: new ObjectId('67c05823c70d834e1335dadc'),
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
	if (destinationCountry === 'IND') {
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
								'product.cms': true,
						  }
						: {
								'coverage.name': destinationCountry,
						  }),
					'product.type': 'OUTBOUND',
					'product.active': false,
					'product.cms': true,
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
		const { premium } = calculateCmsPremium({
			insurerCode: foundInsurer?.code,
			premium: priceFactor.price.INR,
			productCode: priceFactor?.product?.code,
			numOfPax: numOfPax,
			multiplier: priceFactor?.multiplier,
			age: priceFactor.age,
		});
		productsToOffer.push({
			...priceFactor,
			price: { INR: roundToTwoDecimals(premium.total) },
			// priceExclVat: { INR: roundToTwoDecimals(premium.totalExclVat) },
			// vat: { INR: roundToTwoDecimals(premium.totalVat) },
		});
	}
	if (!family) {
		productsToOffer = productsToOffer.filter(
			(product) => product.product.code !== 'ELTFAM'
		);
	}
	// }
	productsToOffer.sort((a, b) => a.price.INR - b.price.INR);
	return { products: productsToOffer };
};

module.exports = getCmsProducts;
