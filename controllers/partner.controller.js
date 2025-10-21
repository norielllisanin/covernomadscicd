const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');
const { generateRandomString, formatIds } = require('../utils');

const Partner = getCollection('partners');
// @desc    Creates a new partner account
// @route   POST /api/partners
// @access  INTERNAL
const createPartner = async (req, res) => {
	const { insurerId, name, code, countryCode, commissionPercentage, email } =
		req.body;

	const reportRecipients = [email];
	const existingPartner = await Partner.findOne({
		code: code,
		countryCode: countryCode,
	});
	if (existingPartner)
		return res
			.status(400)
			.json({ msg: 'Partner with this code and country code already exists.' });

	const generatedApiKey = `cvn_partner_key_${generateRandomString(25)}`;
	const { insertedId } = await Partner.insertOne({
		insurer: new ObjectId(insurerId),
		name,
		code,
		countryCode,
		commissionPercentage: Number(commissionPercentage),
		apiKey: generatedApiKey,
		reportRecipients: reportRecipients,
	});
	const createdPartner = await Partner.findOne({ _id: insertedId });
	return res.status(201).json({
		msg: 'Partner created.',
		partner: formatIds(createdPartner, 'partner'),
	});
};

const getAllPartners = async (req, res) => {
	if (req.cvnAdmin) {
		const foundPartners = await Partner.aggregate([
			{
				$lookup: {
					from: 'insurers',
					localField: 'insurer',
					foreignField: '_id',
					as: 'insurer',
				},
			},
			{
				$unwind: '$insurer',
			},

			{
				$sort: { name: 1 },
			},
		]).toArray();
		return res.status(200).json({ partners: foundPartners });
	}
	const page = parseInt(req.params.page);
	const PAGE_SIZE = 20;
	const skip = page * PAGE_SIZE;

	//count total number of docs that fit query
	const partnerCount = await Partner.aggregate([
		{
			$group: {
				_id: null,
				count: { $sum: 1 },
			},
		},
		{
			$project: {
				_id: 1,
				totalPartners: '$count',
			},
		},
	]).toArray();
	//calculate pagination vars
	const totalPartners = partnerCount.pop()?.totalPartners || 0;
	const totalPages = Math.ceil(totalPartners / PAGE_SIZE);
	const nextPage = page + 1 >= totalPages ? null : page + 1;
	const prevPage = page - 1 < 0 ? null : page - 1;
	//retrieve paginated documents
	const foundPartners = await Partner.aggregate([
		{ $sort: { name: 1 } },
		// { $skip: skip },
		// { $limit: PAGE_SIZE },
	]).toArray();

	return res.status(200).json({
		partners: formatIds(foundPartners, 'agency'),
		pagination: {
			totalRecords: totalPartners,
			totalPages,
			currentPage: page,
			nextPage,
			prevPage,
		},
	});
};

const getPartnerById = async (req, res) => {
	const { partnerId } = req.params;
	try {
		const foundPartner = await Partner.findOne({
			_id: new ObjectId(partnerId),
		});
		if (!foundPartner) {
			return res.status(404).json({ msg: 'Partner not found.' });
		}
		return res
			.status(200)
			.json({ partner: formatIds(foundPartner, 'partner') });
	} catch (error) {
		console.log('partner get error', JSON.stringify(error));
		return res
			.status(500)
			.json({ msg: 'Something went wrong while getting partner' });
	}
};

const updatePartner = async (req, res) => {
	const { partnerId } = req.params;
	try {
		const { name, code, commissionPercentage, email } = req.body;

		const foundPartner = await Partner.findOne({
			_id: new ObjectId(partnerId),
		});
		if (!foundPartner) {
			return res.status(404).json({ msg: 'Partner not found.' });
		}
		const updatedPartner = await Partner.findOneAndUpdate(
			{ _id: foundPartner._id },
			{
				$set: {
					name,
					code,
					commissionPercentage: Number(commissionPercentage),
					reportRecipients: [email],
				},
			}
		);
		if (!updatedPartner) {
			return res.status(404).json({ msg: 'Partner not udpate.' });
		}

		return res.status(200).json({ msg: 'Partner updated.' });
	} catch (error) {
		console.log('partner update error', JSON.stringify(error));
		return res
			.status(500)
			.json({ msg: 'Something went wrong while updating partner' });
	}
};

module.exports = {
	createPartner,
	getAllPartners,
	updatePartner,
	getPartnerById,
};
