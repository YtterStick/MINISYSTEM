const express = require("express");
const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib"); // Import pdf-lib directly

const isAuthenticated = require("../middleware/auth");

const router = express.Router();

// Process sales order (save or generate receipt)
router.post("/process", isAuthenticated, async (req, res) => {
    const {
        userId,
        customerName,
        numberOfLoads,
        services,
        detergentCount,
        fabricSoftenerCount,
        paymentStatus,
    } = req.body;

    const serviceCosts = {
        Wash: 50,
        Dry: 40,
        "Wash & Dry": 80,
        "Special Service": 100,
    };

    const baseCost = serviceCosts[services] || 0;
    const additionalFees = 3.0; // Plastic fee
    const totalCost =
        numberOfLoads * baseCost +
        (detergentCount || 0) * 10 +
        (fabricSoftenerCount || 0) * 15 +
        additionalFees;

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
            additionalFees,
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
                        additionalFees,
                        totalCost,
                    });

                    const receiptFileName = `receipt_${result.insertId}.pdf`; // Use the insertId from the result
                    const filePath = path.join(__dirname, "../receipts", receiptFileName); // Ensure correct file path

                    // Save the PDF
                    fs.writeFileSync(filePath, pdf);

                    res.status(200).json({
                        success: true,
                        message: "Transaction processed successfully.",
                        receipt: `/receipts/${receiptFileName}`, // Serve it via the /receipts path
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
});

// Helper Function: Generate Receipt as PDF
async function generateReceiptPDF(data) {
    const pdfDoc = await PDFDocument.create();

    // Use the built-in Times-Roman font
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman); // Use Times-Roman instead of Helvetica

    const page = pdfDoc.addPage([400, 600]);
    const { customerName, services, numberOfLoads, detergentCount, fabricSoftenerCount, additionalFees, totalCost } = data;

    const serviceCosts = {
        Wash: 50,
        Dry: 40,
        "Wash & Dry": 80,
        "Special Service": 100,
    };

    const baseCost = serviceCosts[services] || 0;
    const detergentAmount = (detergentCount || 0) * 10;
    const fabricSoftenerAmount = (fabricSoftenerCount || 0) * 15;

    // Ensure totalCost is treated as a number
    const totalAmount = parseFloat(totalCost) || 0; // Ensure it's a valid number

    // Ensure additionalFees is treated as a number
    const plasticFee = parseFloat(additionalFees) || 0; // Default to 0 if NaN

    // Get current date and time
    const currentDate = new Date();
    const formattedDate = `${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`;

    // Draw the header
    page.drawText("STARWASH RECEIPT", {
        x: 150,
        y: 550,
        size: 16,
        font: timesRomanFont,
        color: rgb(0, 0, 0)
    });

    // Customer info
    page.drawText(`Customer Name: ${customerName}`, {
        x: 50,
        y: 500,
        size: 12,
        font: timesRomanFont,
    });

    // Service info
    page.drawText(`Service: ${services}`, {
        x: 50,
        y: 480,
        size: 12,
        font: timesRomanFont,
    });

    // Breakdown of costs
    page.drawText(`Loads (${numberOfLoads} loads): PHP ${baseCost * numberOfLoads}`, {
        x: 50,
        y: 460,
        size: 12,
        font: timesRomanFont,
    });

    page.drawText(`Detergent: PHP ${detergentAmount}`, {
        x: 50,
        y: 440,
        size: 12,
        font: timesRomanFont,
    });

    page.drawText(`Fabric Softener: PHP ${fabricSoftenerAmount}`, {
        x: 50,
        y: 420,
        size: 12,
        font: timesRomanFont,
    });

    page.drawText(`Plastic Fee: PHP ${plasticFee.toFixed(2)}`, {
        x: 50,
        y: 400,
        size: 12,
        font: timesRomanFont,
    });

    // Total cost
    page.drawText(`Total Amount: PHP ${totalAmount.toFixed(2)}`, { // Ensure to use .toFixed() on a valid number
        x: 50,
        y: 380,
        size: 14,
        font: timesRomanFont,
        color: rgb(1, 0, 0)
    });

    // Date and time of the transaction
    page.drawText(`Date: ${formattedDate}`, {
        x: 50,
        y: 360,
        size: 10,
        font: timesRomanFont,
    });

    return await pdfDoc.save();
}


// Route to fetch all unpaid transactions
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

// Route to mark a transaction as paid
router.post("/mark-paid/:orderId", isAuthenticated, (req, res) => {
    const { orderId } = req.params;
    const db = req.app.get("db");

    // Update the payment status to "Paid"
    const query = `
        UPDATE sales_orders
        SET payment_status = 'Paid'
        WHERE id = ?
    `;

    db.query(query, [orderId], async (err, result) => {
        if (err) {
            console.error("Error updating payment status:", err);
            return res.status(500).json({ success: false, message: "Failed to update payment status." });
        }

        // After updating the status, generate the receipt
        const orderQuery = `
            SELECT * FROM sales_orders WHERE id = ?
        `;
        db.query(orderQuery, [orderId], async (err, order) => {
            if (err) {
                console.error("Error fetching order details:", err);
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
                    additionalFees: orderData.additional_fees,
                    totalCost: orderData.total_cost,
                });

                const receiptFileName = `receipt_${orderId}.pdf`;
                const filePath = path.join(__dirname, "../receipts", receiptFileName);

                // Save the generated PDF
                fs.writeFileSync(filePath, pdf);

                // Respond with the PDF path
                res.status(200).json({
                    success: true,
                    message: "Transaction marked as paid and receipt generated.",
                    receipt: `/receipts/${receiptFileName}`,
                });
            } catch (err) {
                console.error("Error generating receipt:", err);
                return res.status(500).json({ success: false, message: "Failed to generate receipt." });
            }
        });
    });
});

module.exports = router;
