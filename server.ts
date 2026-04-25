import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import * as cfPkg from "cashfree-pg";
import dotenv from "dotenv";
import * as admin from "firebase-admin";
import crypto from "crypto";

dotenv.config();

const cashfree = new cfPkg.Cashfree(
  cfPkg.CFEnvironment.SANDBOX,
  process.env.CASHFREE_CLIENT_ID,
  process.env.CASHFREE_CLIENT_SECRET
);

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

  app.use(express.json());

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
        order_id: order_id || "order_" + Date.now(),
        customer_details: {
          customer_id: customer_id,
          customer_email: customer_email,
          customer_phone: customer_phone,
        },
      };

      const order = await cashfree.PGCreateOrder(orderRequest);
      res.json({ success: true, order: order.data });
    } catch (error) {
      console.error("Cashfree order creation error:", error);
      res.status(500).json({ success: false, message: "Failed to create order." });
    }
  });

  // API route for payment verification
  app.post("/api/verify-payment", async (req, res) => {
    try {
      const { order_id } = req.body;
      if (!order_id) {
        return res.status(400).json({ success: false, message: "Missing order_id" });
      }
      
      const response = await cashfree.PGOrderFetchPayments("2023-08-01", order_id);
      res.json({ success: true, data: response.data });
    } catch (error) {
      console.error("Cashfree verification error:", error);
      res.status(500).json({ success: false, message: "Verification failed." });
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
