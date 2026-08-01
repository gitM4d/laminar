# Deployments

Expected future artifact after a real Base Sepolia deploy:

```text
contracts/deployments/base-sepolia.json
```

Suggested shape:

```json
{
  "chainId": 84532,
  "laminarRouter": "0x...",
  "aaveV3Adapter": "0x...",
  "aavePool": "0x...",
  "protocolId": "0x...",
  "deployedAt": "..."
}
```

Do not invent addresses. This directory stays empty until a verified broadcast deploy is recorded.
