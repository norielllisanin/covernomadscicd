const { jsPDF } = require('jspdf');
const { addPassangerNoInPolicyNumber } = require('./generateCmsPolicyNumber');

require('jspdf-autotable');

const HEADER_MARGIN = 50;
const TEXT_FONT_SIZE = 8;
const SUBHEADING_FONT_SIZE = 10;
const HEADING_FONT_SIZE = 12;
const FOOTER_MARGIN = 50;

const { normalArabicBase64Font, blodArabicBase64Font } = require('../Fonts');

// Function to convert an image URL to base64
async function getBase64FromUrl(url) {
	const response = await fetch(url);
	const arrayBuffer = await response.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	return buffer.toString('base64');
}
const generateCmsCoi = async ({ insurerCode, data }) => {
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
	let passengerCounter = 0;
	const headerImgBase64 = await getBase64FromUrl(
		'https://storage.googleapis.com/coi_templates/cms_portal/CMS%20Brand%20Logo.png'
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
		'https://storage.googleapis.com/coi_templates/IHO/new-stemp.jpeg'
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

		doc.autoTable({
			startY: 60,
			body: [['Policy Details', '', '']], // Red | Spacer | Blue
			theme: 'plain',
			styles: {
				fontSize: SUBHEADING_FONT_SIZE,
				cellPadding: 1,
				minCellHeight: 4,
				fontStyle: 'bold',
				textColor: [255, 255, 255],
				valign: 'middle',
			},
			columnStyles: {
				0: {
					fillColor: [200, 70, 60], // Red
					cellWidth: 90,
				},
				1: {
					fillColor: [255, 255, 255],
					cellWidth: 0.5,
					fontStyle: 'normal',
					fontSize: 1,
					cellPadding: 0,
				},
				2: {
					fillColor: [90, 140, 200], // Blue
					cellWidth: 90,
				},
			},
			tableLineWidth: 0,
		});

		doc.autoTable({
			startY: doc.lastAutoTable.finalY + 1,
			body: [[`Name: ${passenger.firstName} ${passenger.lastName}`]],
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
					data?.status?.toLowerCase() === 'cancelled' ? `( Cancelled )` : ''
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
				if (data.cell.raw.includes('( Cancelled )')) {
					data.cell.styles.textColor = [255, 0, 0]; // Red color
					data.cell.styles.fontStyle = 'bold'; // Bold font
				}
			},
		});

		doc.autoTable({
			startY: doc.lastAutoTable.finalY + 6,
			body: [['Policy Benefit and Limits', '', '']], // Two side-by-side cells
			theme: 'plain',
			styles: {
				fontSize: SUBHEADING_FONT_SIZE,
				cellPadding: 1,
				minCellHeight: 4,
				fontStyle: 'bold',
				textColor: [255, 255, 255],
				valign: 'middle',
			},
			columnStyles: {
				0: {
					fillColor: [200, 70, 60], // Red cell
					cellWidth: 90,
				},
				1: {
					fillColor: [255, 255, 255],
					cellWidth: 0.5,
					fontStyle: 'normal',
					fontSize: 1,
					cellPadding: 0,
				},
				2: {
					fillColor: [90, 140, 200], // Blue cell
					cellWidth: 90,
				},
			},
			tableLineWidth: 0,
			didDrawCell: function (data) {
				if (data.column.index === 1) {
					data.cell.x += 5;
				}
			},
		});

		const paidBenefits = data.benefits.map((b) => [b.item, b.value]);

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
				cellPadding: 1.5,
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
		// // Important Notes Table
		// if (data.productCode === 'AHLPLT' || data.productCode === 'AHLDMD') {
		// 	doc.autoTable({
		// 		startY: doc.lastAutoTable.finalY + 10,
		// 		body: [['Important Notes']],
		// 		theme: 'plain',
		// 		styles: {
		// 			halign: 'left',
		// 			fillColor: [94, 128, 63],
		// 			fontSize: SUBHEADING_FONT_SIZE,
		// 			cellPadding: 1,
		// 			fontStyle: 'bold',
		// 			textColor: [255, 255, 255],
		// 		},
		// 		margin: { top: HEADER_MARGIN, bottom: FOOTER_MARGIN },
		// 	});
		// 	const notes = [
		// 		[
		// 			'\u2022 Excess shall vary based on age of the insured. Please refer to the policy wordings for details.',
		// 		],
		// 		[
		// 			'\u2022 If your date of entry to UAE, changes from the dates shown on the certificate of insurance, your coverage dates will be automatically amended to start from the date you entered the UAE (as stamped on your passport or immigration data in case of e-gates entries) or after 60 days from visa start whichever is earlier and run for the same duration as original policy period along with grace period of 10 days on Ahlain platinum plan.',
		// 		],
		// 		[
		// 			'\u2022 Inbound plans having 180 days duration, covers multiple entries to the UAE within the policy period',
		// 		],
		// 	];
		// 	doc.autoTable({
		// 		startY: doc.lastAutoTable.finalY + 2,
		// 		body: notes,
		// 		theme: 'plain',
		// 		styles: {
		// 			fontSize: TEXT_FONT_SIZE,
		// 			cellPadding: 1,
		// 			textColor: '#000000',
		// 		},
		// 		margin: { top: HEADER_MARGIN, bottom: FOOTER_MARGIN },
		// 	});
		// }

		// Claim Assistance Table
		// let gap =
		// 	data.productCode === 'SMTNMD' ||
		// 	data.productCode === 'OTBGLD' ||
		// 	data.productCode === 'ELTFAM'
		// 		& 15

		doc.autoTable({
			startY: doc.lastAutoTable.finalY + 15,
			body: [['General Conditions', '', '']],
			theme: 'plain',
			styles: {
				fontSize: SUBHEADING_FONT_SIZE,
				cellPadding: 1,
				minCellHeight: 10,
				fontStyle: 'bold',
				textColor: [255, 255, 255],
				valign: 'middle',
			},
			columnStyles: {
				0: {
					fillColor: [200, 70, 60],
					cellWidth: 90,
				},
				1: {
					fillColor: [255, 255, 255],
					cellWidth: 0.5,
					fontStyle: 'normal',
					fontSize: 1,
					cellPadding: 0,
				},
				2: {
					fillColor: [90, 140, 200],
					cellWidth: 90,
				},
			},
			tableLineWidth: 0,
		});

		const conditions = [
			[
				'\u2022 This Travel Insurance Certificate contains a summary of cover only.',
			],
			[
				'\u2022 For full terms, conditions and exclusions, please refer to the policy wording.',
			],
			[
				'\u2022 Outbound cover is applicable from country of residence which is India; Inbound cover is applicable to travelers visiting India for a limited duration as specified by the policy',
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
			['Zone', 'Phone Number'],
			['EUROPE & TURKEY', '00 90 212 800 6548'],
			['WORLDWIDE', '00 1 786 206 9925'],
			['SOUTH AMERICA', '00 54 11 3989 3293'],
			['MENA', '00 971 7 204 5091'],
			['MENA (BY WHATSAPP) ', '00 971 7 204 5090'],
			['LEBANON', '00 961 1 504 000'],
			['WHATSAPP', '00 961 81 504 015'],
		];
		doc.autoTable({
			startY: doc.lastAutoTable.finalY + 5,
			tableWidth: 100,
			body: claimAssisstance,
			theme: 'grid',
			styles: {
				fontSize: TEXT_FONT_SIZE,
				cellPadding: 1,
				textColor: '#000000',
				fontStyle: 'bold',
				halign: 'center',
			},
			margin: { top: HEADER_MARGIN, bottom: FOOTER_MARGIN, left: 55 },
		});

		// Removing spaces from SCH product
		let exclusions = [
			'OTBSLV',
			'ELTNMD',
			'SCHPRM',
			'SMTNMD',
			'SPMNMD',
			'INBPLT',
			'PRMNMD',
			'AHLPLT',
			'AHLDMD',
			'OTBGLD',
			'OTBPLT',
			'OTBFAM',
			'OTBBRZ',
			'VIP',
			'ELTFAM',
		].includes(data.productCode)
			? [
					[
						'\u2022 Sanctions and Limitations Exclusions\nWe shall not be deemed to provide cover and we shall not be liable to pay any claim or provide any benefit hereunder to the extent that the provision of such cover, payment of such claim or provision of such benefit would expose us to any sanctions, prohibitions restrictions under United Nations resolutions or the trade or the economic sanctions, laws or regulations of the European Union, United Kingdon or United States of America.',
					],
					[
						'\u2022 Applicable Taxes\n You accept and agree to pay any taxes on this policy, in compliance with the laws and regulations applicable in the territory of sale, including but not limited to Goods and Services Tax (GST) which are due on your policy. Failure by you to pay any applicable taxes may result in your policy being rendered null and void or cancelled at Insurance House’s discretion.',
					],
					[
						'\u2022 Notes\nCoverage starts when the insured leaves the country of his residence and ceases in case, the insured returns to his country of residence, or number of days elapsed.\nExcess is chargeable depending on the age of the insured. Please refer to the excess table in policy wording documents.',
					],
			  ]
			: [
					[''],
					[''],
					[
						'\u2022 Sanctions and Limitations Exclusions\nWe shall not be deemed to provide cover and we shall not be liable to pay any claim or provide any benefit hereunder to the extent that the provision of such cover, payment of such claim or provision of such benefit would expose us to any sanctions, prohibitions orestrictions under United Nations resolutions or the trade or the economic sanctions, laws or regulations of the European Union, United Kingdon or United States of America.',
					],
					[''],
					[''],
					[''],
					[
						'\u2022 Applicable Taxes\nYou accept and agree to pay any taxes on this policy, in compliance with the laws and regulations applicable in the territory of sale, including but not limited to Goods and Services Tax (GST) which are due on your policy. Failure by you to pay any applicable taxes may result in your policy being rendered null and void or cancelled at Insurance House’s discretion.',
					],
					[
						'\u2022 Notes\nCoverage starts when the insured leaves the country of his residence and ceases in case, the insured returns to his country of residence, or number of days elapsed.\nExcess is chargeable depending on the age of the insured. Please refer to the excess table in policy wording documents.',
					],
					[''],
					[''],
					[''],
			  ];
		// let space =
		// 	data.productCode === 'SMTNMD' ||
		// 	data.productCode === 'OTBGLD' ||
		// 	data.productCode === 'ELTFAM'
		// & 15

		doc.autoTable({
			startY: doc.lastAutoTable.finalY + 15,
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
		// doc.setFontSize(TEXT_FONT_SIZE);
		// doc.text(
		// 	'Authorized Signatory and Stamp',
		// 	pageWidth - 73,
		// 	doc.lastAutoTable.finalY + 8
		// );

		// doc.addImage(
		// 	`data:image/png;base64,${stampAndSignature}`,
		// 	'PNG',
		// 	pageWidth - 80,
		// 	doc.lastAutoTable.finalY + 10,
		// 	70, // Increased width
		// 	50 // Adjust height to match the width, or you can set it as per your requirement
		// );
		if (passengerCounter != data.passengers.length) doc.addPage();
	}

	//add QR code and header to all pages except first one
	const pageCount = doc.internal.getNumberOfPages();
	let currentPage = 1;
	while (currentPage <= pageCount) {
		doc.setPage(currentPage);

		// Add header image
		doc.addImage(
			`data:image/png;base64,${headerImgBase64}`,
			'PNG',
			40,
			5,
			120,
			38
		);

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
			const centerText = pageWidth / 2;
			const firstLineY = pageHeight - 15; // Pehla line thoda upar
			const secondLineY = pageHeight - 8; // Doosra line thoda neeche

			const ribbonHeight = 6;
			const totalCellWidth = doc.internal.pageSize.getWidth();
			const spaceBetween = 0.5;
			const eachCellWidth = (totalCellWidth - spaceBetween) / 2;

			doc.autoTable({
				startY: doc.internal.pageSize.getHeight() - 38,
				body: [['', '', '']], // same content
				theme: 'plain',
				styles: {
					fontSize: SUBHEADING_FONT_SIZE,
					minCellHeight: ribbonHeight,
					cellPadding: 1,
					minCellHeight: 5,
					fontStyle: 'bold',
					textColor: [255, 255, 255],
					valign: 'middle',
				},
				columnStyles: {
					0: {
						fillColor: [200, 70, 60],
						cellWidth: eachCellWidth,
					},
					1: {
						fillColor: [255, 255, 255],
						cellWidth: 0.5,
						fontStyle: 'normal',
						fontSize: 1,
						cellPadding: 0,
					},
					2: {
						fillColor: [90, 140, 200],
						cellWidth: eachCellWidth,
					},
				},
				margin: { left: 0 },
				tableLineWidth: 0,
				didDrawCell: function (data) {
					if (data.column.index === 1) {
						data.cell.x += spaceBetween;
					}
				},
			});

			// First line (normal)
			doc.setFontSize(7);
			doc.setTextColor('#4D4E53');
			doc.setFont(undefined, 'normal');
			doc.text(
				'Travel Insurance plans are issued and insured by CHOLAMANDALAM MS GENERAL INSURANCE COMPANY LIMITED.',
				// textX,
				// firstLineY,
				100,
				pageHeight - 20,
				{ maxWidth: textContentWidth, align: 'center' }
			);

			doc.text(
				'Registered Office: 2nd Floor, “DARE House”, 2, N.S.C. Bose Road, Chennai – 600 001.',
				100,
				pageHeight - 16,
				{ maxWidth: textContentWidth, align: 'center' }
			);
			doc.text(
				'IRDA Regn. No.123; PAN AABCC6633K CIN U66030TN2001PLC047977.',
				100,
				pageHeight - 12,
				{ maxWidth: textContentWidth, align: 'center' }
			);
			// Second line (bold)
			doc.setFont(undefined, 'bold');
			doc.setTextColor(255, 0, 0);
			doc.text(
				'This Document is not valid without the QR Code with “Green” Status, please scan the QR code to know the status of your',
				centerText,
				secondLineY,
				{ maxWidth: textContentWidth, align: 'center' }
			);

			doc.text(
				'policy Do not accept this document without the QR code.',
				100,
				secondLineY + 4,
				{
					maxWidth: textContentWidth,
					align: 'center',
				}
			);

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

module.exports = generateCmsCoi;
