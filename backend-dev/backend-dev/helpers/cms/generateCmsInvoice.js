const { jsPDF } = require('jspdf');
const convertToCurrencyText = require('../convertNumToWords');

require('jspdf-autotable');

const TEXT_FONT_SIZE = 8;
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

const generateCmsInvoice = async ({ insurerCode, data }) => {
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
	const signatureImgBase64 = await getBase64FromUrl(
		'https://storage.googleapis.com/coi_templates/IHO/iho-signature.png'
	);
	const stampImgBase64 = await getBase64FromUrl(
		'https://storage.googleapis.com/coi_templates/IHO/iho-stamp.png'
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
		.text('DEBIT TAX INVOICE', pageWidth / 2, 60, {
			align: 'center',
		});
	//Policy Details
	const policyDetails = [
		['Invoice Number', `:  ${data.policyNumber.split('-').pop()}`],
		['Invoice Date', `:  ${data.issueDate}`],
		[
			`Policy Number`,
			`:  ${addPassangerNoInPolicyNumber({
				policy: data.policyNumber,
				passangerNo: 0,
			})} ${
				data?.status?.toLowerCase() === 'cancelled' ? `( Cancelled )` : ''
			}`,
		],
		// ['Policy No', `:  ${data.policyNumber}`],
	];
	doc.autoTable({
		startY: 65,
		body: policyDetails.map((row) => row.map((cell) => cell || '')),
		theme: 'plain',
		styles: {
			fontSize: TEXT_FONT_SIZE,
			cellPadding: 1,
			fontStyle: 'bold',
		},
		columnStyles: {
			0: { cellWidth: 25, fontStyle: 'bold' },
			1: { cellWidth: 140 }, // Adjust this to avoid wrapping
		},
		didParseCell: function (data) {
			// Apply bold to the first column
			if (data.column.index === 0) {
				data.cell.styles.fontStyle = 'bold';
			}
			// Apply normal to the second column
			if (data.column.index === 1) {
				data.cell.styles.fontStyle = 'normal';
			}
			if (data.cell.raw.includes('( Cancelled )')) {
				data.cell.styles.textColor = [255, 0, 0];
				data.cell.styles.fontStyle = 'bold';
			}
		},
		margin: { left: 100 },
	});
	//Insurer Details
	const insurerDetails = [
		['GST Number ', `:  100287232100003`],
		['Tel No', `:  ${data?.policyHolder?.mobileNumber || ''}`],
		['Email', `:  ${data.policyHolder.email}`],
		['To', `:  ${data.policyHolder.firstName} ${data.policyHolder.lastName}`],
		['GST number of CMS', `:  09AABCC6633K7ZB`],
		[
			'Insured',
			`:  ${data.policyHolder.firstName} ${data.policyHolder.lastName}`,
		],
	];
	doc.autoTable({
		startY: 80,
		body: insurerDetails.map((row) => row.map((cell) => cell || '')),
		theme: 'plain',
		styles: {
			fontSize: TEXT_FONT_SIZE,
			cellPadding: 1,
			fontStyle: 'bold',
		},
		columnStyles: {
			0: { cellWidth: 32 }, // First column width
			1: { cellWidth: 120 }, // Second column width
		},
		didParseCell: function (data) {
			// Apply bold to the first column
			if (data.column.index === 0) {
				data.cell.styles.fontStyle = 'bold';
			}
			// Apply normal to the second column
			if (data.column.index === 1) {
				data.cell.styles.fontStyle = 'normal';
			}
		},
		margin: { left: 10 },
	});

	// Note
	doc.setFontSize(TEXT_FONT_SIZE);
	doc.setFont(undefined, 'normal');
	doc.text(
		'Please note that we have DEBITED your Account with the following :',
		10,
		doc.lastAutoTable.finalY + 5
	);
	//information
	const amountInWords = convertToCurrencyText(data.totalPremium);
	const information = [
		// First row
		[
			{
				content: 'Information',
				styles: { fontStyle: 'bold', fontSize: HEADING_FONT_SIZE },
			},
			{
				content: 'INR',
				styles: { fontStyle: 'normal', fontSize: HEADING_FONT_SIZE },
			},
		],

		// Second row (spanning across two lines)
		[
			{
				content: `BEING PREMIUM CHARGED AGAINST POLICY ${data.policyNumber}\nGST 18%`,
				colSpan: 1, // You can adjust if needed, but here it's single column
				styles: { fontStyle: 'normal' },
			},
			{
				content: `${data.unitPremium}\n${data.totalVat}`,
				colSpan: 1,
				styles: { fontStyle: 'normal' },
			},
		],

		// Third row (Total)
		[
			{
				content: `TOTAL:\n(${amountInWords})`,
				colSpan: 1,
				styles: { fontStyle: 'normal' },
			},
			{
				content: `${data.totalPremium}`,
				colSpan: 1,
				styles: { fontStyle: 'normal' },
			},
		],
	];

	doc.autoTable({
		startY: doc.lastAutoTable.finalY + 10,
		body: information.map((row) => row.map((cell) => cell || '')),
		theme: 'grid',
		styles: {
			fontSize: TEXT_FONT_SIZE,
			cellPadding: 1,
			fontStyle: 'normal',
			lineHeight: 1.5,
		},
		margin: { left: 10 },
	});

	doc.text(`E.O.E`, 10, doc.lastAutoTable.finalY + 10);
	doc.text(
		`This is a Computer Generated Document and Hence No Signature is Required`,
		70,
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

module.exports = generateCmsInvoice;
