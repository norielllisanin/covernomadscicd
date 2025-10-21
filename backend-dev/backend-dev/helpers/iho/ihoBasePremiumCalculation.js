const ihoBasePremiumCalculation = ({
	priceFactor,
	children,
	adults,
	seniors,
	superSeniors,
}) => {
	let childBasePremium = 0;
	let adultBasePremium = 0;
	let seniorBasePremium = 0;
	let superSeniorBasePremium = 0;
	const grossPrice = parseFloat(priceFactor.price.AED) / 1.05;
	const premiumCondition = priceFactor.premiumCondition;
	let ageGroups = {};

	if (
		premiumCondition.length === 4 &&
		premiumCondition[0].max === 70 &&
		premiumCondition[1].max === 75 &&
		premiumCondition[2].max === 80 &&
		premiumCondition[3].max === 85
	) {
		ageGroups = {
			children: { min: 1, max: 70, count: parseInt(children, 10) || 0 },
			adults: { min: 71, max: 75, count: parseInt(adults, 10) || 0 },
			seniors: { min: 76, max: 80, count: parseInt(seniors, 10) || 0 },
			superSeniors: {
				min: 81,
				max: 85,
				count: parseInt(superSeniors, 10) || 0,
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
			children: { min: 1, max: 18, count: parseInt(children, 10) || 0 },
			adults: { min: 19, max: 70, count: parseInt(adults, 10) || 0 },
			seniors: { min: 71, max: 75, count: parseInt(seniors, 10) || 0 },
			superSeniors: {
				min: 76,
				max: 85,
				count: parseInt(superSeniors, 10) || 0,
			},
		};
	} else if (
		premiumCondition.length === 2 &&
		premiumCondition[0].max === 18 &&
		premiumCondition[1].max === 60
	) {
		ageGroups = {
			children: { min: 1, max: 18, count: parseInt(children, 10) || 0 },
			adults: { min: 19, max: 60, count: parseInt(adults, 10) || 0 },
		};
	} else if (premiumCondition.length === 1 && premiumCondition[0].max === 70) {
		ageGroups = {
			children: { min: 1, max: 18, count: parseInt(children, 10) || 0 },
			adults: { min: 19, max: 70, count: parseInt(adults, 10) || 0 },
		};
	} else if (premiumCondition.length === 1 && premiumCondition[0].max === 75) {
		ageGroups = {
			adults: { min: 1, max: 75, count: parseInt(adults, 10) || 0 },
		};
	}

	// Calculate base premiums
	for (const [group, { min, max, count }] of Object.entries(ageGroups)) {
		if (count > 0) {
			const condition = premiumCondition.find(
				(cond) => cond.min <= min && cond.max >= max
			);
			const multiplier = condition ? condition.multiplier : 0;
			if (multiplier > 0) {
				switch (group) {
					case 'children':
						childBasePremium = count * multiplier * grossPrice;
						break;
					case 'adults':
						adultBasePremium = count * multiplier * grossPrice;
						break;
					case 'seniors':
						seniorBasePremium = count * multiplier * grossPrice;
						break;
					case 'superSeniors':
						superSeniorBasePremium = count * multiplier * grossPrice;
						break;
				}
			}
		}
	}

	return {
		childBasePremium,
		adultBasePremium,
		seniorBasePremium,
		superSeniorBasePremium,
	};
};
module.exports = ihoBasePremiumCalculation;
