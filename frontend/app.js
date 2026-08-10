let products = [];
let cart = [];

let currentSubtotal = 0;
let currentGrandTotal = 0;


// ========================================
// LOAD PRODUCTS
// ========================================

async function loadProducts() {
    try {
        const response = await fetch("/products");

        if (!response.ok) {
            throw new Error("Failed to load products.");
        }

        products = await response.json();

        displayProducts(products);

    } catch (error) {
        console.error(error);

        document.getElementById("productList").innerHTML =
            "<p>Unable to load products.</p>";
    }
}


// ========================================
// DISPLAY PRODUCTS
// ========================================

function displayProducts(productList) {
    const container = document.getElementById("productList");

    container.innerHTML = "";

    productList.forEach(product => {
        const card = document.createElement("div");

        card.className = "product-card";

        card.innerHTML = `
            <h3>${product.product_name}</h3>

            <p>
                ${product.selling_price.toLocaleString()} MMK
            </p>

            <p class="stock">
                Stock: ${product.current_stock}
            </p>
        `;

        card.addEventListener(
            "click",
            () => addToCart(product)
        );

        container.appendChild(card);
    });
}


// ========================================
// ADD PRODUCT TO CART
// ========================================

function addToCart(product) {
    const existingItem = cart.find(
        item => item.product_id === product.product_id
    );

    if (existingItem) {
        if (existingItem.quantity < product.current_stock) {
            existingItem.quantity++;
        } else {
            alert("No more stock available.");
        }
    } else {
        if (product.current_stock > 0) {
            cart.push({
                product_id: product.product_id,
                product_name: product.product_name,
                selling_price: product.selling_price,
                current_stock: product.current_stock,
                quantity: 1
            });
        } else {
            alert("This product is out of stock.");
        }
    }

    displayCart();
}


// ========================================
// DISPLAY CART
// ========================================

function displayCart() {
    const container = document.getElementById("cartList");

    container.innerHTML = "";

    if (cart.length === 0) {
        container.innerHTML =
            '<p class="empty-cart">No items added yet.</p>';

        updateSubtotal();

        return;
    }

    cart.forEach(item => {
        const row = document.createElement("div");

        row.className = "cart-item";

        row.innerHTML = `
            <div class="cart-info">
                <h4>${item.product_name}</h4>

                <p>
                    ${item.selling_price.toLocaleString()} MMK
                </p>
            </div>

            <div class="quantity-controls">

                <button
                    onclick="changeQuantity('${item.product_id}', -1)"
                >
                    −
                </button>

                <strong>${item.quantity}</strong>

                <button
                    onclick="changeQuantity('${item.product_id}', 1)"
                >
                    +
                </button>

            </div>
        `;

        container.appendChild(row);
    });

    updateSubtotal();
}


// ========================================
// CHANGE QUANTITY
// ========================================

function changeQuantity(productId, amount) {
    const item = cart.find(
        item => item.product_id === productId
    );

    if (!item) {
        return;
    }

    item.quantity += amount;

    if (item.quantity <= 0) {
        cart = cart.filter(
            item => item.product_id !== productId
        );

    } else if (item.quantity > item.current_stock) {
        item.quantity = item.current_stock;
    }

    displayCart();
}


// ========================================
// CALCULATE TOTAL
// ========================================

function updateSubtotal() {
    currentSubtotal = cart.reduce(
        (total, item) =>
            total + item.selling_price * item.quantity,
        0
    );

    const discount =
        Number(document.getElementById("discountInput").value) || 0;

    currentGrandTotal = currentSubtotal - discount;

    if (currentGrandTotal < 0) {
        currentGrandTotal = 0;
    }

    document.getElementById("subtotal").textContent =
        currentSubtotal.toLocaleString() + " MMK";

    document.getElementById("grandTotal").textContent =
        currentGrandTotal.toLocaleString() + " MMK";

    calculateChange();
}


// ========================================
// CALCULATE CHANGE
// ========================================

function calculateChange() {
    const paymentMethod =
        document.getElementById("paymentMethod").value;

    const amountPaidInput =
        document.getElementById("amountPaidInput");

    if (paymentMethod !== "Cash") {
        amountPaidInput.value = currentGrandTotal;
        amountPaidInput.disabled = true;

        document.getElementById("changeAmount").textContent =
            "0 MMK";

        return;
    }

    amountPaidInput.disabled = false;

    const amountPaid =
        Number(amountPaidInput.value) || 0;

    const change =
        Math.max(amountPaid - currentGrandTotal, 0);

    document.getElementById("changeAmount").textContent =
        change.toLocaleString() + " MMK";
}


// ========================================
// COMPLETE SALE
// ========================================

async function completeSale() {
    const payButton =
        document.getElementById("payButton");

    if (cart.length === 0) {
        alert("Please add at least one product.");
        return;
    }

    const discount =
        Number(document.getElementById("discountInput").value) || 0;

    if (discount > currentSubtotal) {
        alert("Discount cannot be greater than subtotal.");
        return;
    }

    const paymentMethod =
        document.getElementById("paymentMethod").value;

    const amountPaid =
        Number(document.getElementById("amountPaidInput").value) || 0;

    if (
        paymentMethod === "Cash" &&
        amountPaid < currentGrandTotal
    ) {
        alert("Amount received is less than total.");
        return;
    }

    const saleData = {
        items: cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity
        })),

        discount: discount,

        payment_method: paymentMethod,

        amount_paid:
            paymentMethod === "Cash"
                ? amountPaid
                : currentGrandTotal
    };

    try {
        // Prevent accidental double payment
        payButton.disabled = true;
        payButton.textContent = "Processing...";

        const response = await fetch("/sales", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(saleData)
        });

        const result = await response.json();

        if (!response.ok) {
            alert(result.detail || "Sale failed.");
            return;
        }

        alert(
            `Sale completed!\n\n` +
            `Invoice: ${result.invoice_no}\n` +
            `Total: ${result.grand_total.toLocaleString()} MMK\n` +
            `Change: ${result.change_amount.toLocaleString()} MMK`
        );

        // Reset sale
        cart = [];

        document.getElementById("discountInput").value = 0;
        document.getElementById("paymentMethod").value = "Cash";
        document.getElementById("amountPaidInput").value = "";
        document.getElementById("amountPaidInput").disabled = false;

        displayCart();

        // Reload stock from database
        await loadProducts();

    } catch (error) {
        console.error(error);

        alert("Unable to complete sale.");

    } finally {
        payButton.disabled = false;
        payButton.textContent = "PAY";
    }
}


// ========================================
// EVENT LISTENERS
// ========================================

document
    .getElementById("discountInput")
    .addEventListener("input", updateSubtotal);


document
    .getElementById("amountPaidInput")
    .addEventListener("input", calculateChange);


document
    .getElementById("paymentMethod")
    .addEventListener("change", calculateChange);


document
    .getElementById("payButton")
    .addEventListener("click", completeSale);


// ========================================
// PRODUCT SEARCH
// ========================================

document
    .getElementById("searchInput")
    .addEventListener("input", function () {

        const search =
            this.value.trim().toLowerCase();

        const filteredProducts =
            products.filter(product =>
                product.product_name
                    .toLowerCase()
                    .includes(search)
            );

        displayProducts(filteredProducts);
    });


// ========================================
// START POS
// ========================================

loadProducts();