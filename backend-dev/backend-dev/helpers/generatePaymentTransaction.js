const { sendNetworkRequest } = require('../utils');

const generatePaymentTransaction = async ({
	amount,
	quotationDetails,
	customerDetails,
}) => {
	const { name, email } = customerDetails;
	const { id, number } = quotationDetails;
	const paymentTransaction = await sendNetworkRequest({
		method: 'POST',
		url: 'https://secure.paytabs.com/payment/link/create',

		headers: {
			Authorization: process.env.PAYTABS_SERVER_KEY,
		},
		body: {
			profile_id: Number(process.env.PAYTABS_PROFILE_ID),
			tran_type: 'sale',
			tran_class: 'ecom',
			cart_id: `${id}-portal`,
			cart_description: `Payment for ${number}`,
			cart_currency: 'AED',
			cart_amount: amount,
			link_title: 'Non-expiring PayLink',
			customer_details: {
				name,
				email,
				country: 'AE',
			},
		},
	});
	return paymentTransaction;
};

module.exports = generatePaymentTransaction;
