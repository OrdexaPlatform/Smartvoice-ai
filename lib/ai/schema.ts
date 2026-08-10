import { z } from "zod";

export const parsedConversationSchema = z.object({
  customer: z.object({
    name: z.string().nullable(),
    phone: z.string().nullable(),
    address: z.string().nullable(),
  }),
  order: z.object({
    items: z.array(
      z.object({
        name: z.string(),
        quantity: z.number().positive(),
        unit_price: z.number().nonnegative().nullable(),
      })
    ),
    payment_method: z
      .enum(["cash", "cash_on_delivery", "bank_transfer", "card", "other"])
      .nullable(),
    payment_status: z.enum(["unpaid", "paid"]).nullable(),
    delivery_date: z.string().nullable(),
    notes: z.string().nullable(),
  }),
});

export type ParsedConversationInput = z.infer<typeof parsedConversationSchema>;
