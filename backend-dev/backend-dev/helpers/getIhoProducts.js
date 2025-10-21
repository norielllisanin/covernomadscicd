const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');
const ihoCalculatePremium = require('./ihoCalculatePremium');
const { roundToTwoDecimals, roundToThreeDecimals } = require('../utils');
const Insurer = getCollection('insurers');
const PriceFactors = getCollection('priceFactors');
const Agency = getCollection('agencies');
const getIhoProducts = async ({
	agencyId,
	returnTrip,
	priceFactorId,
	duration,
	destinationCountry,
	numOfPax,
	family = false,
	student = false,
	HUS = false,
	VIP = false,
}) => {
	let productsToOffer = [];
	const foundAgency = await Agency.findOne({ _id: new ObjectId(agencyId) });
	const foundInsurer = await Insurer.findOne({
		_id: new ObjectId(foundAgency.insurer),
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
	if (foundInsurer.code === 'IHO' || foundInsurer.code === 'ORT') {
		let foundPriceFactors;
		if (destinationCountry === 'ARE') {
			foundPriceFactors = await PriceFactors.aggregate([
				...sharedPipelines,
				{
					$match: {
						...(priceFactorId && { _id: new ObjectId(priceFactorId) }),
						'product.insurer': foundInsurer._id,
						'product.type': 'INBOUND',
						'duration.min': { $lte: duration },
						'duration.max': { $gte: duration },
						'product.active': true,
						'product.iho': true,
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
						...(family && { 'product.code': 'IHOFAM' }),
						...(student && { 'product.code': 'IHOSTD' }),
						...(HUS && { 'product.code': 'IHOHUS' }),
						...(VIP && { 'product.code': 'VIP' }),
						'coverage.name': destinationCountry, // Added this condition here
						'product.type': 'OUTBOUND',
						'product.active': true,
						'product.iho': true,
						'product.insurer': foundInsurer._id,
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
											'duration.min': 93,
											'duration.max': 365,
										},
									],
							  }),
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
			const { premium } = ihoCalculatePremium({
				insurerCode: foundInsurer.code,
				productCode: priceFactor?.product?.code,
				priceFactor: priceFactor,
				numOfPax: numOfPax,
			});
			productsToOffer.push({
				...priceFactor,
				price: { AED: roundToThreeDecimals(premium.premium) },
				priceExclVat: { AED: roundToTwoDecimals(premium.totalExclVat) },
				vat: { AED: roundToTwoDecimals(premium.vat) },
			});
		}
	}
	productsToOffer.sort((a, b) => a.price.AED - b.price.AED);
	return { products: productsToOffer };
};
module.exports = getIhoProducts;
