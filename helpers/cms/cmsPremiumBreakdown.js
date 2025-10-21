const { ObjectId } = require('mongodb');
const { getCollection } = require('../../db');

const CmsAgency = getCollection('cmsAgency');

const cmsPremiumBreakdown = async ({ premium, agencyId }) => {
	let cvnPercentage = 0;
	let cmsPercentage = 0;
	let copePercentage = 19.4;
	let kmdPercentage = 0.6;
	let agencyPercentage = 0;

	let cvnShare = 0,
		cmsShare = 0,
		agencyShare = 0,
		kmdShare = 0,
		copeShare = 0,
		netPremium = 0;

	// Fetch Agency
	const foundAgency = await CmsAgency.findOne({ _id: new ObjectId(agencyId) });
	if (!foundAgency) throw new Error('Agency not found');

	// Set Agency Commission
	agencyPercentage = foundAgency?.commissionPercentage || 0;

	if (agencyPercentage >= 61 && agencyPercentage <= 70) {
		cvnPercentage = 10;
		cmsPercentage = 70;
	} else {
		cvnPercentage = 20;
		cmsPercentage = 60;
	}

	cmsPercentage = cmsPercentage - agencyPercentage; // Adjust CMS percentage based on agency commission
	// Calculate shares
	cmsShare = premium * (cmsPercentage / 100);
	cvnShare = premium * (cvnPercentage / 100);
	kmdShare = premium * (kmdPercentage / 100);
	copeShare = premium * (copePercentage / 100);
	agencyShare = premium * (agencyPercentage / 100);

	return {
		cvn: {
			percentage: cvnPercentage,
			value: cvnShare,
		},
		cms: {
			percentage: cmsPercentage,
			value: cmsShare,
		},
		agency: {
			percentage: agencyPercentage,
			value: agencyShare,
		},
		RI_Broker: {
			percentage: kmdPercentage,
			value: kmdShare,
		},
		cope: {
			percentage: copePercentage,
			value: copeShare,
		},
		netPremium: {
			value:
				premium - (cmsShare + cvnShare + kmdShare + copeShare + agencyShare),
		},
	};
};

module.exports = cmsPremiumBreakdown;
