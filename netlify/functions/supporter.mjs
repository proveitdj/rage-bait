import { handleSupporter } from '../../server/supporter.js';

export default function supporter(request) {
  return handleSupporter(request, {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    SUPPORTER_SIGNING_KEY: process.env.SUPPORTER_SIGNING_KEY,
    SUPPORTER_ORIGIN: process.env.SUPPORTER_ORIGIN || 'https://ragebaitgame.co.uk',
  });
}

export const config = {
  path: ['/api/supporter/status', '/api/supporter/checkout', '/api/supporter/return'],
};
