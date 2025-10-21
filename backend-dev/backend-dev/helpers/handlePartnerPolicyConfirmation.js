const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');
const { sendEmail } = require('../services/emailingService');
const { compile } = require('handlebars');
const fs = require('fs');
const moment = require('moment');
const { ORT_HowtoClaim } = require('../utils');

const Policy = getCollection('policies');

const handlePartnerPolicyConfirmation = async ({
	policyId,
	tran_ref,
	baseUrl,
}) => {
	await Policy.updateOne(
		{ _id: new ObjectId(policyId) },
		{
			$set: {
				status: 'confirmed',
				transactionReference: tran_ref,
				updatedAt: new Date(),
			},
		}
	);

	const [createdPolicy] = await Policy.aggregate([
		{
			$match: {
				_id: new ObjectId(policyId),
			},
		},
		{
			$lookup: {
				from: 'passengers',
				localField: '_id',
				foreignField: 'policy',
				as: 'passengers',
			},
		},
		{
			$lookup: {
				from: 'priceFactors',
				localField: 'priceFactor',
				foreignField: '_id',
				as: 'priceFactor',
			},
		},
		{ $addFields: { priceFactor: { $arrayElemAt: ['$priceFactor', 0] } } },
		{
			$lookup: {
				from: 'products',
				localField: 'priceFactor.product',
				foreignField: '_id',
				as: 'product',
			},
		},
		{ $addFields: { product: { $arrayElemAt: ['$product', 0] } } },
		{
			$limit: 1,
		},
	]).toArray();

	// create policy report
	const addReport = await fetch(
		`${
			baseUrl === 'https://localhost:5000' ? 'http://localhost:5000' : baseUrl
		}/api/reports/create-report?policy=${policyId}`,
		{
			method: 'POST',
		}
	);
	const addReportResponse = await addReport.json();

	const coiLink = encodeURI(`${baseUrl}/api/policies/coi/${policyId}`);
	const invoiceLink = encodeURI(`${baseUrl}/api/policies/invoice/${policyId}`);
	const receiptLink = encodeURI(`${baseUrl}/api/policies/receipt/${policyId}`);
	const termsAndConditionsLink = createdPolicy?.product?.termsAndConditions;

	const source = fs.readFileSync(
		`${process.cwd()}/templates/orient/OrientPolicyCreationEmail.html`,
		'utf8'
	);
	const template = compile(source);
	const replacements = {
		firstName: createdPolicy.passengers[0].firstName,
		lastName: createdPolicy.passengers[0].lastName,
		productName: createdPolicy.productName,
		policyNumber: createdPolicy.number,
		policyStartDate: moment(createdPolicy.departureDate).format('DD/MM/YYYY'),
		policyEndDate: moment(createdPolicy.expiresAt).format('DD/MM/YYYY'),
		ORT_HowtoClaim: ORT_HowtoClaim,
		coiLink,
		invoiceLink,
		receiptLink,
		termsAndConditionsLink,
	};
	const html = template(replacements);
	const { error } = await sendEmail({
		to: [...new Set(createdPolicy.passengers.map((p) => p.email))],
		cc: ['contact@covernomads.com'],
		subject: `Your Travel Insurance Confirmation - No. ${createdPolicy?.number}`,
		text: `You're covered!`,
		html,
	});
	return;
};

module.exports = handlePartnerPolicyConfirmation;
