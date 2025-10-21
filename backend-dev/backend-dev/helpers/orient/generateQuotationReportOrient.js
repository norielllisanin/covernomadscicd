const { jsPDF } = require('jspdf');
const { roundToTwoDecimals, ORT_HowtoClaim } = require('../../utils');
require('jspdf-autotable');
const { normalArabicBase64Font, blodArabicBase64Font } = require('../Fonts');

// Function to convert an image URL to base64
async function getBase64FromUrl(url) {
	const response = await fetch(url);
	const arrayBuffer = await response.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	return buffer.toString('base64');
}
const generateQuotationReport = async ({ data }) => {
	const doc = new jsPDF('p', 'mm', 'a4');

	// Add Arabic font support
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
	const pageHeight = doc.internal.pageSize.getHeight() - 10;

	let passengerCounter = 0;
	const headerImgBase64 = await getBase64FromUrl(
		'https://storage.googleapis.com/coi_templates/UAE_portal/OT_pdfheader.PNG'
	);
	const CVN = await getBase64FromUrl(
		'https://storage.googleapis.com/coi_templates/IHO/CVN%20portrait%20logo.png'
	);
	const ISA = await getBase64FromUrl(
		'https://storage.googleapis.com/coi_templates/IHO/ISA%20ASSIST%20Logo.png'
	);
	const AHM = await getBase64FromUrl(
		'https://storage.googleapis.com/coi_templates/IHO/AMH-2.png'
	);
	const ribbonImgBase64 = await getBase64FromUrl(
		'https://storage.googleapis.com/coi_templates/IHO/Coi_footer_image.png'
	);
	const stampAndSignature = await getBase64FromUrl(
		'https://storage.googleapis.com/coi_templates/UAE_portal/OT_Stamp_Sign.png'
	);
	passengerCounter++;
	doc
		.setFontSize(16)
		.setTextColor(25, 66, 106) // Set color to blue (RGB)
		.setFont(undefined, 'italic');
	// Define the text and calculate its width for proper alignment
	const text = 'Travel Insurance Quotation';
	const txtWidth = doc.getTextWidth(text);
	const textX = pageWidth / 2;
	const textY = 55;
	// Draw the text with center alignment
	doc.text(text, textX, textY, { align: 'center' });
	// Draw the underline
	const underlineY = textY + 1; // Adjust the Y position slightly below the text
	doc.setDrawColor(25, 66, 106); // Set the color for the underline (red)
	doc.line(textX - txtWidth / 2, underlineY, textX + txtWidth / 2, underlineY); // Draw the line
	// Measure the width of the first text
	const textWidth = doc.getTextWidth('Travel Insurance Quotation');
	// Second text: (AMH/AE/ALTFAM/00000001);

	const offset =
		data.productCode === 'UAE_INBOUND_20k' ||
		data.productCode === 'UAE_INBOUND_200k'
			? -6
			: 0;

	const space = pageWidth / 2 + textWidth / 2 + offset;
	doc
		.setFontSize(9)
		.setTextColor(0, 0, 0) // Set color to black (RGB)
		.setFont(undefined, 'italic')
		.text(`${data.code}`, space, 60, {
			align: 'left',
		});
	// Adding the header text "Dear Traveler/s"
	doc
		.setFontSize(11)
		.setTextColor(0, 0, 0) // Black text color
		.setFont(undefined, 'italic') // Italic font style for "Dear Traveler/s"
		.text('Dear Traveler/s,', 10, 63); // Align to the left at position (20, 60)
	// Adding the paragraph with center alignment
	doc
		.setFontSize(11)
		.setTextColor(0, 0, 0) // Black text color
		.setFont(undefined, 'italic')
		.text(
			'Thank you for choosing us to be your travel partner. Below are the details of your travel ',
			35,
			70,
			{
				maxWidth: pageWidth - 45,
			}
		);
	doc
		.setFontSize(11)
		.setTextColor(0, 0, 0) // Black text color
		.setFont(undefined, 'italic')
		.text(
			'insurance quotation based on the information provided to us from your side.',
			20,
			75,
			{
				maxWidth: pageWidth - 30,
			}
		);
	// Policy Details Table
	// Add the table header row for "Details" and "Description"
	const tableHeader = [['Details', 'Description']];

	const addOnsCodes = data?.addOns?.map((addon) => addon?.code);

	const formatDate = (date) => {
		const [year, month, day] = date?.split('-');
		return `${day}/${month}/${year}`;
	};
	const policyDetailsLabels = [
		`Base premium based on Age`,
		`Senior Plus:`,
		`Senior:`,
		`Adult:`,
		`Child:`,
	];
	const policyDetailsData = [
		` `,
		`${
			data.superSeniorBasePremium === 0
				? ''
				: `AED ${roundToTwoDecimals(Number(data?.superSeniorBasePremium), 2)}`
		}`,
		`${
			data.seniorBasePremium === 0
				? ''
				: `AED ${roundToTwoDecimals(Number(data?.seniorBasePremium), 2)}`
		}`,
		`${
			data.adultBasePremium === 0
				? ''
				: `AED ${roundToTwoDecimals(Number(data?.adultBasePremium), 2)}`
		}`,
		`${
			data.childBasePremium === 0
				? ''
				: `AED ${roundToTwoDecimals(Number(data?.childBasePremium), 2)}`
		}`,
	];
	// const total =
	// 	data.broker === 'true' ? Number(data.price) : Number(data.price);
	function toTitleCase(str) {
		return str?.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
	}
	// Add the table rows to match the screenshot structure
	const tableBody = [
		['Type of Journey', `${toTitleCase(data?.isReturn)}`],
		['Trip Type', `${toTitleCase(data?.type)}`],
		[
			'Trip Duration',
			`${formatDate(data?.departureDate)} to ${formatDate(data?.returnDate)}`,
		],
		['Total Number of Days', `${data?.days}`],
		['Destination/Geographical Area', `${data?.destinationCountry}`],
		['Number of Senior Plus (81-85 Years)', `${data?.superSeniors}`],
		['Number of Seniors (76-80 Years)', `${data?.seniors}`],
		['Number of Adults (18-75 Years)', `${data?.adults}`],
		[`Number of kids (1 day-17 years)`, `${data?.children}`],
		['Selected Plan Name', `${data?.productName}`],
		[
			'Additional Benefits (if any) with type of Benefit',
			`${addOnsCodes?.join(', ') || 'NA'}`,
		],
		[policyDetailsLabels?.join('\n'), policyDetailsData?.join('\n')],
		[
			'Premium for Additional Benefits',
			`AED ${roundToTwoDecimals(Number(data.totalAddOnsPrice), 2)}`,
		],
		['VAT @5%', ` AED ${roundToTwoDecimals(Number(data.vet), 2)}`],
		[
			'Total Premium to be paid',
			`AED ${roundToTwoDecimals(Number(data.price), 2)}`,
		],
	];
	// Render the table
	doc.autoTable({
		startY: 85, // Adjust Y position to leave space for the above text
		head: tableHeader,
		body: tableBody,
		theme: 'grid',
		headStyles: {
			fillColor: null, // Remove header background color
			lineWidth: 0.3,
			lineColor: [0, 0, 0],
			fontSize: 11,
			textColor: [0, 0, 0], // Set header text color to black
			fontStyle: 'bold',
		},
		bodyStyles: {
			lineWidth: 0.3,
			lineColor: [0, 0, 0],
			cellPadding: 1.7, // Add padding in the body cells
			fontSize: 11,
			fontStyle: 'bold',
		},
		styles: {
			fontSize: 11,
			cellPadding: 1.7, // Add padding in all cells
			textColor: [0, 0, 0], // Set body text color to black
		},
		columnStyles: {
			0: { halign: 'left', fontStyle: 'bold' },
			1: { halign: 'center', fontStyle: 'italic' },
		},
		didParseCell: (data) => {
			if (data.section === 'body' && data.section === 'head') {
				// Apply bold and italic to all table body cells
				data.cell.styles.fontStyle = 'bolditalic';
			}
			if (data.section === 'head') {
				data.cell.styles.halign = 'center'; // Align "Details" header to the left
			}
		},
	});

	const paragraph =
		'Do let us know if you would like to proceed with same along with the mode of payment and your passport details reflecting the passport number, date of birth and your full name. Kindly also provide the email address on which you would like to receive your policy documents along with premium receipts and policy terms and conditions.';
	const lineHeight = 5;
	doc
		.setFontSize(11)
		.setTextColor(0, 0, 0) // Black text color
		.setFont(undefined, 'italic');
	// Split text into multiple lines if necessary
	const lines = doc.splitTextToSize(paragraph, pageWidth - 25);
	// Loop through lines and print them with a specified line height
	let yPosition = doc.lastAutoTable.finalY + 10;
	for (let i = 0; i < lines.length; i++) {
		doc.text(lines[i], 10, yPosition);
		yPosition += lineHeight;
	}
	doc
		.setFontSize(10)
		.setTextColor(25, 66, 106) // blue text color
		.setFont(undefined, 'italic')
		.text(
			'Note: Please refer to next pages to go through the table of benefits for the plan chosen by you, along with its terms and conditions and the claim process for easy reference.',
			10, // Centered X position
			doc.lastAutoTable.finalY + 33, // Position below the table
			{
				align: 'left',
				maxWidth: pageWidth - 25, // 90% width of the page
			}
		);

	const processedBenefits = data?.benefits?.map((benefit) => {
		// Check if the value is "Free Service"
		if (benefit?.value === 'Free Service') {
			return {
				...benefit,
				value: benefit?.value, // Update to show "Free"
			};
		}
		const values = benefit?.value.split(' | '); // Split value string
		let selectedValue;
		// Determine the value based on the coverage type
		if (data?.destinationCountry === 'Worldwide EXCL - USA, CAN') {
			selectedValue = values[1]; // Pick the second value
		} else if (
			data?.destinationCountry === 'Worldwide' &&
			data?.type === 'INBOUND'
		) {
			selectedValue = values[2]; // Pick the last value
		} else if (
			data.destinationCountry === 'Worldwide' &&
			data?.type === 'OUTBOUND'
		) {
			selectedValue = values[0]; // Pick the last value
		} else {
			selectedValue = values[0]; // Default to the first value
		}
		return {
			...benefit,
			value: selectedValue, // Update the value field
		};
	});
	const paidBenefits = processedBenefits?.map((b) => [b.item, b.value]);
	doc.autoTable({
		startY: 300,
		head: [[`BENEFITS`, 'SUM INSURED']],
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
			fontSize: 11,
			fontStyle: 'bold',
			textColor: '#000000',
		},
		bodyStyles: {
			lineWidth: 0.3,
			lineColor: [0, 0, 0],
			cellPadding:
				data.productCode === 'SCHPRM'
					? 2.5
					: data.productCode === 'UAE_INBOUND_20k' ||
					  data.productCode === 'UAE_INBOUND_200k'
					? 3.5
					: 1.5,
		},
		styles: {
			fontSize: 11,
			cellPadding:
				data.productCode === 'SCHPRM'
					? 2.5
					: data.productCode === 'UAE_INBOUND_20k' ||
					  data.productCode === 'UAE_INBOUND_200k'
					? 3.5
					: 1.5,
			fontStyle: 'normal',
			textColor: '#000000',
		},
		margin: { top: 60, bottom: 35 },
	});
	// if (data.productCode === 'SCHPRM') {
	// 	doc.addPage();
	// }
	doc
		.setFontSize(9)
		.setTextColor(0, 0, 0) // Set color to blue (RGB)
		.setFont(undefined, 'normal')
		.text(
			'Above sums insured are per person & per period of cover',
			15,
			doc.lastAutoTable.finalY + 4
		);
	const url = ORT_HowtoClaim;
	// Set the position for the link and text
	const linkX = 15;
	const linkY = doc.lastAutoTable.finalY + 20;
	// Set the font and size before measuring the text
	doc.setFont(undefined, 'normal').setFontSize(9);
	const text1 = 'Click here to see how to file a claim';
	const textWidth1 = doc.getTextWidth(text);
	const textHeight1 = 9 * 0.35;
	// Create the link with accurate dimensions
	doc.link(linkX, linkY - textHeight1 + 1, textWidth1, textHeight1, {
		url: url,
	});
	// Add the text
	doc
		.setTextColor(25, 66, 106) //refer to blue
		.text(text1, linkX, linkY);
	const url2 = data.termsAndConditions;
	const linkX2 = 15;
	const linkY2 = doc.lastAutoTable.finalY + 13;
	doc.setFont(undefined, 'normal').setFontSize(9);
	const text2 = 'Policy Terms and Conditions';
	const textWidth2 = doc.getTextWidth(text);
	const textHeight = 9 * 0.35;
	doc.link(linkX2, linkY2 - textHeight - 1, textWidth2, textHeight, {
		url: url2,
	});
	doc.setTextColor(25, 66, 106).text(text2, linkX2, linkY2);
	//add QR code and header to all pages except first one
	const pageCount = doc.internal.getNumberOfPages();
	let currentPage = 1;
	while (currentPage <= pageCount) {
		// Add header to the document
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

		let yPosition = 22;
		arabicTexts.forEach((text) => {
			doc.text(text, pageWidth - 15, yPosition, { align: 'right' });
			yPosition += 5;
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

		if (currentPage === 2) {
			doc
				.setFontSize(16)
				.setTextColor(25, 66, 106)
				.setFont(undefined, 'italic');
			// Calculate the width of the text to position the underline correctly
			const text = `${data?.productName}`;
			const textX = pageWidth / 2;
			const textY = 50;
			doc.text(text, textX, textY, { align: 'center' });
		}

		// Add page numbering
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

			const horizontalPadding = 10;
			const textContentWidth = pageWidth - horizontalPadding * 2;

			const secondLineY = pageHeight - 1; // Doosra line thoda neeche 8

			// const ribbonHeight = 10; // Adjust height as needed
			// doc.addImage(
			// 	`data:image/png;base64,${ribbonImgBase64}`,
			// 	'PNG',
			// 	0,
			// 	pageHeight - 13,
			// 	pageWidth,
			// 	ribbonHeight
			// );

			// First line (normal)
			doc.setFontSize(7);
			doc.setTextColor('#4D4E53');
			doc.setFont(undefined, 'normal');
			doc.text(
				'Travel Insurance plans are issued and insured by Orient Takaful PJSC, licensed by the UAE Insurance Authority, Registration number 1266734, Registered office at Al Futtaim Building,',
				pageWidth / 2,
				secondLineY + 4,

				{ maxWidth: textContentWidth, align: 'center' }
			);

			doc.text(
				'119 Omar Ibn Al Khattab Road,. Dubai, Dubai 183368, UAE',
				pageWidth / 2,
				secondLineY + 8,
				{
					maxWidth: textContentWidth,
					align: 'center',
				}
			);

			//add end of doc
			if (currentPage == pageCount) {
				//Add siugnature text
				doc.setFontSize(12);
				doc.setFont(undefined, 'bold');
				doc.text(
					'Authorized Signatory and Stamp',
					pageWidth - 82,
					doc.lastAutoTable.finalY + 40
				);
				//Add stamp
				doc.addImage(
					`data:image/png;base64,${stampAndSignature}`,
					'PNG',
					pageWidth - 80,
					doc.lastAutoTable.finalY + 43,
					70,
					50
				);
			}

			currentPage++;
		}
	}
	return doc.output('arraybuffer');
};
module.exports = generateQuotationReport;
