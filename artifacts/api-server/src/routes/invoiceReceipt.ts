import { Router } from "express";
import { sendInvoiceToStudentEmail, sendReceiptToStudentEmail } from "../email";

const router = Router();

router.post("/admin/invoice/send-invoice", async (req, res) => {
  try {
    const { studentEmail, studentName, invoiceNo, date, degreeType, items, schedule, remarks, total, highlightedPayment, phone, contactEmail } = req.body;
    if (!studentEmail) { res.status(400).json({ error: "No student email provided." }); return; }
    await sendInvoiceToStudentEmail({ studentEmail, studentName, invoiceNo, date, degreeType, items, schedule, remarks, total, highlightedPayment, phone, contactEmail });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to send invoice email." });
  }
});

router.post("/admin/invoice/send-receipt", async (req, res) => {
  try {
    const { studentEmail, studentName, receiptNo, date, amountPaid, paymentMethod, reference, notes, degreeType } = req.body;
    if (!studentEmail) { res.status(400).json({ error: "No student email provided." }); return; }
    await sendReceiptToStudentEmail({ studentEmail, studentName, receiptNo, date, amountPaid, paymentMethod, reference, notes, degreeType });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to send receipt email." });
  }
});

export default router;
