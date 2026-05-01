export type PaymentDetails = {
  upi?: {
    vpa: string; // e.g. name@upi
    payeeName?: string; // optional pn
  };
  bank?: {
    accountName: string;
    bankName: string;
    accountNumber: string;
    ifsc: string;
  };
  usdt?: {
    exchange: "binance";
    network: string; // e.g. TRC20, ERC20, BEP20
    address: string;
    note?: string;
  };
};

/**
 * Fill these with your real details.
 */
export const paymentDetails: PaymentDetails = {
  upi: {
    // UPI ID is now driven from admin-controlled app settings (upi_vpa).
    // Keep this empty to avoid stale fallback values flashing in UI/UPI intents.
    vpa: "",
    payeeName: "UnionVest",
  },
  bank: {
    accountName: "YOUR_ACCOUNT_NAME",
    bankName: "YOUR_BANK_NAME",
    accountNumber: "YOUR_ACCOUNT_NUMBER",
    ifsc: "YOUR_IFSC",
  },
  usdt: {
    exchange: "binance",
    network: "TRC20",
    address: "TQ3Z6f6sX9x7Lr8y5kJ1b2C3d4E5F6G7H8",
    note: "Send only USDT on the selected network.",
  },
};

