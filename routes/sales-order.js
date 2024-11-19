const express = require("express");
const router = express.Router();

router.post("/", (req, res) => {
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
        Wash: 95,
        Dry: 65,
        "Wash & Dry": 130,
        "Special Service": 200,
    };

    // Calculate total cost
    const baseCost = services
        .split(", ")
        .reduce((sum, service) => sum + serviceCosts[service], 0);
    const loadCost = numberOfLoads * baseCost;
    const detergentCost = detergentCount * 17; //detergent
    const fabricSoftenerCost = fabricSoftenerCount * 13; //softener
    const additionalFees = 3.00;//plasatik

    const totalCost =
        loadCost + detergentCost + fabricSoftenerCost + additionalFees;

    //Save the transaction
    const query = `
        INSERT INTO sales_orders (user_id, customer_name, number_of_loads, services, detergent_count, fabric_softener_count, additional_fees, total_cost, payment_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(
        query,
        [
            userId,
            customerName,
            numberOfLoads,
            services,
            detergentCount,
            fabricSoftenerCount,
            additionalFees,
            totalCost,
            paymentStatus,
        ],
        (err, result) => {
            if (err) {
                console.error("Error saving sales order:", err);
                return res
                    .status(500)
                    .json({ success: false, message: "Failed to save order." });
            }

            if (paymentStatus === "Paid") {
                res.status(200).json({
                    success: true,
                    message: "Receipt generated successfully!",
                });
            } else {
                res.status(200).json({
                    success: true,
                    message: "Transaction saved as unpaid.",
                });
            }
        }
    );
});
router.get("/unpaid", (req, res) => {
    const query = `
        SELECT id, customer_name, services, number_of_loads, total_cost, month_created
        FROM sales_orders WHERE payment_status = 'Unpaid'`;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching unpaid orders:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch unpaid orders.",
            });
        }

        res.status(200).json(results);
    });
});

module.exports = router;
