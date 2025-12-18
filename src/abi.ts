
export const GMLoggerABI = [
  // V1 Functions
  {
    inputs: [
      { internalType: "address payable", name: "referrer", type: "address" }
    ],
    name: "GM",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [],
    name: "gmFee",
    outputs: [{ internalType: "uint64", name: "", type: "uint64" }],
    stateMutability: "view",
    type: "function"
  },
  // V2 Functions
  {
    inputs: [
      { internalType: "address payable", name: "referrer", type: "address" }
    ],
    name: "Charge",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [],
    name: "chargeFee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const;
