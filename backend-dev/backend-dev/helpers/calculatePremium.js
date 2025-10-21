const {
	calculateFamilyPremium,
	calculateAgeFactor,
} = require('./calculateAgeFactor');

const calculatePremium = ({
	insurerCode,
	premium,
	productCode,
	numOfPax,
	multiplier,
	age,
	family,
}) => {
	let calculatedPrice = 0;
	if (insurerCode === 'CMS' || insurerCode === 'IHO' || insurerCode === 'ORT') {
		// don't charge children premium for family plan
		if (family && productCode == 'ELTFAM') {
			calculatedPrice = calculateFamilyPremium(
				numOfPax,
				age,
				productCode,
				family
			);
		} else {
			calculatedPrice = calculateAgeFactor(numOfPax, age, productCode);
		}
	}
	return {
		premium: calculatedPrice,
	};
};

module.exports = calculatePremium;
