const ONES = [
  "", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
  "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN",
  "SEVENTEEN", "EIGHTEEN", "NINETEEN"
];

const TENS = [
  "", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"
];

function threeDigitsToWords(num: number): string {
  let str = "";
  if (num >= 100) {
    str += ONES[Math.floor(num / 100)] + " HUNDRED";
    num %= 100;
    if (num > 0) str += " ";
  }
  if (num >= 20) {
    str += TENS[Math.floor(num / 10)];
    if (num % 10 > 0) str += "-" + ONES[num % 10];
  } else if (num > 0) {
    str += ONES[num];
  }
  return str;
}

export function numberToWords(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded === 0) return "ZERO RUPEES ONLY";

  const units = [
    { value: 1_000_000_000, label: "BILLION" },
    { value: 1_000_000, label: "MILLION" },
    { value: 1_000, label: "THOUSAND" },
    { value: 1, label: "" }
  ];

  let remainder = Math.abs(rounded);
  const parts: string[] = [];

  for (const unit of units) {
    const chunk = Math.floor(remainder / unit.value);
    remainder %= unit.value;
    if (chunk > 0) {
      const words = threeDigitsToWords(chunk);
      parts.push(unit.label ? `${words} ${unit.label}` : words);
    }
  }

  const sign = rounded < 0 ? "MINUS " : "";
  return `${sign}${parts.join(" ")} RUPEES ONLY`;
}
