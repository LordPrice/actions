import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  VersionedTransaction,
} from '@solana/web3.js';
import { prepareTransaction } from '../../shared/transaction-utils';
import {
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse, LinkedAction,
} from '@solana/actions';
import { Hono } from 'hono';
import { LinkedActionType } from '@solana/actions-spec';

const DONATION_DESTINATION_WALLET =
  'u1bDRdeRSpG9DPWtHVH2dyiww1pAcYNGt7WB34z3c7E';
const DONATION_AMOUNT_SOL_OPTIONS = [0.1, 0.5, 1];
const DEFAULT_DONATION_AMOUNT_SOL = 1;

const app = new Hono();

app.get('/', (c) => {
    const { icon, title, description } = getDonateInfo();
    const amountParameterName = 'amount';
    const response: ActionGetResponse = {
      type: 'action',
      icon,
      label: `${DEFAULT_DONATION_AMOUNT_SOL} SOL`,
      title,
      description,
      links: {
        actions: [
          ...DONATION_AMOUNT_SOL_OPTIONS.map((amount) => ({
            type: 'transaction',
            label: `${amount} SOL`,
            href: `/api/donate/${amount}`,
          } satisfies LinkedAction)),
          {
            type: 'transaction',
            href: `/api/donate/{${amountParameterName}}`,
            label: 'Donate',
            parameters: [
              {
                name: amountParameterName,
                label: 'Enter a custom SOL amount',
              },
            ],
          } satisfies LinkedAction,
        ],
      },
    };

    return c.json(response, 200);
  },
);

app.get('/:amount', (c) => {
    const amount = c.req.param('amount');
    const { icon, title, description } = getDonateInfo();
    const response: ActionGetResponse = {
      type: 'action',
      icon,
      label: `${amount} SOL`,
      title,
      description,
    };
    return c.json(response, 200);
  },
);

app.post('/:amount?', async (c) => {
    const amount =
      c.req.param('amount') ?? DEFAULT_DONATION_AMOUNT_SOL.toString();
    const { account } = (await c.req.json()) as ActionPostRequest;

    const parsedAmount = parseFloat(amount);
    const transaction = await prepareDonateTransaction(
      new PublicKey(account),
      new PublicKey(DONATION_DESTINATION_WALLET),
      parsedAmount * LAMPORTS_PER_SOL,
    );
    const response: ActionPostResponse = {
      type: 'transaction',
      transaction: Buffer.from(transaction.serialize()).toString('base64'),
    };
    return c.json(response, 200);
  },
);

function getDonateInfo(): Pick<
  ActionGetResponse,
  'icon' | 'title' | 'description'
> {
  const icon =
    'https://discord.com/channels/1310442039812554905/1310442040642895894/1310442122599469138';
  const title = 'Donate to Oscar';
  const description =
    'Ragazzo entusiasta | Supporta la mia ricerca in questa vita.';
  return { icon, title, description };
}

async function prepareDonateTransaction(
  sender: PublicKey,
  recipient: PublicKey,
  lamports: number,
): Promise<VersionedTransaction> {
  const payer = new PublicKey(sender);
  const instructions = [
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: new PublicKey(recipient),
      lamports: lamports,
    }),
  ];
  return prepareTransaction(instructions, payer);
}

export default app;
