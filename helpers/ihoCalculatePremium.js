const ihoCalculatePremium = ({ insurerCode, numOfPax, priceFactor }) => {
	// Initialize calculated price object
	const calculatedPrice = {
		premium: 0,
		totalExclVat: 0,
		vat: 0,
	};
	if (
		insurerCode !== 'IHO' ||
		insurerCode !== 'ORT' ||
		!priceFactor?.price?.AED ||
		!priceFactor?.premiumCondition
	) {
		return { premium: calculatedPrice };
	}

	const grossPrice = parseFloat(priceFactor.price.AED) || 0;

	const premiumCondition = priceFactor.premiumCondition;

	// Determine age groups dynamically based on premiumCondition
	let ageGroups = {};
	if (
		premiumCondition.length === 4 &&
		premiumCondition[0].max === 70 &&
		premiumCondition[1].max === 75 &&
		premiumCondition[2].max === 80 &&
		premiumCondition[3].max === 85
	) {
		// Standard case
		ageGroups = {
			children: {
				min: 1,
				max: 70,
				count: parseInt(numOfPax.children, 10) || 0,
			},
			adults: { min: 71, max: 75, count: parseInt(numOfPax.adults, 10) || 0 },
			seniors: { min: 76, max: 80, count: parseInt(numOfPax.seniors, 10) || 0 },
			superSeniors: {
				min: 81,
				max: 85,
				count: parseInt(numOfPax.superSeniors, 10) || 0,
			},
		};
	} else if (
		premiumCondition.length === 4 &&
		premiumCondition[0].max === 18 &&
		premiumCondition[1].max === 70 &&
		premiumCondition[2].max === 75 &&
		premiumCondition[3].max === 85
	) {
		ageGroups = {
			children: {
				min: 1,
				max: 18,
				count: parseInt(numOfPax.children, 10) || 0,
			},
			adults: { min: 19, max: 70, count: parseInt(numOfPax.adults, 10) || 0 },
			seniors: { min: 71, max: 75, count: parseInt(numOfPax.seniors, 10) || 0 },
			superSeniors: {
				min: 76,
				max: 85,
				count: parseInt(numOfPax.superSeniors, 10) || 0,
			},
		};
	} else if (
		premiumCondition.length === 2 &&
		premiumCondition[0].max === 18 &&
		premiumCondition[1].max === 60
	) {
		ageGroups = {
			children: {
				min: 1,
				max: 18,
				count: parseInt(numOfPax.children, 10) || 0,
			},
			adults: { min: 19, max: 60, count: parseInt(numOfPax.adults, 10) || 0 },
		};
	} else if (premiumCondition.length === 1 && premiumCondition[0].max === 70) {
		// 1D - 70 years
		ageGroups = {
			children: {
				min: 1,
				max: 18,
				count: parseInt(numOfPax.children, 10) || 0,
			},
			adults: { min: 19, max: 70, count: parseInt(numOfPax.adults, 10) || 0 },
		};
	} else if (premiumCondition.length === 1 && premiumCondition[0].max === 75) {
		// 1D - 75 years
		ageGroups = {
			adults: { min: 1, max: 75, count: parseInt(numOfPax.adults, 10) || 0 },
		};
	}

	let totalPremium = 0;
	let validProduct = false;

	// Calculate premium for each dynamically assigned age group
	for (const [group, { min, max, count }] of Object.entries(ageGroups)) {
		const condition = premiumCondition.find(
			(cond) => cond.min <= min && cond.max >= max
		);
		const multiplier = condition ? condition.multiplier : null;

		if (multiplier !== null) {
			totalPremium += multiplier * grossPrice * count;
			validProduct = true;
		}
	}

	// Final calculations
	calculatedPrice.premium = totalPremium;
	calculatedPrice.totalExclVat = totalPremium / 1.05;
	calculatedPrice.vat = calculatedPrice.totalExclVat * 0.05;

	return validProduct
		? { premium: calculatedPrice }
		: { premium: { premium: 0, totalExclVat: 0, vat: 0 } };
};

module.exports = ihoCalculatePremium;
