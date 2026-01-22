export const GMLoggerABI = [
  // V3/V4 Functions (Standard Charge)
  {
    inputs: [
      { internalType: "address payable", name: "referrer", type: "address" },
      { internalType: "uint256", name: "signedPoints", type: "uint256" },
      { internalType: "uint256", name: "signedDay", type: "uint256" },
      { internalType: "bytes", name: "sig", type: "bytes" }
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
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalPoints",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getLeaderboard",
    outputs: [
      {
        components: [
          { internalType: "address", name: "player", type: "address" },
          { internalType: "uint256", name: "score", type: "uint256" }
        ],
        internalType: "struct Tesseract.Leader[]",
        name: "",
        type: "tuple[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  // Common History Functions
  {
    inputs: [],
    name: "previousActiveDay",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getLastStream",
    outputs: [
      { internalType: "uint256", name: "day", type: "uint256" },
      { internalType: "uint256", name: "count", type: "uint256" },
      { internalType: "address", name: "target", type: "address" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getCurrentDayStatus",
    outputs: [
      { internalType: "uint256", name: "day", type: "uint256" },
      { internalType: "address", name: "target", type: "address" },
      { internalType: "uint256", name: "players", type: "uint256" },
      { internalType: "uint256", name: "collectedFee", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  }
] as const;