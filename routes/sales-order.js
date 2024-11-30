const express = require("express");
const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const isAuthenticated = require("../middleware/auth");
const router = express.Router();

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

router.post("/process", isAuthenticated("Staff"), async (req, res) => {
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

        const branchId = req.session.user.branch_id; // Retrieve branch_id from session
        const db = req.app.get("db");

        console.log("Received request data:", req.body);

        const baseCost = PRICING.services[services] || 0;
        const totalCost =
            numberOfLoads * baseCost +
            (detergentCount || 0) * PRICING.detergentCost +
            (fabricSoftenerCount || 0) * PRICING.fabricSoftenerCost +
            PRICING.plasticFee;

        const query = `
            INSERT INTO sales_orders (
                user_id, customer_name, number_of_loads, services,
                detergent_count, fabric_softener_count, additional_fees, total_cost,
                payment_status, branch_id, month_created, paid_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const monthCreated = new Date().toLocaleString("en-US", { month: "long" });

        // If payment status is "Paid," set the `paid_at` timestamp to now
        const paidAt = paymentStatus === "Paid" ? new Date() : null;

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
                branchId,
                monthCreated,
                paidAt, // Include the paid_at timestamp
            ],
            async (err, result) => {
                if (err) {
                    console.error("Error processing transaction:", err);
                    return res.status(500).json({ success: false, message: "Failed to process transaction." });
                }

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
                            createdAt: new Date(), // Use current timestamp for created_at
                            paidAt, // Use the paid_at timestamp if applicable
                            claimedAt: null, // No claimed timestamp initially
                        });

                        const receiptFileName = `receipt_${result.insertId || Date.now()}.pdf`;
                        const filePath = path.join(__dirname, "../receipts", receiptFileName);

                        fs.writeFileSync(filePath, pdf);

                        console.log("Receipt generated:", filePath);

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
                    res.status(200).json({ success: true, message: "Transaction saved as unpaid" });
                }

            }
        );
    } catch (err) {
        console.error("Error in processing request:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});
router.get("/paid", isAuthenticated("Staff"), (req, res) => {
    const { startDate, endDate, name, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const db = req.app.get("db");
    const branchId = req.session.user.branch_id; // Retrieve branch_id from session

    // Base query for paid transactions
    let query = `
        SELECT * FROM sales_orders
        WHERE branch_id = ? AND payment_status = 'Paid' AND claimed_status != 'Claimed'
    `;
    const params = [branchId];

    // Apply date filters based on 'Date Paid' (paid_at)
    if (startDate) {
        query += ` AND paid_at >= ?`;
        params.push(`${startDate} 00:00:00`); // Use start of the day
    }

    if (endDate) {
        query += ` AND paid_at <= ?`;
        params.push(`${endDate} 23:59:59`); // Use end of the day
    }

    // Apply search filter for customer name
    if (name) {
        query += ` AND customer_name LIKE ?`;
        params.push(`%${name}%`);
    }

    // Pagination and sorting by 'Date Paid' (paid_at)
    query += ` ORDER BY paid_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    db.query(query, params, (err, result) => {
        if (err) {
            console.error("Error fetching paid transactions:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch paid transactions." });
        }

        // Fetch the total number of records for pagination
        const countQuery = `SELECT COUNT(*) AS total FROM sales_orders WHERE branch_id = ? AND payment_status = 'Paid' AND claimed_status != 'Claimed'`;
        db.query(countQuery, [branchId], (err, countResult) => {
            if (err) {
                console.error("Error fetching total count:", err);
                return res.status(500).json({ success: false, message: "Failed to fetch total count." });
            }

            const totalRecords = countResult[0].total;
            res.status(200).json({
                success: true,
                transactions: result,
                totalPages: Math.ceil(totalRecords / limit), // Calculate total pages for pagination
            });
        });
    });
});


router.get("/unpaid", isAuthenticated("Staff"), (req, res) => {
    const db = req.app.get("db");

    const branchId = req.session.user.branch_id; // Retrieve branch_id from session

    const query = `
        SELECT * FROM sales_orders
        WHERE branch_id = ? AND payment_status = 'Unpaid'
        ORDER BY month_created DESC
    `;

    db.query(query, [branchId], (err, result) => {
        if (err) {
            console.error("Error fetching unpaid transactions:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch unpaid transactions." });
        }

        res.status(200).json({ success: true, transactions: result });
    });
});

