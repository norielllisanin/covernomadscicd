const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');
const momentTz = require('moment-timezone');
const Wholesellers = getCollection('wholesellers');
const Agency = getCollection('agencies');
const Payment = getCollection('payments');
const Broker = getCollection('brokers');
// @desc    get payment history of agency and WS
// @route   GET /api/payments
// @access  WHOLESELLER, USER
const getPaymentHistory = async (req, res) => {
	const userType = req.user ? 'USER' : 'WHOLESELLER';
	const agencyId =
		userType === 'USER' ? req.user.agency._id : req.query.agencyId;
	const wholesalerId = req.wholesellerAdmin?.wholesellerId;
	let { topUpDateFrom, topUpDateTo, timezone } = req.query;
	let topUpDateRange = {
		start: momentTz.tz(topUpDateFrom, timezone).startOf('day').toDate(),
		end: momentTz.tz(topUpDateTo, timezone).endOf('day').toDate(),
	};

	let pipeline = [
		{
			$match: {
				...(userType === 'USER' || (agencyId && agencyId !== 'all')
					? {
							agency: new ObjectId(agencyId),
					  }
					: {
							wholeseller: new ObjectId(wholesalerId),
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
				localField: 'agency', // Look up the wholeseller associated with the agency
				foreignField: '_id',
				as: 'agency',
			},
		},
		{
			$addFields: {
				agencyName: { $arrayElemAt: ['$agency.name', 0] },
			},
		},
		{
			$project: {
				agency: 0,
				_id: 0,
			},
		},

		{
			$sort: { createdAt: -1 },
		},
	];
	if (userType === 'WHOLESELLER' && agencyId === 'all') {
		const agencies = await Agency.aggregate([
			{
				$match: {
					wholeseller: new ObjectId(wholesalerId),
				},
			},
		]).toArray();
		pipeline = [
			{
				$match: {
					agency: {
						$in: agencies.map((agency) => new ObjectId(agency._id)),
					},
				},
			},
			{
				$lookup: {
					from: 'agencies',
					localField: 'agency', // Look up the wholeseller associated with the agency
					foreignField: '_id',
					as: 'agency',
				},
			},
			{
				$addFields: {
					agencyName: { $arrayElemAt: ['$agency.name', 0] },
				},
			},
			{
				$project: {
					agency: 0,
				},
			},
			{
				$sort: { createdAt: -1 },
			},
		];
	}
	// Fetch payments based on the dynamic filter
	const payments = await Payment.aggregate(pipeline).toArray();

	return res.status(200).json({
		success: true,
		data: payments,
	});
};

// @desc    Generates a checkout url for balance clearnce
// @route   POST /api/payments/balance/clearance
// @access  WHOLESELLER, USER
const createBalanceClearanceCheckoutUrl = async (req, res) => {
	const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
	const { user, wholesellerAdmin } = req;
	const { successUrl, cancelUrl, balance, email } = req.body;

	if (!balance) {
		return res.status(400).json({
			msg: 'Balance is required',
		});
	}
	// if (balance % 500 !== 0) {
	// 	return res.status(400).json({
	// 		msg: 'Balance must be a multiple of 500',
	// 	});
	// }

	// const foundAgency = await Agency.findOne({
	// 	_id: new ObjectId(user?.agency?.agencyId),
	// });
	// const foundWholeseller = await Wholesellers.findOne({
	// 	_id: new ObjectId(wholesellerAdmin?.wholesellerId),
	// });
	// const amount = user ? foundAgency?.balance : foundWholeseller?.balance;

	const session = await stripe.checkout.sessions.create({
		mode: 'payment',
		// customer_email: user?.email || wholesellerAdmin?.email,
		customer_email: email,

		line_items: [
			{
				price_data: {
					currency: 'aed',
					product_data: {
						name: 'Settling Balance',
					},
					unit_amount: parseInt(balance) * 100,
				},
				quantity: 1,
			},
		],
		metadata: {
			type: 'BALANCE',
			entity: user ? 'AGENCY' : 'WHOLESELLER',
			...(user && {
				userId: req?.user?.userId,
				agencyId: req?.user?.agency?.agencyId,
			}),
			...(wholesellerAdmin && {
				wholesellerAdminId: req?.wholesellerAdmin?.wholesellerAdminId,
				wholesellerId: req?.wholesellerAdmin?.wholesellerId,
			}),
		},
		success_url: successUrl,
		cancel_url: cancelUrl,
	});

	return res.status(201).json({ session });
};

// @desc    A webhook listener for stripe events
// @route   POST /api/payments/stripe-webhook
// @access  PUBLIC
const stripeWebhook = async (req, res) => {
	let event;
	const sig = req.headers['stripe-signature'];
	const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
	const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
	try {
		event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
	} catch (err) {
		console.log('stripe webhook error', err);
		return res.status(400).send(`Webhook Error: ${err.message}`);
	}
	switch (event.type) {
		case 'checkout.session.completed': {
			const checkoutSession = event.data.object;
			const { id, metadata, amount_total } = checkoutSession;
			const amount = amount_total / 100;
			const {
				type,
				entity,
				agencyId,
				wholesellerId,
				userId,
				wholesellerAdminId,
			} = metadata;
			const foundAgency = await Agency.findOne({
				_id: new ObjectId(agencyId),
			});
			const foundWholeseller = await Wholesellers.findOne({
				_id: new ObjectId(wholesellerId),
			});
			const prevBalance =
				entity == 'AGENCY' ? foundAgency?.balance : foundWholeseller?.balance;
			const newBalance = Math.floor(
				entity == 'AGENCY'
					? foundAgency?.balance - amount
					: foundWholeseller?.balance - amount
			);

			if (entity == 'AGENCY')
				await Agency.updateOne(
					{ _id: foundAgency._id },
					{
						$set: {
							balance: newBalance,
						},
					}
				);
			else
				await Wholesellers.updateOne(
					{ _id: foundWholeseller._id },
					{
						$set: {
							balance: newBalance,
						},
					}
				);
			await Payment.insertOne({
				...(entity == 'AGENCY'
					? { agency: new ObjectId(agencyId) }
					: { wholeseller: new ObjectId(wholesellerId) }),
				type: 'BALANCE',
				channel: 'STRIPE',
				amount: amount,
				remarks: `From Stripe - Checkout ID: ${id}`,
				createdAt: new Date(),
				metadata: {
					prevBalance,
					newBalance,
				},
			});
			break;
		}
		default:
			console.log(`Unhandled event type ${event.type}`);
	}
	return res.sendStatus(200);
};
// @desc    A Listener to topup the balance of wholesellers and agencies
// @route   POST /api/payments/balance/topup/:wholesellerId
// @access  CVN and Wholeseller
const topUpBalance = async (req, res) => {
	const userType = req.cvnAdmin ? 'CVN' : 'WHOLESELLER';
	const { id } = req.params;
	const { entity } = req.query;
	const { topUpValue, remarks } = req.body;
	if (!entity || (entity != 'AGENCY' && entity != 'WHOLESELLER')) {
		return res.status(400).json({
			success: false,
			msg: 'Entity is required and should be either AGENCY or WHOLESELLER',
		});
	}
	try {
		const foundAgency = await Agency.findOne({
			_id: new ObjectId(id),
		});
		const wholesellerId =
			userType === 'CVN' && entity === 'WHOLESELLER'
				? id
				: userType === 'CVN' && entity === 'AGENCY'
				? foundAgency.wholeseller
				: userType === 'WHOLESELLER'
				? req.wholesellerAdmin.wholesellerId
				: null;
		if (wholesellerId === null) {
			return res.status(400).json({
				success: false,
				msg: 'Invalid wholesaler id',
			});
		}

		const foundWholeseller = await Wholesellers.findOne({
			_id: new ObjectId(wholesellerId),
		});

		const prevBalance =
			entity == 'AGENCY' ? foundAgency?.balance : foundWholeseller?.balance;
		const newBalance = Math.floor(
			entity == 'AGENCY'
				? foundAgency?.balance - topUpValue
				: foundWholeseller?.balance - topUpValue
		);
		if (userType === 'CVN' && entity === 'WHOLESELLER') {
			await Wholesellers.updateOne(
				{ _id: new ObjectId(wholesellerId) },
				{
					$set: {
						balance: newBalance,
					},
				}
			);
		}

		if (userType === 'WHOLESELLER' && entity === 'AGENCY') {
			if (
				foundWholeseller.maxBalance - foundWholeseller?.balance <
				topUpValue
			) {
				return res.status(400).json({
					success: false,
					msg: 'Your balance is already maxed out',
				});
			}
			await Agency.updateOne(
				{ _id: foundAgency._id },
				{
					$set: {
						balance: newBalance,
					},
				}
			);
			await Wholesellers.updateOne(
				{ _id: foundWholeseller._id },
				{
					$set: {
						balance: foundWholeseller?.balance + topUpValue,
					},
				}
			);
		} else if (userType === 'CVN' && entity === 'AGENCY') {
			if (foundWholeseller.maxBalance - foundWholeseller?.balance < topUpValue)
				return res.status(400).json({
					success: false,
					msg: 'Wholeseller balance is already maxed out',
				});
			await Agency.updateOne(
				{ _id: foundAgency._id },
				{
					$set: {
						balance: newBalance,
					},
				}
			);
			await Wholesellers.updateOne(
				{
					_id: foundAgency.wholeseller,
				},
				{
					$set: {
						balance: foundWholeseller?.balance + topUpValue,
					},
				}
			);
		}
		await Payment.insertOne({
			...(entity == 'AGENCY'
				? { agency: new ObjectId(id) }
				: { wholeseller: new ObjectId(wholesellerId) }),
			type: 'BALANCE',
			channel: 'MANUAL',
			amount: topUpValue,
			remarks: remarks,
			createdAt: new Date(),
			metadata: {
				prevBalance,
				newBalance,
			},
		});

		return res.status(200).json({
			success: true,
			msg: 'Balance updated successfully',
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error,
			msg: 'Internal server error',
		});
	}
};
// @desc    A Listener to topup the balance of brokers and agencies
// @route   POST /api/payments/balance/topup/iho/:brokerId
// @access  INSURER and BROKER
const ihoTopUpBalance = async (req, res) => {
	const userType = req.insurerAdmin ? 'INSURER' : 'BROKER';
	const { id } = req.params;
	const { entity } = req.query;

	const { topUpValue, remarks } = req.body;
	if (
		!entity ||
		(entity != 'AGENCY' && entity != 'BROKER' && entity != 'INSURERAGENCY')
	) {
		return res.status(400).json({
			success: false,
			msg: 'Entity is required and should be either AGENCY or BROKER',
		});
	}
	try {
		const foundAgency = await Agency.findOne({
			_id: new ObjectId(id),
		});
		const brokerId =
			userType === 'INSURER' && entity === 'BROKER'
				? id
				: userType === 'INSURER' && entity === 'INSURERAGENCY'
				? foundAgency.broker
				: userType === 'BROKER'
				? req.brokerAdmin.brokerId
				: null;

		if (brokerId === null) {
			return res.status(400).json({
				success: false,
				msg: 'Invalid broker id',
			});
		}

		const foundBroker = await Broker.findOne({
			_id: new ObjectId(brokerId),
		});

		const prevBalance =
			entity === 'AGENCY' || entity === 'INSURERAGENCY'
				? foundAgency?.balance
				: foundBroker?.balance;
		const newBalance = Math.floor(
			entity === 'AGENCY' || entity === 'INSURERAGENCY'
				? foundAgency?.balance - topUpValue
				: foundBroker?.balance - topUpValue
		);

		if (userType === 'INSURER' && entity === 'BROKER') {
			await Broker.updateOne(
				{ _id: new ObjectId(brokerId) },
				{
					$set: {
						balance: newBalance,
					},
				}
			);
		}

		if (userType === 'BROKER' && entity === 'AGENCY') {
			if (foundBroker.maxBalance - foundBroker?.balance < topUpValue) {
				return res.status(400).json({
					success: false,
					msg: 'Your balance is already maxed out',
				});
			}
			await Agency.updateOne(
				{ _id: foundAgency._id },
				{
					$set: {
						balance: newBalance,
					},
				}
			);
			await Broker.updateOne(
				{ _id: foundBroker._id },
				{
					$set: {
						balance: foundBroker?.balance + topUpValue,
					},
				}
			);
		} else if (userType === 'INSURER' && entity === 'INSURERAGENCY') {
			if (foundBroker.maxBalance - foundBroker?.balance < topUpValue)
				return res.status(400).json({
					success: false,
					msg: 'Broker balance is already maxed out',
				});
			await Agency.updateOne(
				{ _id: foundAgency._id },
				{
					$set: {
						balance: newBalance,
					},
				}
			);
			await Broker.updateOne(
				{
					_id: foundAgency.broker,
				},
				{
					$set: {
						balance: foundBroker?.balance + topUpValue,
					},
				}
			);
		}
		await Payment.insertOne({
			...(entity == 'AGENCY' || entity === 'INSURERAGENCY'
				? { agency: new ObjectId(id) }
				: { broker: new ObjectId(brokerId) }),
			type: 'BALANCE',
			channel: 'MANUAL',
			amount: topUpValue,
			remarks: remarks,
			createdAt: new Date(),
			metadata: {
				prevBalance,
				newBalance,
			},
		});

		return res.status(200).json({
			success: true,
			msg: 'Balance updated successfully',
		});
	} catch (error) {
		console.log('error', JSON.stringify(error));
		res.status(500).json({
			success: false,
			error: error,
			msg: 'Internal server error',
		});
	}
};
module.exports = {
	createBalanceClearanceCheckoutUrl,
	stripeWebhook,
	getPaymentHistory,
	topUpBalance,
	ihoTopUpBalance,
};
