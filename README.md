# Rage Bait

Rage Bait is a free browser platformer with 310 levels, unlimited retries, and traps that change position and timing after a death. Dodge lightning and giant saws, ride moving boats, and solve puzzles involving hidden ledges, moving exits, and size-changing pads.

[Play Rage Bait](https://ragebaitgame.co.uk/)

## Play

- **Campaign** has ten stages. The opening levels range from 6 to 40 ledges, and the later courses each have 40.
- **Daily Challenge** rotates at midnight UK time. Everyone gets the same course for that date. Finish it to see your time, death count, and a link you can share.
- **Supporter Pack** costs £1.99 as a one-time purchase when checkout is enabled. It includes three skins, an apple-shower death effect, and a supporter badge. Purchases unlock in the browser used at checkout.

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | A and D or the arrow keys | Hold either arrow |
| Jump or swim | Space, W, or Up | Tap Jump |
| Restart | R | Tap Restart |
| Enlarge the game | Select Full screen | Tap Full screen |

## Run locally

Serve the game files with Python 3 and open `http://localhost:4173`.

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

The static preview supports the campaign, daily challenges, and result sharing. The hosted Worker serves the checkout, purchase verification, privacy, and ad configuration routes.

## Build the Worker

Use Node.js 22 or later.

```sh
node scripts/build-site.mjs
node --check dist/server/index.js
```

The build embeds the browser files in `dist/server/index.js`. Edit the game scripts and markup in `dist/` and the Worker source in `server/`.

## Monetization

Set runtime values in the hosting environment. [`.env.example`](.env.example) lists the supported names.

### Enable checkout on Netlify

Deploy the repository to the Netlify project. `netlify.toml` publishes `dist/` and the supporter function serves the checkout routes on `https://ragebaitgame.co.uk`.

1. Activate a Stripe account for live payments. In Stripe, create a restricted live API key with **Checkout Sessions** read and write access.
2. In Netlify, open **Project configuration → Environment variables**. Add the key as `STRIPE_SECRET_KEY` and a stable random signing secret as `SUPPORTER_SIGNING_KEY`. For example, generate the signing secret locally with `openssl rand -hex 32`. Store both values as secrets for the **Production** deploy context and **Functions** scope.
3. Redeploy the project. Open the game on `https://ragebaitgame.co.uk` and select **Supporter** to check that **Buy for £1.99** appears. The checkout creates the fixed £1.99 price in GBP.

Keep the signing secret stable across deployments so previously issued purchase receipts continue to validate. Set `SUPPORTER_ORIGIN` only when moving checkout to a different canonical HTTPS domain.

### Runtime variables

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Restricted live Stripe key with read and write access to Checkout Sessions |
| `SUPPORTER_SIGNING_KEY` | Stable random secret of at least 43 characters for signing purchase receipts |
| `SUPPORTER_ORIGIN` | Optional HTTPS origin override for checkout returns |
| `ADSENSE_PUBLISHER` | Public AdSense publisher ID used for the site verification tag and `ads.txt` |
| `ADSENSE_STAGE_SLOT` | Display ad unit ID for the stage-complete screen |
| `ADSENSE_CMP` | Set to `google` after publishing the Google consent message and configuring manual placement |

Stage ads require Google site approval and a configured ad unit. The Worker deployment serves `ads.txt` for `pub-7271416347446804`.

[View the live ads.txt](https://rage-bait-arcade.sacredhedgehog.chatgpt.site/ads.txt)
