const { jsPDF } = require('jspdf');
const convertToCurrencyText = require('../convertNumToWords');

require('jspdf-autotable');

const TEXT_FONT_SIZE = 8;
const HEADING_FONT_SIZE = 12;

const { blodArabicBase64Font, normalArabicBase64Font } = require('../Fonts');

// Function to convert an image URL to base64
async function getBase64FromUrl(url) {
	const response = await fetch(url);
	const arrayBuffer = await response.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	return buffer.toString('base64');
}

const generateIhoInvoice = async ({ insurerCode, data }) => {
	if (insurerCode === 'IHO' || insurerCode === 'ORT') {
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
			.text('TAX INVOICE', pageWidth / 2, 60, {
				align: 'center',
			});
		//Policy Details
		const policyDetails = [
			['Invoice Number', `:  ${data.policyNumber.split('-').pop()}`],
			['Invoice Date', `:  ${data.issueDate}`],
			['Policy No', `:  ${data.policyNumber}`],
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
			margin: { left: 110 },
		});
		//Insurer Details
		const insurerDetails = [
			['TRN', `:  100287232100003`],
			['Tel No', `:  ${data.policyHolder.mobileNumber}`],
			['Email', `:  ${data.policyHolder.email}`],
			['To', `:  ${data.policyHolder.firstName} ${data.policyHolder.lastName}`],
			['TRN', `:`],
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
					content: 'AED',
					styles: { fontStyle: 'normal', fontSize: HEADING_FONT_SIZE },
				},
			],

			// Second row (spanning across two lines)
			[
				{
					content: `BEING PREMIUM CHARGED AGAINST POLICY ${data.policyNumber}\nVALUE ADDED TAX 5%`,
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
			// didParseCell: function (data) {
			// 	// Apply bold to the first column
			// 	if (data.column.index === 0 && data.row.index === 0) {
			// 		data.cell.styles.fontStyle = 'bold';
			// 		data.cell.styles.fontSize = HEADING_FONT_SIZE;
			// 	}
			// },
			margin: { left: 10 },
		});

		// Amount in words
		// const amountInWords = convertToCurrencyText(data.totalPremium);
		// doc.setFontSize(TEXT_FONT_SIZE);
		// doc.setFont(undefined, 'normal');
		// doc.text(`(${amountInWords})`, 10, doc.lastAutoTable.finalY + 5);
		doc.text(`E.O.E`, 10, doc.lastAutoTable.finalY + 10);
		doc.text(
			`This is a Computer Generated Document and Hence No Signature is Required`,
			70,
			doc.lastAutoTable.finalY + 15
		);

		// const textContentWidth = pageWidth - 10;

		// const textX = 20;
		// const firstLineY = pageHeight - 15; // Pehla line thoda upar
		// const secondLineY = pageHeight - 8; // Doosra line thoda neeche
		// // const ribbonHeight = 4; // Adjust height as needed

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

		// doc.text(
		// 	'accept this document without the QR code.',
		// 	100,
		// 	secondLineY + 4,
		// 	{
		// 		maxWidth: textContentWidth,
		// 		align: 'center',
		// 	}
		// );

		return doc.output('arraybuffer');
	}
	return null;
};

module.exports = generateIhoInvoice;
