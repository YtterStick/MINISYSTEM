const express = require("express");
const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib"); // Import pdf-lib directly
const isAuthenticated = require("../middleware/auth");

const router = express.Router();

// Global pricing configuration
const PRICING = {
    services: {
        Wash: 95,
        Dry: 65,
        "Wash & Dry": 130,
        "Special Service": 200,
    },
    detergentCost: 17,
    fabricSoftenerCost: 13,
    plasticFee: 3.0,
};

// Process sales order (save or generate receipt)
router.post("/process", isAuthenticated, async (req, res) => {
    try {
        const {
            userId,
            customerName,
            numberOfLoads,
            services,
            detergentCount,
            fabricSoftenerCount,
            paymentStatus,
        } = req.body;

        console.log("Received request data:", req.body); // Debugging log

        const baseCost = PRICING.services[services] || 0;
        const totalCost =
            numberOfLoads * baseCost +
            (detergentCount || 0) * PRICING.detergentCost +
            (fabricSoftenerCount || 0) * PRICING.fabricSoftenerCost +
            PRICING.plasticFee;

        const db = req.app.get("db");

        const query = `
            INSERT INTO sales_orders (user_id, customer_name, number_of_loads, services, detergent_count, fabric_softener_count, additional_fees, total_cost, payment_status, month_created)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const monthCreated = new Date().toLocaleString("en-US", { month: "long" });

        db.query(
            query,
            [
                userId,
                customerName,
                numberOfLoads,
                services,
                detergentCount || 0,
                fabricSoftenerCount || 0,
                PRICING.plasticFee,
                totalCost,
                paymentStatus,
                monthCreated,
            ],
            async (err, result) => {
                if (err) {
                    console.error("Error processing transaction:", err);
                    return res.status(500).json({ success: false, message: "Failed to process transaction." });
                }

                // If paid, generate the receipt
                if (paymentStatus === "Paid") {
                    try {
                        const pdf = await generateReceiptPDF({
                            customerName,
                            services,
                            numberOfLoads,
                            detergentCount,
                            fabricSoftenerCount,
                            additionalFees: PRICING.plasticFee,
                            totalCost,
                        });

                        const receiptFileName = `receipt_${result.insertId || Date.now()}.pdf`;
                        const filePath = path.join(__dirname, "../receipts", receiptFileName);

                        fs.writeFileSync(filePath, pdf);

                        console.log("Receipt generated:", filePath); // Debugging log

                        res.status(200).json({
                            success: true,
                            message: "Transaction processed successfully.",
                            receipt: `/receipts/${receiptFileName}`,
                        });
                    } catch (err) {
                        console.error("Error generating receipt:", err);
                        return res.status(500).json({ success: false, message: "Failed to generate receipt." });
                    }
                } else {
                    res.status(200).json({ success: true, message: "Transaction saved as unpaid." });
                }
            }
        );
    } catch (err) {
        console.error("Error in processing request:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});
// Fetch paid transactions with filters
// Route to get paid transactions excluding claimed ones
router.get("/paid", isAuthenticated, (req, res) => {
    const { date, name } = req.query; // Date and name from query params
    const db = req.app.get("db");

    let query = `
        SELECT * FROM sales_orders 
        WHERE payment_status = 'Paid' 
        AND claimed_status != 'Claimed'`;  // Exclude claimed orders

    if (date) {
        query += ` AND DATE(created_at) = ?`;
    }

    if (name) {
        query += ` AND customer_name LIKE ?`;
    }

    query += ` ORDER BY created_at DESC`;

    db.query(query, [date, `%${name}%`], (err, result) => {
        if (err) {
            console.error("Error fetching paid transactions:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch paid transactions." });
        }

        res.status(200).json({ success: true, transactions: result });
    });
});


// Sales Order API Route to get unpaid transactions
router.get("/unpaid", isAuthenticated, (req, res) => {
    const db = req.app.get("db");

    const query = `
        SELECT * FROM sales_orders 
        WHERE payment_status = 'Unpaid'
        ORDER BY month_created DESC
    `;

    db.query(query, (err, result) => {
        if (err) {  
            console.error("Error fetching unpaid transactions:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch unpaid transactions." });
        }

        res.status(200).json({ success: true, transactions: result });
    });
});

// Route to mark a transaction as paid and generate a receipt
router.post("/mark-paid/:orderId", isAuthenticated, (req, res) => {
    const { orderId } = req.params;
    const db = req.app.get("db");

    console.log("Marking order as paid. Order ID:", orderId); // Debugging log

    const query = `
        UPDATE sales_orders
        SET claimed_status = 'Claimed'
        WHERE id = ? AND payment_status = 'Paid'
    `;

    db.query(query, [orderId], async (err, result) => {
        if (err) {
            console.error("Error updating payment status:", err); // Log error
            return res.status(500).json({ success: false, message: "Failed to update payment status." });
        }

        console.log("Payment status updated. Generating receipt..."); // Debugging log

        const orderQuery = `
            SELECT * FROM sales_orders WHERE id = ?
        `;
        db.query(orderQuery, [orderId], async (err, order) => {
            if (err) {
                console.error("Error fetching order details:", err); // Log error
                return res.status(500).json({ success: false, message: "Failed to fetch order details." });
            }

            const orderData = order[0];
            try {
                const pdf = await generateReceiptPDF({
                    customerName: orderData.customer_name,
                    services: orderData.services,
                    numberOfLoads: orderData.number_of_loads,
                    detergentCount: orderData.detergent_count,
                    fabricSoftenerCount: orderData.fabric_softener_count,
                    additionalFees: Number(orderData.additional_fees), // Ensure numeric value
                    totalCost: Number(orderData.total_cost), // Ensure numeric value
                });

                const receiptFileName = `receipt_${orderId}.pdf`;
                const filePath = path.join(__dirname, "../receipts", receiptFileName);

                fs.writeFileSync(filePath, pdf);

                console.log("Receipt generated:", filePath); // Debugging log

                res.status(200).json({
                    success: true,
                    message: "Transaction marked as paid and receipt generated.",
                    receipt: `/receipts/${receiptFileName}`,
                });
            } catch (err) {
                console.error("Error generating receipt:", err); // Log error
                return res.status(500).json({ success: false, message: "Failed to generate receipt." });
            }
        });
    });
});
// Route to mark an order as claimed
router.post("/mark-claimed/:orderId", isAuthenticated, (req, res) => {
    const { orderId } = req.params;
    const db = req.app.get("db");

    // Update the claimed status to "Claimed"
    const query = `
        UPDATE sales_orders
        SET claimed_status = 'Claimed'
        WHERE id = ?
    `;

    db.query(query, [orderId], (err, result) => {
        if (err) {
            console.error("Error marking order as claimed:", err);
            return res.status(500).json({ success: false, message: "Failed to mark order as claimed." });
        }

        res.status(200).json({
            success: true,
            message: "Order marked as claimed."
        });
    });
});


// Helper Function: Generate Receipt as PDF
async function generateReceiptPDF(data) {
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    const page = pdfDoc.addPage([400, 600]);
    const { customerName, services, numberOfLoads, detergentCount, fabricSoftenerCount, additionalFees, totalCost } = data;

    // Explicitly convert additionalFees to a number
    const additionalFeesNumeric = Number(additionalFees) || PRICING.plasticFee;

    const detergentAmount = (detergentCount || 0) * PRICING.detergentCost;
    const fabricSoftenerAmount = (fabricSoftenerCount || 0) * PRICING.fabricSoftenerCost;

    const currentDate = new Date();
    const formattedDate = `${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`;

    page.drawText("STARWASH RECEIPT", { x: 150, y: 550, size: 16, font: timesRomanFont, color: rgb(0, 0, 0) });
    page.drawText(`Customer Name: ${customerName}`, { x: 50, y: 500, size: 12, font: timesRomanFont });
    page.drawText(`Service: ${services}`, { x: 50, y: 480, size: 12, font: timesRomanFont });
    page.drawText(`Loads (${numberOfLoads} loads): PHP ${numberOfLoads * PRICING.services[services]}`, {
        x: 50,
        y: 460,
        size: 12,
        font: timesRomanFont,
    });
    page.drawText(`Detergent: PHP ${detergentAmount}`, { x: 50, y: 440, size: 12, font: timesRomanFont });
    page.drawText(`Fabric Softener: PHP ${fabricSoftenerAmount}`, { x: 50, y: 420, size: 12, font: timesRomanFont });
    page.drawText(`Plastic Fee: PHP ${additionalFeesNumeric.toFixed(2)}`, { x: 50, y: 400, size: 12, font: timesRomanFont });
    page.drawText(`Total Amount: PHP ${totalCost.toFixed(2)}`, { x: 50, y: 380, size: 14, font: timesRomanFont, color: rgb(1, 0, 0) });
    page.drawText(`Date: ${formattedDate}`, { x: 50, y: 360, size: 10, font: timesRomanFont });

    return await pdfDoc.save();
}


module.exports = router;
