# **App Name**: Bedaya

## Core Features:

- Product Listing: Display a comprehensive list of all products, including their name, price, and current stock quantity.
- Product Management (CRUD): Allow users to add new products, edit existing product details (name, price), and permanently remove products from the catalog, with data saved to Firestore.
- Sale Transaction Entry: Enable efficient recording of new sales by selecting products, specifying quantities, and generating sale records, which are then saved to Firestore.
- Automated Stock Update: Automatically decrement the stock quantity of a product in Firestore immediately after a sale transaction is successfully recorded.
- Daily Sales Reporting: Provide a clear view of daily sales, showing the total sales amount and a detailed list of products sold for today, yesterday, or any user-selected date from Firestore.
- AI Sales Summary Tool: A generative AI tool that analyzes daily sales data to provide a concise natural-language summary, highlighting key metrics like top-selling items or unusual sales patterns.

## Style Guidelines:

- Primary color: A deep, professional blue (#2B5EA3) conveying trust and stability, designed for headlines and interactive elements on a light background.
- Background color: A very subtle, cool-toned light gray (#F3F5F7), providing a clean and understated canvas for data-rich content.
- Accent color: A vibrant, clear sky blue (#40CAE5), used sparingly for calls to action, highlights, and to inject energy into the interface.
- Body and headline font: 'Inter', a modern sans-serif typeface, chosen for its excellent readability and neutral aesthetic, suitable for conveying data clearly and professionally.