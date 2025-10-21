const { jsPDF } = require('jspdf');
const { ToWords } = require('to-words');

require('jspdf-autotable');

const toWords = new ToWords();

const SUBHEADING_FONT_SIZE = 10;
const HEADING_FONT_SIZE = 12;
const { normalArabicBase64Font, blodArabicBase64Font } = require('./Fonts');
const { testPolicyNumber } = require('../utils');
// Function to convert an image URL to base64
async function getBase64FromUrl(url) {
	const response = await fetch(url);
	const arrayBuffer = await response.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	return buffer.toString('base64');
}

const generateReceipt = async ({ insurerCode, data }) => {
	const doc = new jsPDF('p', 'mm', 'a4');

	doc.addFileToVFS('Amiri-Regular.ttf', normalArabicBase64Font);
	doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
	doc.addFileToVFS('Amiri-Bold.ttf', blodArabicBase64Font);
	doc.addFont('Amiri-Bold.ttf', 'Amiri', 'bold');

	jsPDF.API.events.push([
		'addFonts',
		function () {
			this.addFileToVFS('Amiri-Regular.ttf', arabicFont);
			this.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
		},
	]);

	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();

	const headerImgBase64 = await getBase64FromUrl(
		'https://storage.googleapis.com/coi_templates/IHO/iho-logo.png'
	);

	const ribbonImgBase64 = await getBase64FromUrl(
		'https://storage.googleapis.com/coi_templates/IHO/Coi_footer_image.png' // Replace with your actual ribbon image URL
	);

	// Add header image
	// doc.addImage(
	// 	`data:image/png;base64,${headerImgBase64}`,
	// 	'PNG',
	// 	15,
	// 	10,
	// 	40,
	// 	20
	// );

	doc.setFontSize(10);
	doc.setTextColor('#5e803f');
	doc.setFont('Helvetica', 'bold');
	doc.text('Insurance House P.J.S.C.', 15, 15);

	doc.setFontSize(8);
	doc.setTextColor('#000000');
	doc.setFont('Helvetica', 'normal');
	doc.text('Incorporated In Abu Dhabi', 15, 22);
	doc.text('subject to the provisions of', 15, 26);
	doc.text('Fedreral Law No.(6)', 15, 30);
	doc.text('Commericial License No. 1200435', 15, 34);
	doc.text('Paid up Capital: AED 118,780,500', 15, 38);
	doc.text('Tax Registration No. 1002676868', 15, 42);

	// Add Arabic header text
	doc.setFont('Amiri', 'bold');
	doc.setFontSize(10);
	doc.setTextColor('#5e803f');
	doc.text('بيت التأمين ش.م.ع.', pageWidth - 15, 15, { align: 'right' });

	doc.setFont('Amiri', 'normal');
	doc.setFontSize(8);
	doc.setTextColor('#000000');

	// Arabic texts with proper right alignment
	const arabicTexts = [
		'مسجلة في أبوظبي رهناً بأحكام القانون الاتحادي رقم (6)',
		'رخصة تجارية رقم 1200435',
		'رأس المال المدفوع: 118,780,500 درهم إماراتي',
		'رقم التسجيل الضريبي: 100287232100003',
		'الأعمال تحت إشراف الهيئة العليا للتأمين',
	];

	let yPosition = 22; // Starting Y position for Arabic text
	arabicTexts.forEach((text) => {
		doc.text(text, pageWidth - 15, yPosition, { align: 'right' });
		yPosition += 5; // Increment position for next line
	});

	// Add header image
	doc.addImage(
		`data:image/png;base64,${headerImgBase64}`,
		'PNG',
		80,
		10,
		40,
		30
	);

	doc
		.setFontSize(HEADING_FONT_SIZE)
		.setTextColor(0, 0, 0)
		.setFont(undefined, 'bold')
		.text('RECEIPT', pageWidth / 2, 60, {
			align: 'center',
		});

	doc
		.setTextColor(255, 0, 0) // 🔴 red
		.setFont(undefined, 'bold') // bold
		.text(testPolicyNumber, pageWidth / 2, 65, {
			align: 'center',
		});

	//Policy Details
	const policyDetails = [
		['Branch', 'Insurance House PJSC - Abu Dhabi.'],
		['Receipt Number', data.policyNumber],
		['Issue Date', data.issueDate],
		['Client ID', 'N/A'],
		[
			'Client Name',
			`${data.policyHolder.firstName} ${data.policyHolder.lastName}`,
		],
		['Address', 'Abu Dhabi, UAE'],
		[
			'Received From',
			`${data.policyHolder.firstName} ${data.policyHolder.lastName}`,
		],
		['Amount', `${data.totalPremium} AED`],
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
	});

	//Amount Details
	const amountDetails = [
		['Total', `${data.totalPremium} AED`],
		[
			'Total in words',
			toWords.convert(data.totalPremium, {
				currency: true,
				currencyOptions: {
					name: 'Dirham',
					plural: 'Dirhams',
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

	// const textContentWidth = pageWidth - 10;

	// const textX = 20;
	// const firstLineY = pageHeight - 15; // Pehla line thoda upar
	// const secondLineY = pageHeight - 8; // Doosra line thoda neeche
	// const ribbonHeight = 4; // Adjust height as needed

	// doc.setFillColor(94, 128, 63);
	// doc.rect(0, pageHeight - 23, pageWidth, 2, 'F');

	const ribbonHeight = 15; // Adjust height as needed
	doc.addImage(
		`data:image/png;base64,${ribbonImgBase64}`,
		'PNG',
		0, // Start from the very left
		pageHeight - 15, // Place ribbon above QR code and footer text
		pageWidth, // Full width
		ribbonHeight // Set height
	);

	// First line (normal)
	// doc.setFontSize(7);
	// doc.setTextColor('#4D4E53');
	// doc.setFont(undefined, 'normal');
	// doc.text(
	// 	'Travel Insurance plans are issued and insured by Insurance House PJSC, licensed by the UAE Insurance Authority, Registration number 89. Registered office at Orjowan',
	// 	textX,
	// 	firstLineY,
	// 	{ maxWidth: textContentWidth, align: 'left' }
	// );

	// doc.text(
	// 	'Building, Zayed 1st Street, Khalidiya Area, P.O.Box: 129921, Abu Dhabi, U.A.E.',
	// 	100,
	// 	pageHeight - 12,
	// 	{ maxWidth: textContentWidth, align: 'center' }
	// );
	// // Second line (bold)
	// doc.setFont(undefined, 'bold');
	// doc.text(
	// 	'This Document is not valid without the QR Code with “Green” Status, please scan the QR code on top right corner to know the status of your policy. Do not',
	// 	textX,
	// 	secondLineY,
	// 	{ maxWidth: textContentWidth, align: 'left' }
	// );

	// doc.text('accept this document without the QR code.', 100, secondLineY + 4, {
	// 	maxWidth: textContentWidth,
	// 	align: 'center',
	// });

	return doc.output('arraybuffer');
	// }
	// return null;
};

module.exports = generateReceipt;
