const { default: axios } = require('axios');
const { ObjectId } = require('mongodb');
const { COUNTRIES } = require('./exports');

const generateRandomString = (length) => {
	const charset =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		const randomIndex = Math.floor(Math.random() * charset.length);
		result += charset.charAt(randomIndex);
	}
	return result;
};

const generateRandomNumber = (length) => {
	const charset = '0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		const randomIndex = Math.floor(Math.random() * charset.length);
		result += charset.charAt(randomIndex);
	}
	return result;
};

const getFileExtension = (fileName) => {
	const parts = fileName?.split('.');
	if (parts?.length === 1 || (parts[0] === '' && parts?.length === 2)) {
		return '';
	}
	return parts?.pop()?.toLowerCase();
};

const isObject = function (obj) {
	const type = typeof obj;
	return type === 'function' || (type === 'object' && !!obj);
};

const formatIds = (inputObject, keyName) => {
	if (Array.isArray(inputObject)) {
		for (let obj of inputObject) {
			formatIds(obj, keyName);
		}
	} else {
		inputObject[`${keyName}Id`] = inputObject?._id;
		delete inputObject?._id;
		for (const [key, value] of Object.entries(inputObject)) {
			if (isObject(value)) formatIds(value, key);
		}
	}
	return inputObject;
};

const sendNetworkRequest = async ({ method, url, headers, body }) => {
	try {
		const response = await axios({
			method: method,
			url: url,
			headers: headers,
			data: body,
		});
		return { data: response.data, status: response.status };
	} catch (error) {
		console.error(
			'NETWORK REQUEST ERROR:',
			JSON.stringify({
				method: error?.config?.method,
				url: error?.config?.url,
				headers: headers,
				body: error?.config?.data,
				response: {
					data: error?.response?.data,
					status: error?.response?.status,
				},
			})
		);
		return { error: error?.response?.data || true };
	}
};

const getDateRange = ({ from, to }) => {
	const startDate = new Date(from);
	startDate.setUTCHours(0, 0, 0, 0);
	const endDate = to ? new Date(to) : new Date();
	endDate.setUTCHours(23, 59, 59, 999);
	return { start: startDate, end: endDate };
};

const roundToTwoDecimals = (number) => {
	return Math.round((number + Number.EPSILON) * 100) / 100;
};
const roundToThreeDecimals = (number) => {
	return Math.round((number + Number.EPSILON) * 1000) / 1000;
};
const truncateToTwoDecimals = (number, decimalPlaces = 2) => {
	if (number == null) return null;
	const factor = Math.pow(10, decimalPlaces);
	return Math.trunc(number * factor) / factor;
};

const capitalizeWord = (word) => {
	if (!word) return ''; // Return an empty string if input is empty or not provided
	return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
};

const getCountryName = (countryCode) => {
	return COUNTRIES.find((country) => country.code === countryCode)?.name;
};

const testPolicyNumber =
	process.env.ENVIRONMENT === 'development'
		? 'This policy is invalid and for test purposes only.'
		: '';

//How to file a Claim ORT
const ORT_HowtoClaim =
	'https://storage.googleapis.com/coi_templates/UAE_portal/ORT_HowtoClaim.pdf';
//How to file a Claim IHO
const IHO_HowtoClaim =
	'https://storage.googleapis.com/coi_templates/IHO/ISA%20Assist%20Travel%20App%20Flyer.pdf';
//How to file a Claim CMS
const CMS_HowtoClaim =
	'https://storage.googleapis.com/coi_templates/cms_portal/CMS%20CTS%20How%20to%20Claim.pdf';

module.exports = {
	generateRandomString,
	getFileExtension,
	formatIds,
	getDateRange,
	roundToTwoDecimals,
	roundToThreeDecimals,
	capitalizeWord,
	getCountryName,
	generateRandomNumber,
	truncateToTwoDecimals,
	sendNetworkRequest,
	testPolicyNumber,
	ORT_HowtoClaim,
	IHO_HowtoClaim,
	CMS_HowtoClaim,
};
