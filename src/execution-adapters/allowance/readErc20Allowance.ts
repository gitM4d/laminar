export const ERC20_ALLOWANCE_ABI = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export type AllowancePublicClient = {
  readContract(args: {
    address: `0x${string}`;
    abi: typeof ERC20_ALLOWANCE_ABI;
    functionName: "allowance";
    args: [`0x${string}`, `0x${string}`];
  }): Promise<bigint>;
};

export type ReadErc20AllowanceInput = {
  publicClient: AllowancePublicClient;
  tokenAddress: `0x${string}`;
  owner: `0x${string}`;
  spender: `0x${string}`;
};

export async function readErc20Allowance(
  input: ReadErc20AllowanceInput,
): Promise<bigint> {
  return input.publicClient.readContract({
    address: input.tokenAddress,
    abi: ERC20_ALLOWANCE_ABI,
    functionName: "allowance",
    args: [input.owner, input.spender],
  });
}
