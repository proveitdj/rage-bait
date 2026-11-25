# Rage Bait

Rage Bait is a free browser platformer with 310 levels, unlimited retries, and traps that change position and timing after a death. Dodge lightning and giant saws, ride moving boats, and solve puzzles involving hidden ledges, moving exits, and size-changing pads.

[Play Rage Bait](https://rage-bait-arcade.sacredhedgehog.chatgpt.site)

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

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Restricted live Stripe key with read and write access to Checkout Sessions |
| `SUPPORTER_SIGNING_KEY` | Stable random secret of at least 43 characters for signing purchase receipts |
| `SUPPORTER_ORIGIN` | Optional HTTPS origin override for checkout returns |
| `ADSENSE_PUBLISHER` | Public AdSense publisher ID used for the site verification tag and `ads.txt` |
| `ADSENSE_STAGE_SLOT` | Display ad unit ID for the stage-complete screen |
| `ADSENSE_CMP` | Set to `google` after publishing the Google consent message and configuring manual placement |

The live site publishes the verification tag and `ads.txt` for `pub-7271416347446804`. Checkout requires a connected Stripe account, and stage ads require Google site approval and a configured ad unit.

[View the live ads.txt](https://rage-bait-arcade.sacredhedgehog.chatgpt.site/ads.txt)
