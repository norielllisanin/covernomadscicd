const {
	calculateCmsAgeFactor,
	calculateCmsFamilyPremium,
} = require('./calculateCmsAgeFactors');

const calculateCmsPremium = ({ insurerCode, productCode, numOfPax, age }) => {
	let calculatedPrice = 0;
	if (insurerCode === 'CMS') {
		// don't charge children premium for family plan
		if (productCode == 'ELTFAM') {
			calculatedPrice = calculateCmsFamilyPremium(numOfPax, age);
		} else {
			calculatedPrice = calculateCmsAgeFactor(numOfPax, age);
		}
	}
	return {
		premium: calculatedPrice,
	};
};

module.exports = calculateCmsPremium;
