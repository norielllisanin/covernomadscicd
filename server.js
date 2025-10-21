const express = require('express');
const app = express();
require('dotenv').config();

const insurerRoutes = require('./routes/insurer.routes');
const partnerRoutes = require('./routes/partner.routes');
const agencyRoutes = require('./routes/agency.routes');
const userRoutes = require('./routes/user.routes');
const policyRoutes = require('./routes/policy.routes');
const cmsPolicyRoutes = require('./routes/cms/cmsPolicy.routes');
const cvnAdminRoutes = require('./routes/cvnAdmin.routes');
const wholesellerRoutes = require('./routes/wholeseller.routes');
const addOnRoutes = require('./routes/addOn.routes');
const cmsAddOnRoutes = require('./routes/cms/cmsAddOns.routes');
const scriptsRoutes = require('./routes/scripts.routes');
const creditHistoryRoutes = require('./routes/creditHistory.routes');
const paymentRoutes = require('./routes/payment.routes');
const passengerRoutes = require('./routes/passenger.routes');
const brokerRoutes = require('./routes/broker.routes');
const agencyBrokerRoutes = require('./routes/agencyBroker.routes');
const quoteRoutes = require('./routes/quote.routes');
const reportRoutes = require('./routes/report.routes');
const cmsReportRoutes = require('./routes/cms/cmsReport.routes');
const cmsQuoteRoutes = require('./routes/cms/cmsQuotes.routes');
const cmsAgencyRoutes = require('./routes/cms/cmsAgency.routes');

const { connectToDB } = require('./db');
//-------------MIDDLEWARE----------
app.use(express.urlencoded({ limit: '50mb' }));
app.use(
	express.json({
		limit: '50mb',
		verify: (req, res, buf) => {
			req.rawBody = buf.toString();
		},
	})
);

app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Credentials', 'true');

	res.setHeader(
		'Access-Control-Allow-Methods',
		'GET, POST, OPTIONS, PUT, PATCH, DELETE'
	);
	res.header(
		'Access-Control-Allow-Headers',
		'Origin, X-Requested-With, Content-Type, Accept, Authorization'
	);

	next();
});
//-------------MIDDLEWARE----------

app.use('/api/insurers', insurerRoutes);

app.use('/api/partners', partnerRoutes);
app.use('/api/agencies', agencyRoutes);
app.use('/api/brokers', brokerRoutes);
app.use('/api/agency-broker', agencyBrokerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/cvn-admins', cvnAdminRoutes);
app.use('/api/wholesellers', wholesellerRoutes);
app.use('/api/add-ons', addOnRoutes);
app.use('/api/credit-histories', creditHistoryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/scripts', scriptsRoutes);
app.use('/api/passengers', passengerRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/reports', reportRoutes);

// CMS routes
app.use('/api/cms/agency', cmsAgencyRoutes);
app.use('/api/cms/policy', cmsPolicyRoutes);
app.use('/api/cms/reports', cmsReportRoutes);
app.use('/api/cms-add-ons', cmsAddOnRoutes);
app.use('/api/cms/quotes', cmsQuoteRoutes);

//global error handler
app.use((err, req, res, next) => {
	console.error(err);
	res.status(500).json({
		msg: err.message,
		details: err,
	});
});
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, async () => {
	console.log(`Server started on PORT ${PORT}`);
	await connectToDB();
});
server.timeout = 30 * 60 * 1000; // 30 minutes

module.exports = { app, server };
