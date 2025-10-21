const numberToWords = (num) => {
	const ones = [
		'',
		'One',
		'Two',
		'Three',
		'Four',
		'Five',
		'Six',
		'Seven',
		'Eight',
		'Nine',
	];
	const teens = [
		'Eleven',
		'Twelve',
		'Thirteen',
		'Fourteen',
		'Fifteen',
		'Sixteen',
		'Seventeen',
		'Eighteen',
		'Nineteen',
	];
	const tens = [
		'',
		'Ten',
		'Twenty',
		'Thirty',
		'Forty',
		'Fifty',
		'Sixty',
		'Seventy',
		'Eighty',
		'Ninety',
	];
	const thousands = ['', 'Thousand'];

	let word = '';

	function getHundreds(n) {
		let str = '';
		if (n > 99) {
			str += ones[Math.floor(n / 100)] + ' Hundred ';
			n %= 100;
		}
		if (n > 10 && n < 20) {
			str += teens[n - 11] + ' ';
		} else {
			str += tens[Math.floor(n / 10)] + ' ';
			str += ones[n % 10] + ' ';
		}
		return str.trim();
	}

	if (num === 0) return 'Zero';

	let thousandPart = Math.floor(num / 1000);
	let hundredPart = num % 1000;

	if (thousandPart > 0) {
		word += getHundreds(thousandPart) + ' ' + thousands[1] + ' ';
	}
	word += getHundreds(hundredPart);

	return word.trim();
};

function convertToCurrencyText(amount) {
	const [dirhams, fils] = amount.toFixed(2).split('.').map(Number);

	const dirhamsText = numberToWords(dirhams);
	const filsText = numberToWords(fils);

	return `Indian Rupee ${dirhamsText} And Fils ${filsText} Only`;
}

module.exports = convertToCurrencyText;
