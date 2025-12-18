
export const GMLoggerABI = [
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
  }
] as const;