router.post("/mark-paid/:orderId", isAuthenticated("Staff"), (req, res) => {
    const { orderId } = req.params;
    const db = req.app.get("db");

    const query = `
        UPDATE sales_orders
        SET payment_status = 'Paid', claimed_status = 'Unclaimed', paid_at = NOW()
        WHERE id = ? AND branch_id = ?
    `;

    db.query(query, [orderId, req.session.user.branch_id], async (err, result) => {
        if (err) {
            console.error("Error updating payment status:", err);
            return res.status(500).json({ success: false, message: "Failed to update payment status." });
        }

        const orderQuery = `
            SELECT * FROM sales_orders WHERE id = ? AND branch_id = ?
        `;
        db.query(orderQuery, [orderId, req.session.user.branch_id], async (err, order) => {
            if (err || order.length === 0) {
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
                    additionalFees: Number(orderData.additional_fees),
                    totalCost: Number(orderData.total_cost),
                    createdAt: orderData.created_at,
                    paidAt: orderData.paid_at,
                    claimedAt: orderData.claimed_at,
                });

                const receiptFileName = `receipt_${orderId}.pdf`;
                const filePath = path.join(__dirname, "../receipts", receiptFileName);

                // Save the generated PDF
                fs.writeFileSync(filePath, pdf);

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


router.post("/mark-claimed/:orderId", isAuthenticated("Staff"), (req, res) => {
    const { orderId } = req.params;
    const db = req.app.get("db");

    const query = `
        UPDATE sales_orders
        SET claimed_status = 'Claimed', claimed_at = NOW()
        WHERE id = ? AND branch_id = ?
    `;

    db.query(query, [orderId, req.session.user.branch_id], (err, result) => {
        if (err) {
            console.error("Error marking order as claimed:", err);
            return res.status(500).json({ success: false, message: "Failed to mark order as claimed." });
        }

        res.status(200).json({
            success: true,
            message: "Order marked as claimed.",
        });
    });
});
router.get("/sales-records", isAuthenticated("Staff"), (req, res) => {
    const { search, startDate, endDate, page = 1 } = req.query;
    const db = req.app.get("db");

    const branchId = req.session.user.branch_id;

    let query = `SELECT * FROM sales_orders WHERE branch_id = ?`;
    const params = [branchId];

    // Handle search functionality
    if (search) {
        query += ` AND customer_name LIKE ?`;
        params.push(`%${search}%`);
    }

    // Handle start and end date filtering
    if (startDate && endDate) {
        // Ensure the date filter includes the entire day
        query += ` AND created_at BETWEEN ? AND ?`;
        params.push(`${startDate} 00:00:00`);  // Start at the beginning of the day
        params.push(`${endDate} 23:59:59`);  // End at the last moment of the day
    }

    const limit = 10;
    const offset = (page - 1) * limit;
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    db.query(query, params, (err, result) => {
        if (err) {
            console.error("Error fetching sales records:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch sales records." });
        }

        // Query to get total count for pagination
        db.query(`SELECT COUNT(*) AS total FROM sales_orders WHERE branch_id = ?`, [branchId], (err, countResult) => {
            if (err) {
                console.error("Error fetching total count:", err);
                return res.status(500).json({ success: false, message: "Failed to fetch total count." });
            }

            const totalRecords = countResult[0].total;
            const totalPages = Math.ceil(totalRecords / limit);

            res.status(200).json({
                success: true,
                records: result,
                pages: totalPages,
            });
        });
    });
});

async function generateReceiptPDF(data) {
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    const page = pdfDoc.addPage([400, 600]);
    const {
        customerName,
        services,
        numberOfLoads,
        detergentCount,
        fabricSoftenerCount,
        additionalFees,
        totalCost,
        createdAt,
        paidAt,
        claimedAt,
    } = data;

    const additionalFeesNumeric = Number(additionalFees) || PRICING.plasticFee;

    const detergentAmount = (detergentCount || 0) * PRICING.detergentCost;
    const fabricSoftenerAmount = (fabricSoftenerCount || 0) * PRICING.fabricSoftenerCost;

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
    page.drawText(`Date Created: ${new Date(createdAt).toLocaleString()}`, { x: 50, y: 360, size: 10, font: timesRomanFont });
    if (paidAt) {
        page.drawText(`Date Paid: ${new Date(paidAt).toLocaleString()}`, { x: 50, y: 340, size: 10, font: timesRomanFont });
    }
    if (claimedAt) {
        page.drawText(`Date Claimed: ${new Date(claimedAt).toLocaleString()}`, { x: 50, y: 320, size: 10, font: timesRomanFont });
    }

    return await pdfDoc.save();
}



module.exports = router;