const { z } = require('zod');

const positiveInt = z.number().int().positive('must be a positive integer');
const nonNegativeNum = z.number().min(0, 'must be non-negative');
const requiredString = z.string().min(1, 'is required');
const emailStr = z.string().email('must be a valid email');

const register = z.object({
  username: requiredString,
  email: emailStr,
  password: z.string().min(6, 'must be at least 6 characters'),
});

const login = z.object({
  email: emailStr,
  password: requiredString,
});

const requestPasswordReset = z.object({
  email: emailStr,
});

const resetPassword = z.object({
  token: requiredString,
  newPassword: z.string().min(8, 'must be at least 8 characters'),
});

const createProduct = z.object({
  name: requiredString.max(255),
  description: z.string().optional(),
  price: nonNegativeNum,
  stock: z.number().int().min(0, 'must be non-negative'),
});

const updateProduct = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  price: nonNegativeNum.optional(),
  stock: z.number().int().min(0).optional(),
});

const searchProducts = z.object({
  name: requiredString,
});

const createOrder = z.object({
  productId: positiveInt,
  quantity: positiveInt,
});

const updateOrder = z.object({
  quantity: positiveInt.optional(),
  status: z.string().min(1).optional(),
});

const createPayment = z.object({
  orderId: positiveInt,
  stripePaymentId: requiredString,
  amount: z.number().positive('must be positive'),
  currency: requiredString,
  status: z.string().optional(),
});

const createCheckoutSession = z.object({
  cart: z
    .array(
      z
        .object({
          productId: z.union([z.number(), z.string()]).optional(),
          id: z.union([z.number(), z.string()]).optional(),
          quantity: z.union([z.number(), z.string()]).refine(
            (val) => {
              const n = Number(val);
              return Number.isInteger(n) && n > 0;
            },
            { message: 'quantity must be a positive integer' },
          ),
        })
        .refine((item) => item.productId !== undefined || item.id !== undefined, {
          message: 'Each cart item must include productId or id',
        }),
    )
    .min(1, 'cart must be a non-empty array'),
});

module.exports = {
  register,
  login,
  requestPasswordReset,
  resetPassword,
  createProduct,
  updateProduct,
  searchProducts,
  createOrder,
  updateOrder,
  createPayment,
  createCheckoutSession,
};
