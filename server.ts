import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Cashfree, CFEnvironment } from "cashfree-pg";
import dotenv from "dotenv";
import * as admin from "firebase-admin";
import crypto from "crypto";

dotenv.config();

let cashfreeClient: Cashfree | null = null;

function getCashfreeClient() {
  if (!cashfreeClient) {
    const clientId = process.env.CASHFREE_CLIENT_ID;
    const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('CASHFREE_CLIENT_ID or CASHFREE_CLIENT_SECRET environment variable is missing.');
    }
    
    cashfreeClient = new Cashfree(
      CFEnvironment.SANDBOX, // Or PRODUCTION depending on your environment
      clientId,
      clientSecret
    );
  }
  return cashfreeClient;
}

let firebaseAdminApp: admin.app.App | null = null;

export function getFirebaseAdmin() {
  if (!firebaseAdminApp) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing.');
    }
    
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      firebaseAdminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://esavai-center-default-rtdb.firebaseio.com",
      });
    } catch (error) {
      throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON. Ensure it is a valid JSON string.');
    }
  }
  return firebaseAdminApp;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString();
    }
  }));

  // Cashfree Webhook endpoint
  app.post("/api/cashfree-webhook", async (req: any, res) => {
    try {
      const signature = req.headers["x-webhook-signature"] as string;
      const timestamp = req.headers["x-webhook-timestamp"] as string;
      
      if (!signature || !timestamp || !req.rawBody) {
        return res.status(400).send("Missing webhook headers or body");
      }

      getCashfreeClient().PGVerifyWebhookSignature(signature, req.rawBody, timestamp);
      
      const payload = req.body;
      console.log("Verified Cashfree Webhook:", payload);
      
      // In a real scenario, you'd find the associated document by payload.data.order.order_id
      // and update its paymentStatus to "completed" in Firestore right here.
      
      res.json({ success: true });
    } catch (error) {
      console.error("Cashfree Webhook error:", error);
      res.status(400).send("Invalid Signature");
    }
  });

  // Cashfree order creation
  app.post("/api/create-order", async (req, res) => {
    try {
      const { amount, currency, customer_id, customer_email, customer_phone, order_id } = req.body;

      if (!amount || !customer_id || !customer_email || !customer_phone) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
      }

      const orderRequest = {
        order_amount: amount,
        order_currency: currency || "INR",
        order_id: "order_" + Date.now(),
        customer_details: {
          customer_id: customer_id,
          customer_email: customer_email,
          customer_phone: customer_phone,
        },
      };

      const order = await getCashfreeClient().PGCreateOrder(orderRequest);
      res.json({ success: true, order: order.data });
    } catch (error: any) {
      console.error("Cashfree order creation error:", error?.response?.data || error);
      res.status(500).json({ success: false, message: "Failed to create order.", error: error?.response?.data || error.message });
    }
  });

  // API route for payment verification
  app.post("/api/verify-payment", async (req, res) => {
    try {
      const { order_id } = req.body;
      if (!order_id) {
        return res.status(400).json({ success: false, message: "Missing order_id" });
      }
      
      const response = await getCashfreeClient().PGOrderFetchPayments(order_id);
      res.json({ success: true, data: response.data });
    } catch (error: any) {
      console.error("Cashfree verification error:", error?.response?.data || error);
      res.status(500).json({ success: false, message: "Verification failed.", error: error?.response?.data || error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();