const USA_COVERAGE = '6649bd62a150800cbe01acff';
const WW_COVERAGE = '6649ca5aa150800cbe01ad03';
const WW_EXCL_USA_COVERAGE = '6649bd26a150800cbe01acfe';
const OTBSLV = '6648c53ff53a91c016d2b825';
const OTBGLD = '6648c540f53a91c016d2b827';
const OTBPLT = '6648c540f53a91c016d2b828';
const OTBFAM = '6648c540f53a91c016d2b829';

const PRICE_FACTORS = [
	{
		product: OTBSLV,
		coverage: WW_COVERAGE,
		duration: {
			min: 1,
			max: 5,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 41.56,
		},
		vat: {
			AED: 2.077894737,
		},
		priceExclVat: {
			AED: 39.48,
		},
	},
	{
		product: OTBSLV,
		coverage: WW_COVERAGE,
		duration: {
			min: 6,
			max: 9,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 50.95,
		},
		vat: {
			AED: 2.547368421,
		},
		priceExclVat: {
			AED: 48.4,
		},
	},
	{
		product: OTBSLV,
		coverage: WW_COVERAGE,
		duration: {
			min: 10,
			max: 15,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 64.17,
		},
		vat: {
			AED: 3.208421053,
		},
		priceExclVat: {
			AED: 60.96,
		},
	},
	{
		product: OTBSLV,
		coverage: WW_COVERAGE,
		duration: {
			min: 16,
			max: 22,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 83.41,
		},
		vat: {
			AED: 4.170526316,
		},
		priceExclVat: {
			AED: 79.24,
		},
	},
	{
		product: OTBSLV,
		coverage: WW_COVERAGE,
		duration: {
			min: 23,
			max: 31,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 98.48,
		},
		vat: {
			AED: 4.924210526,
		},
		priceExclVat: {
			AED: 93.56,
		},
	},
	{
		product: OTBSLV,
		coverage: WW_COVERAGE,
		duration: {
			min: 32,
			max: 45,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 135.28,
		},
		vat: {
			AED: 6.764210526,
		},
		priceExclVat: {
			AED: 128.52,
		},
	},
	{
		product: OTBSLV,
		coverage: WW_COVERAGE,
		duration: {
			min: 46,
			max: 62,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 153.26,
		},
		vat: {
			AED: 7.663157895,
		},
		priceExclVat: {
			AED: 145.6,
		},
	},
	{
		product: OTBSLV,
		coverage: WW_COVERAGE,
		duration: {
			min: 63,
			max: 92,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 231.49,
		},
		vat: {
			AED: 11.57473684,
		},
		priceExclVat: {
			AED: 219.92,
		},
	},
	{
		product: OTBSLV,
		coverage: WW_COVERAGE,
		duration: {
			min: 93,
			max: 365,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 400.42,
		},
		vat: {
			AED: 20.02105263,
		},
		priceExclVat: {
			AED: 380.4,
		},
	},
	{
		product: OTBGLD,
		coverage: USA_COVERAGE,
		duration: {
			min: 1,
			max: 5,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 62.61,
		},
		vat: {
			AED: 3.130526316,
		},
		priceExclVat: {
			AED: 59.48,
		},
	},
	{
		product: OTBGLD,
		coverage: USA_COVERAGE,
		duration: {
			min: 6,
			max: 9,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 72.88,
		},
		vat: {
			AED: 3.644210526,
		},
		priceExclVat: {
			AED: 69.24,
		},
	},
	{
		product: OTBGLD,
		coverage: USA_COVERAGE,
		duration: {
			min: 10,
			max: 15,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 96.29,
		},
		vat: {
			AED: 4.814736842,
		},
		priceExclVat: {
			AED: 91.48,
		},
	},
	{
		product: OTBGLD,
		coverage: USA_COVERAGE,
		duration: {
			min: 16,
			max: 22,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 120.25,
		},
		vat: {
			AED: 6.012631579,
		},
		priceExclVat: {
			AED: 114.24,
		},
	},
	{
		product: OTBGLD,
		coverage: USA_COVERAGE,
		duration: {
			min: 23,
			max: 31,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 149.39,
		},
		vat: {
			AED: 7.469473684,
		},
		priceExclVat: {
			AED: 141.92,
		},
	},
	{
		product: OTBGLD,
		coverage: USA_COVERAGE,
		duration: {
			min: 32,
			max: 45,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 185.39,
		},
		vat: {
			AED: 9.269473684,
		},
		priceExclVat: {
			AED: 176.12,
		},
	},
	{
		product: OTBGLD,
		coverage: USA_COVERAGE,
		duration: {
			min: 46,
			max: 62,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 223.2,
		},
		vat: {
			AED: 11.16,
		},
		priceExclVat: {
			AED: 212.04,
		},
	},
	{
		product: OTBGLD,
		coverage: USA_COVERAGE,
		duration: {
			min: 63,
			max: 92,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 332.17,
		},
		vat: {
			AED: 16.60842105,
		},
		priceExclVat: {
			AED: 315.56,
		},
	},
	{
		product: OTBGLD,
		coverage: USA_COVERAGE,
		duration: {
			min: 93,
			max: 365,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 584.29,
		},
		vat: {
			AED: 29.21473684,
		},
		priceExclVat: {
			AED: 555.08,
		},
	},
	{
		product: OTBGLD,
		coverage: WW_EXCL_USA_COVERAGE,
		duration: {
			min: 1,
			max: 5,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 49.52,
		},
		vat: {
			AED: 2.475789474,
		},
		priceExclVat: {
			AED: 47.04,
		},
	},
	{
		product: OTBGLD,
		coverage: WW_EXCL_USA_COVERAGE,
		duration: {
			min: 6,
			max: 9,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 58.91,
		},
		vat: {
			AED: 2.945263158,
		},
		priceExclVat: {
			AED: 55.96,
		},
	},
	{
		product: OTBGLD,
		coverage: WW_EXCL_USA_COVERAGE,
		duration: {
			min: 10,
			max: 15,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 80.88,
		},
		vat: {
			AED: 4.044210526,
		},
		priceExclVat: {
			AED: 76.84,
		},
	},
	{
		product: OTBGLD,
		coverage: WW_EXCL_USA_COVERAGE,
		duration: {
			min: 16,
			max: 22,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 107.28,
		},
		vat: {
			AED: 5.364210526,
		},
		priceExclVat: {
			AED: 101.92,
		},
	},
	{
		product: OTBGLD,
		coverage: WW_EXCL_USA_COVERAGE,
		duration: {
			min: 23,
			max: 31,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 134.32,
		},
		vat: {
			AED: 6.715789474,
		},
		priceExclVat: {
			AED: 127.6,
		},
	},
	{
		product: OTBGLD,
		coverage: WW_EXCL_USA_COVERAGE,
		duration: {
			min: 32,
			max: 45,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 155.2,
		},
		vat: {
			AED: 7.76,
		},
		priceExclVat: {
			AED: 147.44,
		},
	},
	{
		product: OTBGLD,
		coverage: WW_EXCL_USA_COVERAGE,
		duration: {
			min: 46,
			max: 62,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 173.14,
		},
		vat: {
			AED: 8.656842105,
		},
		priceExclVat: {
			AED: 164.48,
		},
	},
	{
		product: OTBGLD,
		coverage: WW_EXCL_USA_COVERAGE,
		duration: {
			min: 63,
			max: 92,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 255.37,
		},
		vat: {
			AED: 12.76842105,
		},
		priceExclVat: {
			AED: 242.6,
		},
	},
	{
		product: OTBGLD,
		coverage: WW_EXCL_USA_COVERAGE,
		duration: {
			min: 93,
			max: 365,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 551.62,
		},
		vat: {
			AED: 27.58105263,
		},
		priceExclVat: {
			AED: 524.04,
		},
	},
	{
		product: OTBPLT,
		coverage: USA_COVERAGE,
		duration: {
			min: 1,
			max: 5,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 86.48,
		},
		vat: {
			AED: 4.324210526,
		},
		priceExclVat: {
			AED: 82.16,
		},
	},
	{
		product: OTBPLT,
		coverage: USA_COVERAGE,
		duration: {
			min: 6,
			max: 9,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 106.65,
		},
		vat: {
			AED: 5.332631579,
		},
		priceExclVat: {
			AED: 101.32,
		},
	},
	{
		product: OTBPLT,
		coverage: USA_COVERAGE,
		duration: {
			min: 10,
			max: 15,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 132.63,
		},
		vat: {
			AED: 6.631578947,
		},
		priceExclVat: {
			AED: 126,
		},
	},
	{
		product: OTBPLT,
		coverage: USA_COVERAGE,
		duration: {
			min: 16,
			max: 22,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 183.92,
		},
		vat: {
			AED: 9.195789474,
		},
		priceExclVat: {
			AED: 174.72,
		},
	},
	{
		product: OTBPLT,
		coverage: USA_COVERAGE,
		duration: {
			min: 23,
			max: 31,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 209.05,
		},
		vat: {
			AED: 10.45263158,
		},
		priceExclVat: {
			AED: 198.6,
		},
	},
	{
		product: OTBPLT,
		coverage: USA_COVERAGE,
		duration: {
			min: 32,
			max: 45,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 233.14,
		},
		vat: {
			AED: 11.65684211,
		},
		priceExclVat: {
			AED: 221.48,
		},
	},
	{
		product: OTBPLT,
		coverage: USA_COVERAGE,
		duration: {
			min: 46,
			max: 62,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 255.03,
		},
		vat: {
			AED: 12.75157895,
		},
		priceExclVat: {
			AED: 242.28,
		},
	},
	{
		product: OTBPLT,
		coverage: USA_COVERAGE,
		duration: {
			min: 63,
			max: 92,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 344.13,
		},
		vat: {
			AED: 17.20631579,
		},
		priceExclVat: {
			AED: 326.92,
		},
	},
	{
		product: OTBPLT,
		coverage: USA_COVERAGE,
		duration: {
			min: 93,
			max: 365,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 726.69,
		},
		vat: {
			AED: 36.33473684,
		},
		priceExclVat: {
			AED: 690.36,
		},
	},
	{
		product: OTBPLT,
		coverage: WW_EXCL_USA_COVERAGE,
		duration: {
			min: 1,
			max: 5,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 77.39,
		},
		vat: {
			AED: 3.869473684,
		},
		priceExclVat: {
			AED: 73.52,
		},
	},
	{
		product: OTBPLT,
		coverage: WW_EXCL_USA_COVERAGE,
		duration: {
			min: 6,
			max: 9,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 100.76,
		},
		vat: {
			AED: 5.037894737,
		},
		priceExclVat: {
			AED: 95.72,
		},
	},
	{
		product: OTBPLT,
		coverage: WW_EXCL_USA_COVERAGE,
		duration: {
			min: 10,
			max: 15,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 128.13,
		},
		vat: {
			AED: 6.406315789,
		},
		priceExclVat: {
			AED: 121.72,
		},
	},
	{
		product: OTBPLT,
		coverage: WW_EXCL_USA_COVERAGE,
		duration: {
			min: 16,
			max: 22,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 166.95,
		},
		vat: {
			AED: 8.347368421,
		},
		priceExclVat: {
			AED: 158.6,
		},
	},
	{
		product: OTBPLT,
		coverage: WW_EXCL_USA_COVERAGE,
		duration: {
			min: 23,
			max: 31,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 201.94,
		},
		vat: {
			AED: 10.09684211,
		},
		priceExclVat: {
			AED: 191.84,
		},
	},
	{
		product: OTBPLT,
		coverage: WW_EXCL_USA_COVERAGE,
		duration: {
			min: 32,
			max: 45,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 222.82,
		},
		vat: {
			AED: 11.14105263,
		},
		priceExclVat: {
			AED: 211.68,
		},
	},
	{
		product: OTBPLT,
		coverage: WW_EXCL_USA_COVERAGE,
		duration: {
			min: 46,
			max: 62,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 252.72,
		},
		vat: {
			AED: 12.63578947,
		},
		priceExclVat: {
			AED: 240.08,
		},
	},
	{
		product: OTBPLT,
		coverage: WW_EXCL_USA_COVERAGE,
		duration: {
			min: 63,
			max: 92,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 334.95,
		},
		vat: {
			AED: 16.74736842,
		},
		priceExclVat: {
			AED: 318.2,
		},
	},
	{
		product: OTBPLT,
		coverage: WW_EXCL_USA_COVERAGE,
		duration: {
			min: 93,
			max: 365,
		},
		pax: {
			children: {
				min: 0,
				max: 100,
			},
			adults: {
				min: 0,
				max: 100,
			},
			seniors: {
				min: 0,
				max: 100,
			},
			superSeniors: {
				min: 0,
				max: 100,
			},
		},
		price: {
			AED: 632.04,
		},
		vat: {
			AED: 31.60210526,
		},
		priceExclVat: {
			AED: 600.44,
		},
	},
	{
		product: OTBFAM,
		coverage: WW_COVERAGE,
		duration: {
			min: 1,
			max: 5,
		},
		pax: {
			children: {
				min: 0,
				max: 4,
			},
			adults: {
				min: 1,
				max: 2,
			},
			seniors: {
				min: 0,
				max: 0,
			},
			superSeniors: {
				min: 0,
				max: 0,
			},
		},
		price: {
			AED: 106.36,
		},
		vat: {
			AED: 5.317894737,
		},
		priceExclVat: {
			AED: 101.04,
		},
	},
	{
		product: OTBFAM,
		coverage: WW_COVERAGE,
		duration: {
			min: 6,
			max: 9,
		},
		pax: {
			children: {
				min: 0,
				max: 4,
			},
			adults: {
				min: 1,
				max: 2,
			},
			seniors: {
				min: 0,
				max: 0,
			},
			superSeniors: {
				min: 0,
				max: 0,
			},
		},
		price: {
			AED: 148.51,
		},
		vat: {
			AED: 7.425263158,
		},
		priceExclVat: {
			AED: 141.08,
		},
	},
	{
		product: OTBFAM,
		coverage: WW_COVERAGE,
		duration: {
			min: 10,
			max: 15,
		},
		pax: {
			children: {
				min: 0,
				max: 4,
			},
			adults: {
				min: 1,
				max: 2,
			},
			seniors: {
				min: 0,
				max: 0,
			},
			superSeniors: {
				min: 0,
				max: 0,
			},
		},
		price: {
			AED: 191.79,
		},
		vat: {
			AED: 9.589473684,
		},
		priceExclVat: {
			AED: 182.2,
		},
	},
	{
		product: OTBFAM,
		coverage: WW_COVERAGE,
		duration: {
			min: 16,
			max: 22,
		},
		pax: {
			children: {
				min: 0,
				max: 4,
			},
			adults: {
				min: 1,
				max: 2,
			},
			seniors: {
				min: 0,
				max: 0,
			},
			superSeniors: {
				min: 0,
				max: 0,
			},
		},
		price: {
			AED: 235.2,
		},
		vat: {
			AED: 11.76,
		},
		priceExclVat: {
			AED: 223.44,
		},
	},
	{
		product: OTBFAM,
		coverage: WW_COVERAGE,
		duration: {
			min: 23,
			max: 31,
		},
		pax: {
			children: {
				min: 0,
				max: 4,
			},
			adults: {
				min: 1,
				max: 2,
			},
			seniors: {
				min: 0,
				max: 0,
			},
			superSeniors: {
				min: 0,
				max: 0,
			},
		},
		price: {
			AED: 280.67,
		},
		vat: {
			AED: 14.03368421,
		},
		priceExclVat: {
			AED: 266.64,
		},
	},
	{
		product: OTBFAM,
		coverage: WW_COVERAGE,
		duration: {
			min: 32,
			max: 45,
		},
		pax: {
			children: {
				min: 0,
				max: 4,
			},
			adults: {
				min: 1,
				max: 2,
			},
			seniors: {
				min: 0,
				max: 0,
			},
			superSeniors: {
				min: 0,
				max: 0,
			},
		},
		price: {
			AED: 328.63,
		},
		vat: {
			AED: 16.43157895,
		},
		priceExclVat: {
			AED: 312.2,
		},
	},
	{
		product: OTBFAM,
		coverage: WW_COVERAGE,
		duration: {
			min: 46,
			max: 62,
		},
		pax: {
			children: {
				min: 0,
				max: 4,
			},
			adults: {
				min: 1,
				max: 2,
			},
			seniors: {
				min: 0,
				max: 0,
			},
			superSeniors: {
				min: 0,
				max: 0,
			},
		},
		price: {
			AED: 354.53,
		},
		vat: {
			AED: 17.72631579,
		},
		priceExclVat: {
			AED: 336.8,
		},
	},
	{
		product: OTBFAM,
		coverage: WW_COVERAGE,
		duration: {
			min: 63,
			max: 92,
		},
		pax: {
			children: {
				min: 0,
				max: 4,
			},
			adults: {
				min: 1,
				max: 2,
			},
			seniors: {
				min: 0,
				max: 0,
			},
			superSeniors: {
				min: 0,
				max: 0,
			},
		},
		price: {
			AED: 491.33,
		},
		vat: {
			AED: 24.56631579,
		},
		priceExclVat: {
			AED: 466.76,
		},
	},
	{
		product: OTBFAM,
		coverage: WW_COVERAGE,
		duration: {
			min: 93,
			max: 365,
		},
		pax: {
			children: {
				min: 0,
				max: 4,
			},
			adults: {
				min: 1,
				max: 2,
			},
			seniors: {
				min: 0,
				max: 0,
			},
			superSeniors: {
				min: 0,
				max: 0,
			},
		},
		price: {
			AED: 759.37,
		},
		vat: {
			AED: 37.96842105,
		},
		priceExclVat: {
			AED: 721.4,
		},
	},
];
const DESTINATION_COUNTRIES = [
	{ name: 'Schengen countries', code: 'SCH' },
	{
		name: 'Worldwide excl. USA/Canada',
		code: 'Worldwide EXCL - USA, CAN',
	},
	{ name: 'Worldwide', code: 'Worldwide' },
	{ name: 'United Arab Emirates', code: 'ARE' },
];

