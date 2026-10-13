# BuildEstimate – Smart Construction Material & Cost Estimator

Educational React/Vite website for conceptual material quantity and cost estimates in INR.

## Run locally

```bash
npm install
npm run dev
```

## Deploy on GitHub + Vercel

1. Create a new GitHub repository.
2. Upload all files and folders **inside this project** (not the zip itself). Do not upload `node_modules` or `.env`.
3. Go to https://vercel.com/new and import the repository.
4. Framework: Vite. Build command: `npm run build`. Output directory: `dist`.
5. Deploy.

## Important limitations

The app **does not** read measurements from uploaded 2D plans. Enter dimensions manually. Estimates are conceptual only: 12% extra slab concrete and 95 kg/m³ steel are illustrative, not structural design. Prices are editable example rates and are not live market prices. See the About tab for exclusions.
