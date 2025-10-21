const calculateAgeFactor = (numOfPax, age, productCode) => {
	const priceWithAgeFactore = {
		total: 0,
		totalExclVat: 0,
		totalVat: 0,
	};
	if (productCode === 'LITNMD' || productCode === 'ELTNMD') {
		const total =
			numOfPax.children * age[0].price.AED +
			numOfPax.adults * age[1].price.AED +
			numOfPax.seniors * age[2].price.AED +
			numOfPax.superSeniors * age[3].price.AED;
		const totalExclVat =
			numOfPax.children * age[0].priceExclVat.AED +
			numOfPax.adults * age[1].priceExclVat.AED +
			numOfPax.seniors * age[2].priceExclVat.AED +
			numOfPax.superSeniors * age[3].priceExclVat.AED;
		const totalVat =
			numOfPax.children * age[0].vat.AED +
			numOfPax.adults * age[1].vat.AED +
			numOfPax.seniors * age[2].vat.AED +
			numOfPax.superSeniors * age[3].vat.AED;

		priceWithAgeFactore.total = total;
		priceWithAgeFactore.totalExclVat = totalExclVat;
		priceWithAgeFactore.totalVat = totalVat;
	} else {
		const total =
			(numOfPax.children * age[0].price.AED) / 2 +
			numOfPax.adults * age[0].price.AED +
			numOfPax.seniors * age[1].price.AED +
			numOfPax.superSeniors * age[2].price.AED;
		const totalExclVat =
			(numOfPax.children * age[0].priceExclVat.AED) / 2 +
			numOfPax.adults * age[0].priceExclVat.AED +
			numOfPax.seniors * age[1].priceExclVat.AED +
			numOfPax.superSeniors * age[2].priceExclVat.AED;
		const totalVat =
			(numOfPax.children * age[0].vat.AED) / 2 +
			numOfPax.adults * age[0].vat.AED +
			numOfPax.seniors * age[1].vat.AED +
			numOfPax.superSeniors * age[2].vat.AED;

		priceWithAgeFactore.total = total;
		priceWithAgeFactore.totalExclVat = totalExclVat;
		priceWithAgeFactore.totalVat = totalVat;
	}

	return priceWithAgeFactore;
};

const calculateFamilyPremium = (numOfPax, age, productCode) => {
	const priceWithAgeFactore = {
		total: 0,
		totalExclVat: 0,
		totalVat: 0,
	};
	if (numOfPax.superSeniors != 0) {
		priceWithAgeFactore.total = age[2].price.AED;
		priceWithAgeFactore.totalExclVat = age[2].priceExclVat.AED;
		priceWithAgeFactore.totalVat = age[2].vat.AED;
		return priceWithAgeFactore;
	}
	if (numOfPax.seniors != 0) {
		priceWithAgeFactore.total = age[1].price.AED;
		priceWithAgeFactore.totalExclVat = age[1].priceExclVat.AED;
		priceWithAgeFactore.totalVat = age[1].vat.AED;
		return priceWithAgeFactore;
	}
	if (productCode == 'ELTFAM') {
		priceWithAgeFactore.total = age[0].price.AED;
		priceWithAgeFactore.totalExclVat = age[0].priceExclVat.AED;
		priceWithAgeFactore.totalVat = age[0].vat.AED;
		return priceWithAgeFactore;
	}

	return priceWithAgeFactore;
};
const ihoCalculateFamilyPremium = (numOfPax) => {
	const priceWithAgeFactore = {
		total: 0,
		totalExclVat: 0,
		totalVat: 0,
	};
	if (numOfPax.superSeniors != 0) {
		priceWithAgeFactore.total = age[2].price.AED;
		priceWithAgeFactore.totalExclVat = age[2].priceExclVat.AED;
		priceWithAgeFactore.totalVat = age[2].vat.AED;
		return priceWithAgeFactore;
	}
	if (numOfPax.seniors != 0) {
		priceWithAgeFactore.total = age[1].price.AED;
		priceWithAgeFactore.totalExclVat = age[1].priceExclVat.AED;
		priceWithAgeFactore.totalVat = age[1].vat.AED;
		return priceWithAgeFactore;
	}
};

module.exports = {
	calculateAgeFactor,
	calculateFamilyPremium,
	ihoCalculateFamilyPremium,
};