const COUNTRIES = [
	{ name: 'Afghanistan', code: 'AFG' },
	{ name: 'Albania', code: 'ALB' },
	{ name: 'Algeria', code: 'DZA' },
	{ name: 'Andorra', code: 'AND' },
	{ name: 'Angola', code: 'AGO' },
	{ name: 'Antigua and Barbuda', code: 'ATG' },
	{ name: 'Argentina', code: 'ARG' },
	{ name: 'Armenia', code: 'ARM' },
	{ name: 'Australia', code: 'AUS' },
	{ name: 'Austria', code: 'AUT' },
	{ name: 'Azerbaijan', code: 'AZE' },
	{ name: 'American Samoa', code: 'ASM' },
	{ name: 'Bahamas', code: 'BHS' },
	{ name: 'Bahrain', code: 'BHR' },
	{ name: 'Bangladesh', code: 'BGD' },
	{ name: 'Barbados', code: 'BRB' },
	{ name: 'Belarus', code: 'BLR' },
	{ name: 'Belgium', code: 'BEL' },
	{ name: 'Belize', code: 'BLZ' },
	{ name: 'Benin', code: 'BEN' },
	{ name: 'Bhutan', code: 'BTN' },
	{ name: 'Bolivia', code: 'BOL' },
	{ name: 'Bosnia and Herzegovina', code: 'BIH' },
	{ name: 'Botswana', code: 'BWA' },
	{ name: 'Brazil', code: 'BRA' },
	{ name: 'Brunei Darussalam', code: 'BRN' },
	{ name: 'Bulgaria', code: 'BGR' },
	{ name: 'Burkina Faso', code: 'BFA' },
	{ name: 'Burundi', code: 'BDI' },
	{ name: 'Cabo Verde', code: 'CPV' },
	{ name: 'Cambodia', code: 'KHM' },
	{ name: 'Cameroon', code: 'CMR' },
	{ name: 'Canada', code: 'CAN' },
	{ name: 'Central African Republic', code: 'CAF' },
	{ name: 'Chad', code: 'TCD' },
	{ name: 'Chile', code: 'CHL' },
	{ name: 'China', code: 'CHN' },
	{ name: 'Colombia', code: 'COL' },
	{ name: 'Comoros', code: 'COM' },
	{ name: 'Congo', code: 'COG' },
	{ name: 'Congo', code: 'COD' },
	{ name: 'Costa Rica', code: 'CRI' },
	{ name: 'Croatia', code: 'HRV' },
	{ name: 'Cuba', code: 'CUB' },
	{ name: 'Cyprus', code: 'CYP' },
	{ name: 'Czechia', code: 'CZE' },
	{ name: 'Denmark', code: 'DNK' },
	{ name: 'Djibouti', code: 'DJI' },
	{ name: 'Dominica', code: 'DMA' },
	{ name: 'Dominican Republic', code: 'DOM' },
	{ name: 'Ecuador', code: 'ECU' },
	{ name: 'Egypt', code: 'EGY' },
	{ name: 'El Salvador', code: 'SLV' },
	{ name: 'Equatorial Guinea', code: 'GNQ' },
	{ name: 'Eritrea', code: 'ERI' },
	{ name: 'Estonia', code: 'EST' },
	{ name: 'Eswatini', code: 'SWZ' },
	{ name: 'Ethiopia', code: 'ETH' },
	{ name: 'Fiji', code: 'FJI' },
	{ name: 'Finland', code: 'FIN' },
	{ name: 'France', code: 'FRA' },
	{ name: 'Gabon', code: 'GAB' },
	{ name: 'Gambia', code: 'GMB' },
	{ name: 'Georgia', code: 'GEO' },
	{ name: 'Germany', code: 'DEU' },
	{ name: 'Ghana', code: 'GHA' },
	{ name: 'Greece', code: 'GRC' },
	{ name: 'Grenada', code: 'GRD' },
	{ name: 'Guatemala', code: 'GTM' },
	{ name: 'Guinea', code: 'GIN' },
	{ name: 'Guinea-Bissau', code: 'GNB' },
	{ name: 'Guyana', code: 'GUY' },
	{ name: 'Haiti', code: 'HTI' },
	{ name: 'Honduras', code: 'HND' },
	{ name: 'Hungary', code: 'HUN' },
	{ name: 'Iceland', code: 'ISL' },
	{ name: 'India', code: 'IND' },
	{ name: 'Indonesia', code: 'IDN' },
	{ name: 'Iran', code: 'IRN' },
	{ name: 'Iraq', code: 'IRQ' },
	{ name: 'Ireland', code: 'IRL' },
	{ name: 'Israel', code: 'ISR' },
	{ name: 'Italy', code: 'ITA' },
	{ name: 'Jamaica', code: 'JAM' },
	{ name: 'Japan', code: 'JPN' },
	{ name: 'Jordan', code: 'JOR' },
	{ name: 'Kazakhstan', code: 'KAZ' },
	{ name: 'Kenya', code: 'KEN' },
	{ name: 'Kiribati', code: 'KIR' },
	{ name: "Korea (Democratic People's Republic of)", code: 'PRK' },
	{ name: 'Korea (Republic of)', code: 'KOR' },
	{ name: 'Kuwait', code: 'KWT' },
	{ name: 'Kyrgyzstan', code: 'KGZ' },
	{ name: "Lao People's Democratic Republic", code: 'LAO' },
	{ name: 'Latvia', code: 'LVA' },
	{ name: 'Lebanon', code: 'LBN' },
	{ name: 'Lesotho', code: 'LSO' },
	{ name: 'Liberia', code: 'LBR' },
	{ name: 'Libya', code: 'LBY' },
	{ name: 'Liechtenstein', code: 'LIE' },
	{ name: 'Lithuania', code: 'LTU' },
	{ name: 'Luxembourg', code: 'LUX' },
	{ name: 'Madagascar', code: 'MDG' },
	{ name: 'Malawi', code: 'MWI' },
	{ name: 'Malaysia', code: 'MYS' },
	{ name: 'Maldives', code: 'MDV' },
	{ name: 'Mali', code: 'MLI' },
	{ name: 'Malta', code: 'MLT' },
	{ name: 'Marshall Islands', code: 'MHL' },
	{ name: 'Mauritania', code: 'MRT' },
	{ name: 'Mauritius', code: 'MUS' },
	{ name: 'Mexico', code: 'MEX' },
	{ name: 'Micronesia', code: 'FSM' },
	{ name: 'Moldova', code: 'MDA' },
	{ name: 'Monaco', code: 'MCO' },
	{ name: 'Mongolia', code: 'MNG' },
	{ name: 'Montenegro', code: 'MNE' },
	{ name: 'Morocco', code: 'MAR' },
	{ name: 'Mozambique', code: 'MOZ' },
	{ name: 'Myanmar', code: 'MMR' },
	{ name: 'Namibia', code: 'NAM' },
	{ name: 'Nauru', code: 'NRU' },
	{ name: 'Nepal', code: 'NPL' },
	{ name: 'Netherlands', code: 'NLD' },
	{ name: 'New Zealand', code: 'NZL' },
	{ name: 'Nicaragua', code: 'NIC' },
	{ name: 'Niger', code: 'NER' },
	{ name: 'Nigeria', code: 'NGA' },
	{ name: 'North Macedonia', code: 'MKD' },
	{ name: 'Norway', code: 'NOR' },
	{
		name: 'Worldwide excl. USA/Canada',
		code: 'Worldwide EXCL - USA, CAN',
	},
	{ name: 'Worldwide', code: 'Worldwide' },
	{ name: 'Oman', code: 'OMN' },
	{ name: 'Pakistan', code: 'PAK' },
	{ name: 'Palau', code: 'PLW' },
	{ name: 'Palestine, State of', code: 'PSE' },
	{ name: 'Panama', code: 'PAN' },
	{ name: 'Papua New Guinea', code: 'PNG' },
	{ name: 'Paraguay', code: 'PRY' },
	{ name: 'Peru', code: 'PER' },
	{ name: 'Philippines', code: 'PHL' },
	{ name: 'Poland', code: 'POL' },
	{ name: 'Portugal', code: 'PRT' },
	{ name: 'Qatar', code: 'QAT' },
	{ name: 'Romania', code: 'ROU' },
	{ name: 'Russian Federation', code: 'RUS' },
	{ name: 'Rwanda', code: 'RWA' },
	{ name: 'Saint Kitts and Nevis', code: 'KNA' },
	{ name: 'Saint Lucia', code: 'LCA' },
	{ name: 'Saint Vincent and the Grenadines', code: 'VCT' },
	{ name: 'Samoa', code: 'WSM' },
	{ name: 'San Marino', code: 'SMR' },
	{ name: 'Sao Tome and Principe', code: 'STP' },
	{ name: 'Saudi Arabia', code: 'SAU' },
	{ name: 'Senegal', code: 'SEN' },
	{ name: 'Serbia', code: 'SRB' },
	{ name: 'Seychelles', code: 'SYC' },
	{ name: 'Sierra Leone', code: 'SLE' },
	{ name: 'Singapore', code: 'SGP' },
	{ name: 'Slovakia', code: 'SVK' },
	{ name: 'Slovenia', code: 'SVN' },
	{ name: 'Solomon Islands', code: 'SLB' },
	{ name: 'Somalia', code: 'SOM' },
	{ name: 'South Africa', code: 'ZAF' },
	{ name: 'South Sudan', code: 'SSD' },
	{ name: 'Spain', code: 'ESP' },
	{ name: 'Sri Lanka', code: 'LKA' },
	{ name: 'Sudan', code: 'SDN' },
	{ name: 'Suriname', code: 'SUR' },
	{ name: 'Sweden', code: 'SWE' },
	{ name: 'Switzerland', code: 'CHE' },
	{ name: 'Syrian Arab Republic', code: 'SYR' },
	{ name: 'Schengen countries', code: 'SCH' },
	{ name: 'Tajikistan', code: 'TJK' },
	{ name: 'Tanzania', code: 'TZA' },
	{ name: 'Thailand', code: 'THA' },
	{ name: 'Timor-Leste', code: 'TLS' },
	{ name: 'Togo', code: 'TGO' },
	{ name: 'Tonga', code: 'TON' },
	{ name: 'Trinidad and Tobago', code: 'TTO' },
	{ name: 'Tunisia', code: 'TUN' },
	{ name: 'Turkey', code: 'TUR' },
	{ name: 'Turkmenistan', code: 'TKM' },
	{ name: 'Tuvalu', code: 'TUV' },
	{ name: 'Uganda', code: 'UGA' },
	{ name: 'Ukraine', code: 'UKR' },
	{ name: 'United Arab Emirates', code: 'ARE' },
	{ name: 'Great Britain', code: 'GBR' },
	{ name: 'United States of America', code: 'USA' },
	{ name: 'Uruguay', code: 'URY' },
	{ name: 'Uzbekistan', code: 'UZB' },
	{ name: 'Vanuatu', code: 'VUT' },
	{ name: 'Venezuela', code: 'VEN' },
	{ name: 'Viet Nam', code: 'VNM' },
	{ name: 'Yemen', code: 'YEM' },
	{ name: 'Zambia', code: 'ZMB' },
	{ name: 'Zimbabwe', code: 'ZWE' },
];

module.exports = {
	PRICE_FACTORS,
	COUNTRIES,
	DESTINATION_COUNTRIES,
};
