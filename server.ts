import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Cashfree } from "cashfree-pg";
import dotenv from "dotenv";
import * as admin from "firebase-admin";
import crypto from "crypto";

dotenv.config();

Cashfree.XClientId = process.env.CASHFREE_CLIENT_ID!;
Cashfree.XClientSecret = process.env.CASHFREE_CLIENT_SECRET!;
Cashfree.XEnvironment = Cashfree.Environment.SANDBOX; 

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

  // Placeholder for Cashfree order creation
  app.post("/api/create-order", async (req, res) => {
    try {
      const { amount, currency, receipt } = req.body;
      // Implement Cashfree order creation here
      res.json({ success: true, order: { id: "cf_order_" + Date.now() } });
    } catch (error) {
      console.error("Cashfree order creation error:", error);
      res.status(500).json({ success: false, message: "Failed to create order." });
    }
  });

  // API route for payment verification
  app.post("/api/verify-payment", async (req, res) => {
    // Implement Cashfree signature verification here
    res.json({ success: true, message: "Payment verified successfully." });
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
