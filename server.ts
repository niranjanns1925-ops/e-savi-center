import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for payment verification
  app.post("/api/verify-payment", async (req, res) => {
    const { transactionId } = req.body;
    
    if (!transactionId) {
      return res.status(400).json({ success: false, message: "Missing transactionId" });
    }

    try {
      // In a real Razorpay integration, verifying a UTR might require 
      // looking up payments via the Razorpay Payments API.
      // Example: razorpay.payments.fetch(transactionId)
      
      // For this integration, we simulate checking validity.
      // Replace with actual Razorpay API method: 
      // const payment = await razorpay.payments.fetch(transactionId);
      // const isValid = payment.status === 'captured';

      // SIMULATION: Check if ID is 12 digits numeric
      const isValid = /^[0-9]{12}$/.test(transactionId);

      if (isValid) {
        res.json({ success: true, message: "Payment verified successfully." });
      } else {
        res.json({ success: false, message: "Invalid or unverified transaction ID." });
      }
    } catch (error) {
      console.error("Razorpay verification error:", error);
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
