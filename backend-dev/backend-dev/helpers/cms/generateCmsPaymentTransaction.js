const { sendNetworkRequest } = require('../../utils');

const generateCmsPaymentTransaction = async ({
	amount,
	quotationDetails,
	customerDetails,
}) => {
	const { name, email, phone, firstName, lastName, customerId } =
		customerDetails;
	const { id, number } = quotationDetails;

	// ---- Encode API key for Basic Auth ----
	const apiKey = process.env.HDFC_API_KEY || 'A08542F3CF94AC1BC47352A8B240FD';
	const apiSecret = process.env.HDFC_API_SECRET || ''; // often blank
	const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

	const orderId = number.replace(/[^a-zA-Z0-9\-_.()+~{}]/g, '-');

	// ---- HDFC SmartGateway API ----
	const paymentTransaction = await sendNetworkRequest({
		method: 'POST',
		url: `https://smartgatewayuat.hdfcbank.com/session`,
		headers: {
			Authorization: `Basic ${authString}`,
			'Content-Type': 'application/json',
			'x-merchantid': process.env.HDFC_MERCHANT_ID || 'SG3456',
			'x-customerid': customerId || 'default-customer',
		},
		body: {
			order_id: orderId,
			amount: String(amount),
			customer_id: customerId || `${id}-customer`,
			customer_email: email,
			customer_phone: phone || '03360951060',
			payment_page_client_id:
				process.env.HDFC_PAYMENT_PAGE_CLIENT_ID || 'hdfcmaster',
			action: 'paymentPage',
			currency: 'INR',
			return_url:
				process.env.HDFC_RETURN_URL || 'http://localhost:3000/dashboard',
			description: `Payment for ${number}`,
			first_name: firstName || name?.split(' ')[0] || 'NA',
			last_name: lastName || name?.split(' ')[1] || 'NA',
		},
	});

	return paymentTransaction;
};

module.exports = generateCmsPaymentTransaction;
