import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
    initiateKhaltiPayment,
    verifyKhaltiPayment,
    getPaymentDetails,
    confirmCOD,
    initiateBatchPayment,
    verifyBatchPayment,
    confirmBatchCOD
} from "../controllers/payment.controller.js";

const router = Router();

// All payment routes require authentication
router.use(authenticate);

// Khalti ePayment V2 routes
router.post("/initiate", initiateKhaltiPayment);
router.post("/verify", verifyKhaltiPayment);
router.post("/cod", confirmCOD);

router.post("/initiate-batch", initiateBatchPayment);
router.post("/verify-batch", verifyBatchPayment);
router.post("/cod-batch", confirmBatchCOD);

// Get payment details by ID
router.get("/:id", getPaymentDetails);

export default router;
