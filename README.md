# BuildEstimate – Smart Construction Material & Cost Estimator

An educational React/Vite portal for preliminary construction quantity take-off and cost estimation in Indian Rupees.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Main features

- Preliminary quantity and cost calculations for RCC concrete, reinforcement steel (assumption-based), brickwork, plaster, paint, tiles, excavation and waterproofing.
- Editable material rates, wastage, labour and contingency allowances.
- Internal partition quantity inputs and approximate partition wall calculations.
- Save project inputs in the browser using local storage.
- Export a PDF report with project information, quantity summary, BOQ, cost summary, assumptions and exclusions.
- Upload and preview PDF/image floor plans. Selectable text in some PDFs may provide possible overall length and width values; users must verify these before applying.

## Important limitations

- This is an educational preliminary estimator, not a professional BOQ, tender estimate or structural design tool.
- Uploaded plans are **not** fully understood automatically. Scanned drawings and images are preview-only; there is no complete OCR/CAD room-wall-door-window extraction.
- Beam and column concrete volumes, excavation dimensions, waterproofing area, and internal partition dimensions are entered manually.
- Steel quantity uses an editable kg/m³ assumption and is not a bar bending schedule.
- Brick quantity uses an editable bricks/m³ assumption.
- External wall, plaster, paint and partition quantities use simplified assumptions. Verify openings, wall layouts, dimensions and units.
- Material rates are editable examples, not live supplier quotations. Confirm local rates and specifications.
- Detailed foundations/footings, staircase, electrical, plumbing, doors/windows, transport, taxes and professional fees are not comprehensively included.

## Responsible use

Check all drawing dimensions, measurement units, specifications, structural details, site conditions and supplier rates with a qualified civil engineer or quantity surveyor before using any estimate for actual construction.

## Deployment

The project is configured for Vite. On Vercel use:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
