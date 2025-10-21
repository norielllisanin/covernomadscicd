const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');
const momentTz = require('moment-timezone');

const CreditHistory = getCollection('creditHistories');
const Wholesellers = getCollection('wholesellers');
const Agency = getCollection('agencies');

// @desc    Return the credit history of an agency
// @route   GET /api/credit-histories
// @access  SUPER
const getCreditHistory = async (req, res) => {
	let agencyId;
	if (req.user) {
		agencyId = req.user.agency.agencyId;
	} else {
		agencyId = req.query.agencyId;
	}

	let wholesellerId = req.wholesellerAdmin.wholesellerId;

	let { topUpDateFrom, topUpDateTo, timezone } = req.query;

	let topUpDateRange = {
		start: momentTz.tz(topUpDateFrom, timezone).startOf('day').toDate(),
		end: momentTz.tz(topUpDateTo, timezone).endOf('day').toDate(),
	};

	let foundAllCreditHistories;
	foundAllCreditHistories = await CreditHistory.aggregate([
		{
			$match: {
				...(agencyId !== 'all' && {
					agency: new ObjectId(agencyId),
				}),
				...((topUpDateFrom || topUpDateTo) && {
					createdAt: {
						...(topUpDateFrom && { $gte: topUpDateRange.start }), // Use topUpDateFrom as the start date
						...(topUpDateTo && { $lte: topUpDateRange.end }), // Use topUpDateTo as the end date
					},
				}),
			},
		},
		{
			$lookup: {
				from: 'agencies',
				localField: 'agency',
				foreignField: '_id',
				as: 'agency',
			},
		},
		{
			$unwind: '$agency', // Unwind the agency array
		},
		{
			$lookup: {
				from: 'wholesellers',
				localField: 'agency.wholeseller', // Look up the wholeseller associated with the agency
				foreignField: '_id',
				as: 'wholeseller',
			},
		},
		{
			$unwind: '$wholeseller', // Unwind the wholeseller array
		},
		{
			$match: {
				'wholeseller._id': new ObjectId(wholesellerId), // Filter by wholesellerId
			},
		},
		{
			$project: {
				// Customize the fields you want to include in the final result
				creditAmount: 1,
				createdAt: 1,
				agency: '$agency.name',
				wholeseller: '$wholeseller.name',
				newValue: '$newValue',
				oldValue: '$oldValue',
				oldValue: '$oldValue',
				topUpValue: '$topUpValue',
				remarks: '$remarks',
			},
		},
	]).toArray();

	return res.status(200).json({
		creditHistory: foundAllCreditHistories,
	});
};

module.exports = {
	getCreditHistory,
};
