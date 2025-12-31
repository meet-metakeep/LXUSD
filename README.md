# LXUSD Wallet - XRPL EVM Network

A modern, mobile-first crypto wallet interface built for the XRPL EVM testnet. This wallet allows users to send and receive LXUSD tokens (backed by USDC on testnet) with a beautiful, pixel-perfect UI.

## Features

- 🔐 **MetaKeep Integration**: Secure wallet management using MetaKeep SDK
- 💰 **Token Management**: View and manage LXUSD and XRPL EVM tokens
- 📤 **Send Tokens**: Send LXUSD tokens to any wallet address
- 📥 **Receive Tokens**: Generate QR codes for receiving tokens
- 🎨 **Modern UI**: Built with Next.js, Tailwind CSS, and shadcn components
- 📱 **Mobile-First**: Optimized for mobile viewing and interactions

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui with Radix UI primitives
- **Icons**: Lucide React
- **Wallet SDK**: MetaKeep
- **Network**: XRPL EVM Testnet

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:

\`\`\`bash
npm install
\`\`\`

2. Create a `.env.local` file with your MetaKeep App ID:

\`\`\`env
NEXT_PUBLIC_METAKEEP_APP_ID=d29d6f56-0dd5-44ae-a083-736cc866b212
NEXT_PUBLIC_XRPL_CHAIN_ID=1440002
NEXT_PUBLIC_XRPL_RPC_URL=https://rpc.testnet.xrplevm.org
\`\`\`

3. Run the development server:

\`\`\`bash
npm run dev
\`\`\`

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

\`\`\`
look-ripple/
├── app/
│   ├── layout.tsx          # Root layout with MetaKeep SDK
│   ├── page.tsx             # Main wallet interface
│   └── globals.css          # Global styles
├── components/
│   └── ui/                  # shadcn UI components
│       ├── button.tsx
│       ├── dialog.tsx
│       └── input.tsx
├── lib/
│   └── utils.ts             # Utility functions
├── types/
│   └── metakeep.d.ts        # MetaKeep type definitions
└── public/
    └── lxusd-logo.svg       # LXUSD wallet logo
\`\`\`

## Features in Detail

### Wallet Connection
- Automatic MetaKeep SDK initialization on page load
- Retrieves EVM wallet address for XRPL EVM network

### Send Tokens
- QR code scanner support
- Manual address input
- Amount validation
- Uses USDC on testnet (displayed as LXUSD)

### Receive Tokens
- QR code generation for wallet address
- Copy address to clipboard
- Shareable wallet address

### Token Display
- Real-time balance updates
- USD value conversion
- Multiple token support (LXUSD and XRPL)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_METAKEEP_APP_ID` | MetaKeep application ID |
| `NEXT_PUBLIC_XRPL_CHAIN_ID` | XRPL EVM chain ID (testnet: 1440002) |
| `NEXT_PUBLIC_XRPL_RPC_URL` | XRPL EVM RPC endpoint |

## Testnet Resources

- **USDC Faucet**: [https://faucet.circle.com/](https://faucet.circle.com/)
- **XRPL Faucet**: [https://faucet.xrplevm.org/](https://faucet.xrplevm.org/)
- **MetaKeep Docs**: [https://docs.metakeep.xyz/](https://docs.metakeep.xyz/)

## Development Notes

- LXUSD tokens are mapped 1:1 with USDC on testnet
- All values displayed in the UI use the LXUSD branding
- The wallet uses MetaKeep's EVM address for XRPL EVM compatibility

## License

MIT

## Support

For issues or questions, please open an issue on the GitHub repository.
