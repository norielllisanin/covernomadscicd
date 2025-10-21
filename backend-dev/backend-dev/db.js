const { MongoClient, ServerApiVersion } = require('mongodb');

const insurerSchema = require('./models/insurer.model');
const agencySchema = require('./models/agency.model');
const userSchema = require('./models/user.model');
const productSchema = require('./models/product.model');
const priceFactorSchema = require('./models/priceFactor.model');
const coverageSchema = require('./models/coverage.model');
const policySchema = require('./models/policy.model');
const passengerSchema = require('./models/passenger.model');
const partnerSchema = require('./models/partner.model');
const wholesellerSchema = require('./models/wholeseller.model');
const wholesellerAdminSchema = require('./models/wholesellerAdmin.model');
const cvnAdminSchema = require('./models/cvnAdmin.model');
const addOnSchema = require('./models/addOn.model');
const creditHistorySchema = require('./models/creditHistory.model');
const paymentSchema = require('./models/payment.model');
const insurerAdminSchema = require('./models/insurerAdmin.model');
const brokerSchema = require('./models/broker.model');
const brokerAdminSchema = require('./models/brokerAdmin.model');
const quotationSchema = require('./models/quote.model');
const reportSchema = require('./models/report.model');
const cmsAgencySchema = require('./models/cms/cms-agency.model');

const dbCollections = [
	{
		collectionName: 'insurers',
		schema: insurerSchema,
	},
	{
		collectionName: 'passengers',
		schema: passengerSchema,
	},
	{
		collectionName: 'partners',
		schema: partnerSchema,
	},
	{
		collectionName: 'coverages',
		schema: coverageSchema,
	},
	{
		collectionName: 'policies',
		schema: policySchema,
	},
	{
		collectionName: 'products',
		schema: productSchema,
	},
	{
		collectionName: 'passengers',
		schema: passengerSchema,
	},
	{
		collectionName: 'priceFactors',
		schema: priceFactorSchema,
	},
	{
		collectionName: 'agencies',
		schema: agencySchema,
	},
	{
		collectionName: 'brokers',
		schema: brokerSchema,
	},
	{
		collectionName: 'users',
		schema: userSchema,
	},
	{
		collectionName: 'wholesellers',
		schema: wholesellerSchema,
	},
	{
		collectionName: 'wholesellerAdmins',
		schema: wholesellerAdminSchema,
	},
	{
		collectionName: 'insurerAdmins',
		schema: insurerAdminSchema,
	},
	{
		collectionName: 'brokerAdmins',
		schema: brokerAdminSchema,
	},

	{
		collectionName: 'cvnAdmins',
		schema: cvnAdminSchema,
	},
	{
		collectionName: 'addOns',
		schema: addOnSchema,
	},
	{
		collectionName: 'creditHistories',
		schema: creditHistorySchema,
	},
	{
		collectionName: 'payments',
		schema: paymentSchema,
	},
	{
		collectionName: 'quote',
		schema: quotationSchema,
	},
	{
		collectionName: 'report',
		schema: reportSchema,
	},

	{
		collectionName: 'cmsAgency',
		schema: cmsAgencySchema,
	},
];

const uri = process.env.DB_URI;
const dbName = process.env.DB_NAME;
const client = new MongoClient(uri, {
	connectTimeoutMS: 3600000, // 60 minutes
	serverSelectionTimeoutMS: 3600000, // 60 minutes
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

const connectToDB = async () => {
	try {
		await client.connect();
		console.log('You successfully connected to MongoDB!', dbName);
		//Collections instantiation
		console.log('Instantiating database collections...');
		const collections = await client.db(dbName).listCollections().toArray();
		const collectionNames = collections.map((c) => c.name);
		for (let collection of dbCollections) {
			if (!collectionNames.includes(collection.collectionName))
				await client.db(dbName).createCollection(collection.collectionName);
			await client.db(dbName).command({
				collMod: collection.collectionName,
				validator: collection.schema,
			});
		}
		console.log('Collections instantiated!');
	} catch (e) {
		console.error(e);
	}
};

const getCollection = (collectionName) => {
	return client.db(dbName).collection(collectionName);
};

module.exports = {
	connectToDB,
	getCollection,
};
