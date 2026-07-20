'use server';
/**
 * @fileOverview An AI agent that summarizes daily sales data.
 *
 * - summarizeDailySales - A function that handles the daily sales summarization process.
 * - AISalesSummaryInput - The input type for the summarizeDailySales function.
 * - AISalesSummaryOutput - The return type for the summarizeDailySales function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AISalesSummaryInputSchema = z.object({
  date: z.string().describe('The date for which the sales data is provided (e.g., "2023-10-27").'),
  totalSalesAmount: z.number().describe('The total sales revenue for the day.'),
  soldProducts: z.array(
    z.object({
      productName: z.string().describe('The name of the sold product.'),
      quantitySold: z.number().int().describe('The quantity of the product sold.'),
      totalPrice: z.number().describe('The total price for this specific product sale.'),
    })
  ).describe('A list of products sold on the given date.'),
}).describe('Input data for daily sales summarization, including date, total amount, and details of sold products.');

export type AISalesSummaryInput = z.infer<typeof AISalesSummaryInputSchema>;

const AISalesSummaryOutputSchema = z.string().describe('A natural language summary of the daily sales data.');

export type AISalesSummaryOutput = z.infer<typeof AISalesSummaryOutputSchema>;

export async function summarizeDailySales(input: AISalesSummaryInput): Promise<AISalesSummaryOutput> {
  return aiSalesSummaryFlow(input);
}

const aiSalesSummaryPrompt = ai.definePrompt({
  name: 'aiSalesSummaryPrompt',
  input: { schema: AISalesSummaryInputSchema },
  output: { schema: AISalesSummaryOutputSchema },
  prompt: `You are an expert sales analyst.

Summarize the following daily sales data for {{date}}. Provide a concise overview, highlighting key performance indicators, top-selling items, and any noticeable trends or anomalies.

Sales Date: {{{date}}}
Total Sales Amount: \${{{totalSalesAmount}}}

Products Sold:
{{#each soldProducts}}
- Product: {{{productName}}}, Quantity Sold: {{quantitySold}}, Total Price: \${{{totalPrice}}}
{{/each}}

Focus on providing insights that a sales manager would find useful for quick understanding of the day's performance.`,
});

const aiSalesSummaryFlow = ai.defineFlow(
  {
    name: 'aiSalesSummaryFlow',
    inputSchema: AISalesSummaryInputSchema,
    outputSchema: AISalesSummaryOutputSchema,
  },
  async (input) => {
    const { output } = await aiSalesSummaryPrompt(input);
    return output!;
  }
);
