const { jsPDF } = require('jspdf');
const { ToWords } = require('to-words');

require('jspdf-autotable');

const toWords = new ToWords();

const SUBHEADING_FONT_SIZE = 10;
const HEADING_FONT_SIZE = 12;
const { normalArabicBase64Font, blodArabicBase64Font } = require('../Fonts');
const { addPassangerNoInPolicyNumber } = require('./generateCmsPolicyNumber');
// Function to convert an image URL to base64
async function getBase64FromUrl(url) {
	const response = await fetch(url);
	const arrayBuffer = await response.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	return buffer.toString('base64');
}

const generateCmsReceipt = async ({ insurerCode, data }) => {
	const doc = new jsPDF('p', 'mm', 'a4');

	doc.addFileToVFS('Amiri-Regular.ttf', normalArabicBase64Font);
	doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
	doc.addFileToVFS('Amiri-Bold.ttf', blodArabicBase64Font);
	doc.addFont('Amiri-Bold.ttf', 'Amiri', 'bold');

	jsPDF.API.events.push([
		'addFonts',
		function () {
			this.addFileToVFS('Amiri-Regular.ttf', normalArabicBase64Font);
			this.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
		},
	]);

	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();

	const headerImgBase64 = await getBase64FromUrl(
		'https://storage.googleapis.com/coi_templates/cms_portal/CMS%20Brand%20Logo.png'
	);

	const ribbonImgBase64 = await getBase64FromUrl(
		'https://storage.googleapis.com/coi_templates/IHO/Coi_footer_image.png' // Replace with your actual ribbon image URL
	);

	// Add header image
	doc.addImage(
		`data:image/png;base64,${headerImgBase64}`,
		'PNG',
		40,
		5,
		120,
		38
	);

	doc
		.setFontSize(HEADING_FONT_SIZE)
		.setTextColor(0, 0, 0)
		.setFont(undefined, 'bold')
		.text('RECEIPT', pageWidth / 2, 60, {
			align: 'center',
		});

	//Policy Details
	const policyDetails = [
		['Branch', 'CHOLAMANDALAM MS GENERAL INSURANCE COMPANY LIMITED'],
		[
			'Receipt Number',
			`${addPassangerNoInPolicyNumber({
				policy: data.policyNumber,
				passangerNo: 0,
			})} ${
				data?.status?.toLowerCase() === 'cancelled' ? `( Cancelled )` : ''
			}`,
		],
		// ['Receipt Number', data.policyNumber],
		['Issue Date', data.issueDate],
		['Client ID', 'N/A'],
		[
			'Client Name',
			`${data.policyHolder.firstName} ${data.policyHolder.lastName}`,
		],
		[
			'Address',
			'2nd Floor, “DARE House”, 2, N.S.C. Bose Road, Chennai – 600 001.',
		],
		[
			'Received From',
			`${data.policyHolder.firstName} ${data.policyHolder.lastName}`,
		],
		['Amount', `${data.totalPremium} INR`],
		['Mode of Payment', 'Point of Sale'],
		['Remarks (if any)', 'N/A'],
	];
	doc.autoTable({
		startY: 70,
		body: policyDetails.map((row) => row.map((cell) => cell || '')),
		columnStyles: {
			0: { halign: 'left', fillColor: [201, 216, 238], cellWidth: 40 },
		},
		theme: 'plain',
		styles: {
			fontSize: SUBHEADING_FONT_SIZE,
			cellPadding: 2,
			fontStyle: 'bold',
		},
		didParseCell: function (data) {
			if (data.cell.raw.includes('( Cancelled )')) {
				data.cell.styles.textColor = [255, 0, 0];
				data.cell.styles.fontStyle = 'bold';
			}
		},
	});

	//Amount Details
	const amountDetails = [
		['Total', `${data.totalPremium} INR`],
		[
			'Total in words',
			toWords.convert(data.totalPremium, {
				currency: true,
				currencyOptions: {
					name: 'Indian Rupee',
					plural: 'Indian Rupee',
					fractionalUnit: {
						name: 'Fil',
						plural: 'Fils',
					},
				},
			}),
		],
	];
	doc.autoTable({
		startY: doc.lastAutoTable.finalY + 20,
		body: amountDetails.map((row) => row.map((cell) => cell || '')),
		columnStyles: {
			0: { halign: 'left', fillColor: [201, 216, 238], cellWidth: 40 },
		},
		theme: 'grid',
		styles: {
			fontSize: SUBHEADING_FONT_SIZE,
			cellPadding: 2,
			fontStyle: 'bold',
			lineWidth: 0.3,
			textColor: '#000000',
			lineColor: [0, 0, 0],
		},
	});

	doc
		.setFontSize(SUBHEADING_FONT_SIZE)
		.text(
			'Note: This is a computer generated document that does not require any signature.',
			15,
			doc.lastAutoTable.finalY + 15
		);

	// const ribbonHeight = 6;
	// const totalCellWidth = doc.internal.pageSize.getWidth();
	// const spaceBetween = 0.5;
	// const eachCellWidth = (totalCellWidth - spaceBetween) / 2;

	// doc.autoTable({
	// 	startY: doc.internal.pageSize.getHeight() - 38,
	// 	body: [['', '', '']], // same content
	// 	theme: 'plain',
	// 	styles: {
	// 		fontSize: 10,
	// 		minCellHeight: ribbonHeight,
	// 		cellPadding: 1,
	// 		minCellHeight: 5,
	// 		fontStyle: 'bold',
	// 		textColor: [255, 255, 255],
	// 		valign: 'middle',
	// 	},
	// 	columnStyles: {
	// 		0: {
	// 			fillColor: [200, 70, 60],
	// 			cellWidth: eachCellWidth,
	// 		},
	// 		1: {
	// 			fillColor: [255, 255, 255],
	// 			cellWidth: 0.5,
	// 			fontStyle: 'normal',
	// 			fontSize: 1,
	// 			cellPadding: 0,
	// 		},
	// 		2: {
	// 			fillColor: [90, 140, 200],
	// 			cellWidth: eachCellWidth,
	// 		},
	// 	},
	// 	margin: { left: 0 },
	// 	tableLineWidth: 0,
	// 	didDrawCell: function (data) {
	// 		if (data.column.index === 1) {
	// 			data.cell.x += spaceBetween;
	// 		}
	// 	},
	// });

	const startY = pageHeight - 10; // Y-position from top
	const heights = [10, 10, 10]; // Different heights for each rectangle
	const colors = ['#C8463C', '#FFFFFF', '#5A8CC8']; // Red, Green, Blue
	const widths = [0.5, 0.005, 0.5];
	let currentX = 0; // Starting X position with some left margin

	widths.forEach((widthPercent, i) => {
		const width = pageWidth * widthPercent;
		const height = heights[i];
		const color = colors[i];

		doc.setFillColor(color);
		doc.rect(currentX, startY, width, height, 'F');

		currentX += width; // Move X to the right
	});

	return doc.output('arraybuffer');
};

module.exports = generateCmsReceipt;
