const calculateCmsAgeFactor = (numOfPax, age) => {
	const priceWithAgeFactore = {
		total: 0,
		totalExclVat: 0,
		totalVat: 0,
	};

	priceWithAgeFactore.total =
		numOfPax.children * age[0].price.INR +
		numOfPax.adults * age[0].price.INR +
		numOfPax.seniors * age[1].price.INR +
		numOfPax.superSeniors * age[2].price.INR;
	// priceWithAgeFactore.totalExclVat =
	// 	numOfPax.children * age[0].priceExclVat.INR +
	// 	numOfPax.adults * age[0].priceExclVat.INR +
	// 	numOfPax.seniors * age[1].priceExclVat.INR +
	// 	numOfPax.superSeniors * age[2].priceExclVat.INR;
	// priceWithAgeFactore.totalVat =
	// 	numOfPax.children * age[0].vat.INR +
	// 	numOfPax.adults * age[0].vat.INR +
	// 	numOfPax.seniors * age[1].vat.INR +
	// 	numOfPax.superSeniors * age[2].vat.INR;
	return priceWithAgeFactore;
};

const calculateCmsFamilyPremium = (numOfPax, age) => {
	const priceWithAgeFactore = {
		total: 0,
		totalExclVat: 0,
		totalVat: 0,
	};
	if (numOfPax.superSeniors != 0) {
		priceWithAgeFactore.total = age[2].price.INR;
		// priceWithAgeFactore.totalExclVat = age[2].priceExclVat.INR;
		// priceWithAgeFactore.totalVat = age[2].vat.INR;
		return priceWithAgeFactore;
	}
	if (numOfPax.seniors != 0) {
		priceWithAgeFactore.total = age[1].price.INR;
		// priceWithAgeFactore.totalExclVat = age[1].priceExclVat.INR;
		// priceWithAgeFactore.totalVat = age[1].vat.INR;
		return priceWithAgeFactore;
	}
	priceWithAgeFactore.total = age[0].price.INR;
	// priceWithAgeFactore.totalExclVat = age[0].priceExclVat.INR;
	// priceWithAgeFactore.totalVat = age[0].vat.INR;
	return priceWithAgeFactore;
};

module.exports = {
	calculateCmsAgeFactor,
	calculateCmsFamilyPremium,
};
