const { roundToTwoDecimals } = require('../utils');

const getAddOnPrice = ({ premium, addOns }) => {
	let addOnTotal = 0;
	addOns.forEach((addon) => {
		addOnTotal += roundToTwoDecimals(premium * addon.multiplier, 2);
	});
	// addOns.map((addOn) => (addOnTotal += addOn.multiplier));
	// return roundToTwoDecimals(premium * addOnTotal);
	return addOnTotal;
};

module.exports = getAddOnPrice;
