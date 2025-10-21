const { jsPDF } = require('jspdf');
const { addPassangerNoInPolicyNumber } = require('../generatePolicyNumber');

require('jspdf-autotable');

const HEADER_MARGIN = 50;
const TEXT_FONT_SIZE = 8;
const SUBHEADING_FONT_SIZE = 10;
const HEADING_FONT_SIZE = 12;
const FOOTER_MARGIN = 35;

const { normalArabicBase64Font, blodArabicBase64Font } = require('../Fonts');
const { header } = require('express-validator');
const { testPolicyNumber } = require('../../utils');

// Function to convert an image URL to base64
async function getBase64FromUrl(url) {
	const response = await fetch(url);
	const arrayBuffer = await response.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	return buffer.toString('base64');
}
const generateCoi = async ({ insurerCode, data }) => {
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
	let passengerCounter = 0;
	const headerImgBase64 = await getBase64FromUrl(
		'https://storage.googleapis.com/coi_templates/UAE_portal/OT_pdfheader.PNG'
	);
	const signatureImgBase64 = await getBase64FromUrl(
		'https://storage.googleapis.com/coi_templates/IHO/iho-signature.png'
	);
	const stampImgBase64 = await getBase64FromUrl(
		'https://storage.googleapis.com/coi_templates/IHO/iho-stamp.png'
	);
	const AHM = await getBase64FromUrl(
		'https://storage.googleapis.com/coi_templates/IHO/AMH-2.png'
	);
	const ribbonImgBase64 = await getBase64FromUrl(
		'https://storage.googleapis.com/coi_templates/IHO/Coi_footer_image.png' // Replace with your actual ribbon image URL
	);
	const stampAndSignature = await getBase64FromUrl(
		'https://storage.googleapis.com/coi_templates/UAE_portal/OT_Stamp_Sign.png'
	);

	for (let passenger of data.passengers) {
		passengerCounter++;
		doc
			.setFontSize(HEADING_FONT_SIZE)
			.setTextColor(0, 0, 0)
			.setFont(undefined, 'bold')
			.text('TRAVEL INSURANCE CERTIFICATE', pageWidth / 2, 55, {
				align: 'center',
			});

		// Policy Details Table
		doc.autoTable({
			startY: 60,
			body: [['Policy Details']],
			theme: 'plain',
			styles: {
				halign: 'left',
				fillColor: [55, 96, 146],
				fontSize: SUBHEADING_FONT_SIZE,
				cellPadding: 1,
				fontStyle: 'bold',
				textColor: [255, 255, 255],
			},
		});
		doc.autoTable({
			startY: doc.lastAutoTable.finalY + 1,
			body: [
				[
					`Name: ${passenger.firstName} ${passenger.lastName}`,
					{
						content: testPolicyNumber,
						styles: { textColor: 'red', fontStyle: 'bold' },
					},
				],
			],
			theme: 'plain',
			styles: {
				halign: 'left',
				fontSize: TEXT_FONT_SIZE,
				cellPadding: 1,
				fontStyle: 'bold',
			},
		});
		let addOnStr = '';
		data?.addOns?.map((addOn) => (addOnStr += addOn?.code + ', '));
		const policyDetails = [
			[`Product: ${data.policyType}`, `Business Code: ${data.agencyCode}`],
			[
				`Area of Cover: ${
					data?.productCode === 'AHLPLT' ? 'INBOUND' : data.coverage
				}`,
				`Policy Number: ${addPassangerNoInPolicyNumber({
					policy: data.policyNumber,
					passangerNo: passengerCounter,
				})}     ${
					data?.status?.toLowerCase() === 'cancelled'
						? data?.status?.toUpperCase()
						: ''
				}`,
			],
			[
				`Duration (in days): ${data.duration}`,
				`Issuing Date: ${data.issueDate}`,
			],
			[
				`Number of members: ${data.passengers.length}`,
				`Policy Type: ${
					data.duration > 90 ? 'Multiple Trips' : 'Single Journey'
				} ${addOnStr}`,
			],
			[
				`ID Type: Passport`,
				`Period of cover: ${data.policyStartDate} ${
					data.returnTrip ? `to ${data.policyEndDate}` : ''
				} `,
			],
			[
				`ID Number: ${passenger.passportNumber}`,
				`Nationality: ${passenger.nationality}`,
			],
			[`Email: ${passenger.email}`, `Issued By: ${data.issuedBy}`],
			[`Date of Birth: ${passenger.dob}`, `Gender: ${passenger.gender}`],
		];
		doc.autoTable({
			startY: doc.lastAutoTable.finalY + 1,
			body: policyDetails.map((row) => row.map((cell) => cell || '')),
			styles: {
				fontSize: TEXT_FONT_SIZE,
				cellPadding: 1,
				fontStyle: 'bold',
				textColor: [0, 0, 0],
			},
			didParseCell: function (data) {
				if (data.cell.raw.includes('CANCELLED')) {
					data.cell.styles.textColor = [255, 0, 0]; // Red color
					data.cell.styles.fontStyle = 'bold'; // Bold font
				}
			},
		});

		// Insured Name Table
		// doc.autoTable({
		// 	startY: doc.lastAutoTable.finalY + 7,
		// 	body: [['Insured Member']],
		// 	theme: 'plain',
		// 	styles: {
		// 		halign: 'left',
		// 		fillColor: [55, 96, 146],
		// 		fontSize: SUBHEADING_FONT_SIZE,
		// 		cellPadding: 1,
		// 		fontStyle: 'bold',
		// 		textColor: [255, 255, 255],
		// 	},
		// });
		// const insuredName = [
		// 	[
		// 		passenger.gender,
		// 		passenger.firstName,
		// 		passenger.lastName,
		// 		passenger.dob,
		// 		passenger.passportNumber,
		// 	],
		// ];
		// doc.autoTable({
		// 	startY: doc.lastAutoTable.finalY + 5,
		// 	head: [
		// 		['Gender', 'First Name', 'Last Name', 'Date of Birth', 'Passport #'],
		// 	],
		// 	body: insuredName.map((row) => row.map((cell) => cell || '')),
		// 	theme: 'grid',
		// 	headStyles: {
		// 		fillColor: null,
		// 		lineWidth: 0.3,
		// 		lineColor: [0, 0, 0],
		// 		textColor: '#000000',
		// 	},
		// 	bodyStyles: {
		// 		lineWidth: 0.3,
		// 		lineColor: [0, 0, 0],
		// 	},
		// 	styles: {
		// 		fontSize: TEXT_FONT_SIZE,
		// 		cellPadding: 1,
		// 		fontStyle: 'bold',
		// 		textColor: '#000000',
		// 	},
		// });

		//Benefits Table
		doc.autoTable({
			startY: doc.lastAutoTable.finalY + 6,
			body: [['Policy Benefit and Limits']],
			theme: 'plain',
			styles: {
				halign: 'left',
				fillColor: [55, 96, 146],
				fontSize: SUBHEADING_FONT_SIZE,
				cellPadding: 1,
				fontStyle: 'bold',
				textColor: [255, 255, 255],
			},
		});
		const paidBenefits = data.benefits
			// .filter((b) => b.value !== 'Free')
			.map((b) => [b.item, b.value]);

		doc.autoTable({
			startY: doc.lastAutoTable.finalY + 4,
			head: [['BENEFITS', 'LIMITS']],
			body: [...paidBenefits],
			theme: 'grid',
			columnStyles: {
				1: { halign: 'center', valign: 'middle' },
			},
			headStyles: {
				fillColor: null,
				lineWidth: 0.3,
				lineColor: [0, 0, 0],
				halign: 'center',
				textColor: '#000000',
			},
			bodyStyles: {
				lineWidth: 0.3,
				lineColor: [0, 0, 0],
			},
			styles: {
				fontSize: TEXT_FONT_SIZE,
				cellPadding: 1,
				fontStyle: 'bold',
				textColor: '#000000',
			},
			margin: { top: HEADER_MARGIN, bottom: FOOTER_MARGIN }, // Set bottom margin to avoid footer overlap
			didDrawPage: (data) => {},
		});

		doc.setFontSize(6);
		doc.text(
			'Above sums insured are per person & per period of cover',
			15,
			doc.lastAutoTable.finalY + 5
		);
		// Important Notes Table
		if (data.productCode === 'AHLPLT' || data.productCode === 'AHLDMD') {
			doc.autoTable({
				startY: doc.lastAutoTable.finalY + 10,
				body: [['Important Notes']],
				theme: 'plain',
				styles: {
					halign: 'left',
					fillColor: [55, 96, 146],
					fontSize: SUBHEADING_FONT_SIZE,
					cellPadding: 1,
					fontStyle: 'bold',
					textColor: [255, 255, 255],
				},
				margin: { top: HEADER_MARGIN, bottom: FOOTER_MARGIN },
			});
			const notes = [
				[
					'\u2022 Excess shall vary based on age of the insured. Please refer to the policy wordings for details.',
				],
				[
					'\u2022 If your date of entry to UAE, changes from the dates shown on the certificate of insurance, your coverage dates will be automatically amended to start from the date you entered the UAE (as stamped on your passport or immigration data in case of e-gates entries) or after 60 days from visa start whichever is earlier and run for the same duration as original policy period along with grace period of 10 days on Ahlain platinum plan.',
				],
				[
					'\u2022 Inbound plans having 180 days duration, covers multiple entries to the UAE within the policy period',
				],
			];
			doc.autoTable({
				startY: doc.lastAutoTable.finalY + 2,
				body: notes,
				theme: 'plain',
				styles: {
					fontSize: TEXT_FONT_SIZE,
					cellPadding: 1,
					textColor: '#000000',
				},
				margin: { top: HEADER_MARGIN, bottom: FOOTER_MARGIN },
			});
		}

		// Claim Assistance Table
		let gap =
			data.productCode === 'SMTNMD' ||
			data.productCode === 'OTBGLD' ||
			data.productCode === 'ELTFAM' ||
			data.productCode === 'LITNMD'
				? 15
				: data.productCode === 'OTBBRZ'
				? 3
				: 8;
		// let gap = 5;
		doc.autoTable({
			startY: doc.lastAutoTable.finalY + gap,
			body: [['General Conditions']],
			theme: 'plain',
			styles: {
				halign: 'left',
				fillColor: [55, 96, 146],
				fontSize: SUBHEADING_FONT_SIZE,
				cellPadding:
					data.productCode === 'OTBBRZ' || data.productCode === 'INBPLT'
						? 1
						: 3,
				fontStyle: 'bold',
				textColor: [255, 255, 255],
			},
			margin: { top: HEADER_MARGIN, bottom: FOOTER_MARGIN },
		});
		const conditions = [
			[
				'\u2022 This Travel Insurance Certificate contains a summary of cover only.',
			],
			[
				'\u2022 For full terms, conditions and exclusions, please refer to the policy wording.',
			],
			[
				'\u2022 Outbound cover is applicable from country of departure; Inbound cover is applicable to travelers visiting United Arab Emirates for a limited duration as specified by the policy.',
			],
			[
				'\u2022 Any changes to your policy document shall be requested before policy start date',
			],
			[
				'\u2022 All material facts to be disclosed and failure to do so will invalidate this policy and related covers',
			],
			[
				'\u2022 The scope of cover under the subject policy excludes losses or claims due to incidents occurred within the geographical area of any country declared by the United Nations as a war zone',
			],
			[
				'\u2022 In case of illness due to infectious disease such as Covid-19 in any country apart from the country trip originated from, we shall pay for the emergency medical expenses as per the terms and conditions mentioned in the policy wording',
			],
			[
				'\u2022 For Medical Emergencies, please call on below numbers or write to claims@cope-ts.com',
			],
		];
		doc.autoTable({
			startY: doc.lastAutoTable.finalY + 2,
			body: conditions,
			theme: 'plain',
			styles: {
				fontSize: TEXT_FONT_SIZE,
				cellPadding: 1,
				textColor: '#000000',
			},
			margin: { top: HEADER_MARGIN, bottom: FOOTER_MARGIN },
		});
		const claimAssisstance = [
			['EUROPE & TURKEY', '00 90 212 800 6548'],
			['WORLDWIDE', '00 1 786 206 9925'],
			['SOUTH AMERICA', '00 54 11 3989 3293'],
			['MENA', '00 971 7 204 5091'],
			['MENA (WHATSAPP)', '00 971 7 204 5090'],
			['LEBANON', '00 961 1 504 000'],
			['LEBANON (WHATSAPP)', '00 961 81 504 015'],
		];

		doc.autoTable({
			startY: doc.lastAutoTable.finalY + 2,
			tableWidth: 100,
			head: [['Zone', 'Phone Number']],
			body: claimAssisstance,
			theme: 'grid',
			styles: {
				fontSize: TEXT_FONT_SIZE,
				cellPadding: 1,
				textColor: '#000000',
				fontStyle: 'bold',
			},
			headStyles: {
				fillColor: [55, 96, 146],
				textColor: [255, 255, 255],
				fontStyle: 'bold',
				halign: 'center', // ✅ header center
			},
			columnStyles: {
				0: { halign: 'start' }, // Zone column align center
				1: { halign: 'center' }, // Phone Number column align center
			},
			margin: { top: HEADER_MARGIN, bottom: FOOTER_MARGIN, left: 55 },
		});

		// Removing spaces from SCH product
		let exclusions = [
			[
				'\u2022 Sanctions and Limitations Exclusions\nWe shall not be deemed to provide cover and we shall not be liable to pay any claim or provide any benefit hereunder to the extent that the provision of such cover, payment of such claim or provision of such benefit would expose us to any sanctions, prohibitions restrictions under United Nations resolutions or the trade or the economic sanctions, laws or regulations of the European Union, United Kingdon or United States of America.',
			],
			[
				'\u2022 Applicable Taxes You accept and agree to pay any taxes on this policy, in compliance with the laws and regulations applicable in the territory of sale, including but not limited to value added tax (“VAT”) which are due on your policy. Failure by you to pay any applicable taxes may result in your policy being rendered null and void or cancelled at Insurance House’s discretion.',
			],
			[
				'\u2022 Notes\nCoverage starts when the insured leaves the country of his residence and ceases in case, the insured returns to his country of residence, or number of days elapsed.\nExcess is chargeable depending on the age of the insured. Please refer to the excess table in policy wording documents.',
			],
		];
		// let space =
		// 	data.productCode === 'SMTNMD' ||
		// 	data.productCode === 'OTBGLD' ||
		// 	data.productCode === 'ELTFAM'
		// 		? 15
		// 		: data.productCode === 'OTBBRZ' || data.productCode === 'INBPLT'
		// 		? 2
		// 		: 6;

		doc.autoTable({
			startY: doc.lastAutoTable.finalY + 2,
			body: exclusions,
			theme: 'plain',
			styles: {
				fontSize: TEXT_FONT_SIZE,
				cellPadding: data.productCode === 'OTBBRZ' ? 1 : 3,
				textColor: '#000000',
			},
			margin: { top: HEADER_MARGIN, bottom: FOOTER_MARGIN },
		});

		//Add siugnature text
		doc.setFontSize(TEXT_FONT_SIZE);
		doc.text(
			'Authorized Signatory and Stamp',
			pageWidth - 73,
			doc.lastAutoTable.finalY + 1
		);
		//Add siugnature
		// doc.addImage(
		// 	`data:image/png;base64,${stampAndSignature}`,
		// 	'PNG',
		// 	pageWidth - 40,
		// 	doc.lastAutoTable.finalY + 15,
		// 	25,
		// 	25
		// );
		//Add stamp
		doc.addImage(
			`data:image/png;base64,${stampAndSignature}`,
			'PNG',
			pageWidth - 80,
			doc.lastAutoTable.finalY + 2,
			70, // Increased width
			50 // Adjust height to match the width, or you can set it as per your requirement
		);
		if (passengerCounter != data.passengers.length) doc.addPage();
	}

	//add QR code and header to all pages except first one
	const pageCount = doc.internal.getNumberOfPages();
	let currentPage = 1;
	while (currentPage <= pageCount) {
		doc.setPage(currentPage);

		doc.setFontSize(10);
		doc.setTextColor('#5e803f');
		doc.setFont('Helvetica', 'bold');
		doc.text('Orient Takaful P.J.S.C.', 15, 15);

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
			0,
			5,
			213,
			45
		);

		// doc.setFillColor(128, 128, 128); // Gray
		// doc.rect(0, 45, pageWidth*0.9, 0.5, 'F'); // Draw the line at Y = 50

		// const lineWidth = pageWidth * 0.7; // 90% of page width
		// const lineX = (pageWidth - lineWidth) / 2; // Center the line

		// doc.setFillColor(128, 128, 128); // Gray color
		// doc.rect(lineX, 45, lineWidth, 0.2, 'F'); // Draw the centered line

		// if (data.agencyCode === 'AMHT') {
		// 	doc.addImage(AHM, 'PNG', pageWidth - 45, 10, 25, 10);
		// 	doc.setFontSize(10).setTextColor(0, 0, 0);
		// }

		// if (data.policyQr) {
		// 	doc.addImage(data.policyQr, 'PNG', pageWidth - 45, 20, 25, 25);
		// 	doc
		// 		.setFontSize(10)
		// 		.setTextColor(0, 0, 0)
		// 		.text('Scan to validate', pageWidth - 33, 47, { align: 'center' });
		// }

		//add page numbering
		doc.setPage(currentPage);
		doc.setFontSize(7);
		doc.setTextColor('#4D4E53');
		doc.text(`Page ${currentPage} of ${pageCount}`, 7, 7);
		currentPage++;
	}
	//add footer to all pages
	if (pageCount > 0) {
		let currentPage = 1;
		while (currentPage <= pageCount) {
			doc.setPage(currentPage);

			const qrWidth = 25;
			const qrHeight = 25;
			const paddingRight = 6;
			const paddingBottom = 5;

			const qrX = pageWidth - qrWidth - paddingRight;
			const qrY = pageHeight - qrHeight - paddingBottom;

			const textContentWidth = pageWidth - qrWidth - 20;

			const textX = 10;
			const firstLineY = pageHeight - 15; // Pehla line thoda upar
			const secondLineY = pageHeight - 8; // Doosra line thoda neeche
			// const ribbonHeight = 4; // Adjust height as needed

			// doc.setFillColor(94, 128, 63);
			// doc.rect(0, pageHeight - 23, pageWidth, 2, 'F');

			// const ribbonHeight = 10; // Adjust height as needed
			// doc.addImage(
			// 	`data:image/png;base64,${ribbonImgBase64}`,
			// 	'PNG',
			// 	0, // Start from the very left
			// 	pageHeight - 32, // Place ribbon above QR code and footer text
			// 	pageWidth, // Full width
			// 	ribbonHeight // Set height
			// );

			// First line (normal)
			doc.setFontSize(7);
			doc.setTextColor('#4D4E53');
			doc.setFont(undefined, 'normal');
			doc.text(
				'Travel Insurance plans are issued and insured by Orient Takaful PJSC, licensed by the UAE Insurance Authority, Registration number 1266734, Registered office at Al',
				textX,
				firstLineY,
				{ maxWidth: textContentWidth, align: 'left' }
			);

			doc.text(
				'Futtaim Building, 119 Omar Ibn Al Khattab Road,. Dubai, Dubai 183368, UAE',
				100,
				pageHeight - 12,
				{ maxWidth: textContentWidth, align: 'center' }
			);
			// Second line (bold)
			doc.setFont(undefined, 'bold');
			doc.text(
				'This Document is not valid without the QR Code with “Green” Status, please scan the QR code to know the status of your policy. Do not accept this document',
				textX,
				secondLineY,
				{ maxWidth: textContentWidth, align: 'left' }
			);

			doc.text('without the QR code.', 100, secondLineY + 4, {
				maxWidth: textContentWidth,
				align: 'center',
			});

			// QR Code
			if (data.policyQr) {
				doc.addImage(data.policyQr, 'PNG', qrX, qrY, qrWidth, qrHeight);

				// "Scan to validate" text below QR
				doc
					.setFontSize(8)
					.setTextColor(0, 0, 0)
					.text('Scan to validate', qrX + qrWidth / 2, qrY + qrHeight + 3, {
						align: 'center',
					});
			}

			//add end of doc
			if (currentPage == pageCount) {
				doc.setFontSize(10);
				doc.text(
					'**END OF DOCUMENT**',
					pageWidth / 2,
					doc.lastAutoTable.finalY + 55,
					{ align: 'center' }
				);
			}

			currentPage++;
		}
	}
	return doc.output('arraybuffer');
	// }
	// return null;
};

module.exports = generateCoi;
