# **App Name**: EtsyBuchhalter

## Core Features:

- CSV Import and Parsing: Accept an Etsy order CSV, parse the data, and store the relevant details for invoice generation.
- Invoice Generation: Dynamically generate PDF invoices for each order, including all legally required information and automated, context-dependent tax notes based on product type (physical/digital) and destination (EU/non-EU).
- Sales Summary: Display a summary of net sales and calculated VAT amounts from generated invoices.
- Invoice Download: Provide download links for individual generated PDF invoices.
- Etsy Fees Parsing: Parse Etsy fees from uploaded PDF statements to extract fee transactions
- Dashboard Metrics: Calculate and display key financial metrics (total net sales, VAT, Etsy fees, payouts) in a dashboard.
- Auszahlung Validator Tool: Implement a validation tool that calculates the expected payout.  The tool calculates this by using the Rechnungs-Bruttobeträge (inkl. USt) and Etsy-Gebühren. It uses that value to find a Differenz between this expected value and the value parsed in Schritt 3 to alert to any inconsistencies.

## Style Guidelines:

- Primary color: Vivid blue (#29ABE2), echoing trust and financial acumen.
- Background color: Light gray (#F0F4F7), offering a clean and professional canvas.
- Accent color: Soft green (#90EE90), emphasizing positive values.
- Body and headline font: 'Inter', a grotesque-style sans-serif, provides a modern, objective look.
- Code font: 'Source Code Pro' will display file system paths.
- Crisp, minimalist icons representing financial transactions, documents, and key metrics.
- Clean, well-spaced layout with clear visual hierarchy for easy navigation and data interpretation.