import * as cfPkg from "cashfree-pg";
import dotenv from "dotenv";

dotenv.config();

const cashfree = new cfPkg.Cashfree(
  cfPkg.CFEnvironment.SANDBOX,
  process.env.CASHFREE_CLIENT_ID,
  process.env.CASHFREE_CLIENT_SECRET,
  process.env.CASHFREE_API_VERSION || "2023-08-01"
);

console.log("Cashfree configured.");

async function test() {
  try {
    const orderRequest = {
      order_amount: 1,
      order_currency: "INR",
      order_id: "test_" + Date.now(),
      customer_details: {
        customer_id: "user123",
        customer_email: "test@example.com",
        customer_phone: "9999999999",
      },
    };
    const order = await cashfree.PGCreateOrder(orderRequest);
    console.log("Created:", order.data);
  } catch (error: any) {
    console.error("Error creating order:", error.response?.data || error.message);
  }
}
test();
