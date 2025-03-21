# YouTube Music Desktop Bridge

For use with [TheBlackParrot's](https://theblackparrot.me) [stream overlays](https://theblackparrot.me/overlays). Developed for [th-ch's YouTube Music client](https://github.com/th-ch/youtube-music/tree/master).

Make sure the API Server (Beta) plugin is enabled on the YouTube Music side.

On the overlay side, it's preferred to turn the "Show album metadata along with artist metadata" option off if you're playing user-uploaded videos. You *must* leave the "Show release year after album information" option disabled, the API does not expose proper release dates and instead exposes upload times.

## Setup

Download the latest release from the releases page, and extract everything into its own folder. Make sure you rename `config.sample.json` to `config.json` and configure your player/overlay websocket things there.

Then, run the `tbpytmbridge` executable.
 
## Development

This project was created using `bun init` in bun v1.0.6. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run src/index.ts
```

# License 

```
YouTube Music Bridge Script for TheBlackParrot's Stream Overlays
Copyright (C) 2025 mercurialworld 

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
```
