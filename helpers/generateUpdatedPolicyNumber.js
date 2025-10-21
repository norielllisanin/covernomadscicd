const generateUpdatedPolicyNumber = ({ policyNumber }) => {
	const dev = process.env.ENVIRONMENT === 'development';

	let parts = policyNumber.split('-');
	if (dev ? parts.length === 7 : parts.length == 6) {
		let parts = policyNumber.split('-');
		let lastPart = parts[parts.length - 1];
		let incrementedLastPart = (parseInt(lastPart) + 1)
			.toString()
			.padStart(lastPart.length, '0');
		parts[parts.length - 1] = incrementedLastPart;
		let newPolicyNumber = parts.join('-');
		return newPolicyNumber;
	}

	return `${policyNumber}-01`;
};

module.exports = generateUpdatedPolicyNumber;
