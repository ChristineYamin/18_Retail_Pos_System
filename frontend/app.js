let products = [];
let cart = [];

let selectedProductGroup = "ALL";

let currentSubtotal = 0;
let currentGrandTotal = 0;

// ========================================
// Add Category Button logic
// ========================================
document
    .getElementById("categorySelect")
    .addEventListener("change", function () {

        selectedProductGroup =
            this.value;

        filterProducts();
    });

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

    const container =
        document.getElementById("productList");

    container.innerHTML = "";

    productList.forEach(product => {

        const card =
            document.createElement("div");

        const isOutOfStock =
            product.current_stock <= 0;

        card.className =
            isOutOfStock
                ? "product-card out-of-stock"
                : "product-card";

        card.innerHTML = `

            <div class="product-image-area">

    <img
        src="/pos/images/products/${product.product_id}.jpg"
        alt="${product.product_name}"
        class="product-image"

        onerror="
            this.style.display='none';
            this.nextElementSibling.style.display='flex';
        "
    >

    <div
        class="product-image-placeholder"
        style="display: none;"
    >
        <span>ဝါ</span>
    </div>

</div>

            <div class="product-card-content">

                <div class="product-code">
                    ${product.product_id}
                </div>

                <h3>
                    ${product.product_name}
                </h3>

                <div class="product-price">
                    ${product.selling_price.toLocaleString()} MMK
                </div>

                ${
                    isOutOfStock
                        ? `
                            <div class="out-of-stock-label">
                                OUT OF STOCK
                            </div>
                        `
                        : `
                            <div class="stock">
                                Stock: ${product.current_stock}
                            </div>
                        `
                }

            </div>
        `;

        if (!isOutOfStock) {

            card.addEventListener(
                "click",
                () => addToCart(product)
            );
        }

        container.appendChild(card);
    });
}
    
// ========================================
// Filter Products
// ========================================

function filterProducts() {

    const search =
        document
            .getElementById("searchInput")
            .value
            .trim()
            .toLowerCase();


    const filtered =
        products.filter(product => {

            const matchesSearch =
                product.product_name
                    .toLowerCase()
                    .includes(search) ||
                product.product_id
                    .toLowerCase()
                    .includes(search);


            const matchesGroup =
                selectedProductGroup === "ALL" ||
                product.product_group_code === selectedProductGroup;


            return matchesSearch && matchesGroup;
        });


    displayProducts(filtered);
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

        showReceipt(result);

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

function showReceipt(result) {

    const saleDate = new Date(result.sale_datetime);

    document.getElementById("receiptInvoice").textContent =
        result.invoice_no;

    document.getElementById("receiptDate").textContent =
        saleDate.toLocaleDateString();

    document.getElementById("receiptTime").textContent =
        saleDate.toLocaleTimeString();


    const receiptItems =
        document.getElementById("receiptItems");

    receiptItems.innerHTML = "";


    result.items.forEach(item => {

        const element = document.createElement("div");

        element.className = "receipt-item";

        element.innerHTML = `
            <div class="receipt-item-name">
                ${item.product_name}
            </div>

            <div class="receipt-item-details">
                <span>
                    ${item.quantity}
                    ×
                    ${item.unit_price.toLocaleString()}
                </span>

                <span>
                    ${item.line_total.toLocaleString()} MMK
                </span>
            </div>
        `;

        receiptItems.appendChild(element);
    });


    document.getElementById("receiptSubtotal").textContent =
        result.subtotal.toLocaleString() + " MMK";

    document.getElementById("receiptDiscount").textContent =
        result.discount.toLocaleString() + " MMK";

    document.getElementById("receiptGrandTotal").textContent =
        result.grand_total.toLocaleString() + " MMK";

    document.getElementById("receiptPaid").textContent =
        result.amount_paid.toLocaleString() + " MMK";

    document.getElementById("receiptChange").textContent =
        result.change_amount.toLocaleString() + " MMK";

    document.getElementById("receiptPayment").textContent =
        result.payment_method;


    document
        .getElementById("receiptModal")
        .classList.add("show");
}

document
    .getElementById("closeReceiptButton")
    .addEventListener("click", function () {

        document
            .getElementById("receiptModal")
            .classList.remove("show");
    });

document
    .getElementById("printReceiptButton")
    .addEventListener("click", function () {
        window.print();
    });


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
    .addEventListener("input", filterProducts);

// ========================================
// ပရိက္ခရာ ၈-ပါး BUILDER
// ========================================

const parikkharaFixedProductIds = [
    "WW-0121", // ခါးပန်းကြိုး
    "WW-0084", // သပိတ်လွယ်
    "WW-0088", // သပိတ်ခြေ
    "WW-0126", // ရေစစ်
    "WW-0127"  // အပ်နှင့်အပ်ချည်
];


// ========================================
// FIND PRODUCT BY ID
// ========================================

function getProductById(productId) {
    return products.find(
        product => product.product_id === productId
    );
}


// ========================================
// LOAD RH + DK OPTIONS
// ========================================

function populateParikkharaOptions() {

    const rahanSelect =
        document.getElementById("parikkharaRahanSelect");

    const dukoteSelect =
        document.getElementById("parikkharaDukoteSelect");


    // Reset dropdowns
    rahanSelect.innerHTML = `
        <option value="">
            ရဟန်းဒွိစုံ ရွေးပါ
        </option>
    `;

    dukoteSelect.innerHTML = `
        <option value="">
            ဒုကုဋ် ရွေးပါ
        </option>
    `;


    // ========================================
    // ရဟန်းဒွိစုံ - RH
    // ========================================

    const rahanProducts =
        products.filter(
            product =>
                product.product_group_code === "RH"
        );


    rahanProducts.forEach(product => {

        const option =
            document.createElement("option");

        option.value =
            product.product_id;

        option.textContent =
            `${product.product_name} — ` +
            `${product.selling_price.toLocaleString()} MMK`;


        if (product.current_stock <= 0) {

            option.disabled = true;

            option.textContent +=
                " — OUT OF STOCK";
        }


        rahanSelect.appendChild(option);
    });


    // ========================================
    // ဒုကုဋ် - DK
    // ========================================

    const dukoteProducts =
        products.filter(
            product =>
                product.product_group_code === "DK"
        );


    dukoteProducts.forEach(product => {

        const option =
            document.createElement("option");

        option.value =
            product.product_id;

        option.textContent =
            `${product.product_name} — ` +
            `${product.selling_price.toLocaleString()} MMK`;


        if (product.current_stock <= 0) {

            option.disabled = true;

            option.textContent +=
                " — OUT OF STOCK";
        }


        dukoteSelect.appendChild(option);
    });
}


// ========================================
// GET CURRENT SET COMPONENTS
// ========================================

function getParikkharaComponents() {

    const rahanId =
        document
            .getElementById("parikkharaRahanSelect")
            .value;


    const dukoteId =
        document
            .getElementById("parikkharaDukoteSelect")
            .value;


    const bowlId =
        document
            .getElementById("parikkharaBowlSelect")
            .value;


    const knifeId =
        document
            .getElementById("parikkharaKnifeSelect")
            .value;


    const ids = [];


    // Selected products
    if (rahanId) {
        ids.push(rahanId);
    }

    if (dukoteId) {
        ids.push(dukoteId);
    }


    // Fixed ခါးပန်းကြိုး
    ids.push("WW-0121");


    // Selected သပိတ်
    if (bowlId) {
        ids.push(bowlId);
    }


    // Fixed သပိတ်လွယ် + သပိတ်ခြေ
    ids.push("WW-0084");
    ids.push("WW-0088");


    // Fixed ရေစစ်
    ids.push("WW-0126");


    // Selected ဓားဘူး
    if (knifeId) {
        ids.push(knifeId);
    }


    // Fixed အပ်နှင့်အပ်ချည်
    ids.push("WW-0127");


    return ids
        .map(getProductById)
        .filter(Boolean);
}


// ========================================
// UPDATE ပရိက္ခရာ TOTAL
// ========================================

function updateParikkharaTotal() {

    const components =
        getParikkharaComponents();


    const total =
        components.reduce(
            (sum, product) =>
                sum + Number(product.selling_price),
            0
        );


    document
        .getElementById("parikkharaTotal")
        .textContent =
            total.toLocaleString() + " MMK";
}


// ========================================
// RESET BUILDER
// ========================================

function resetParikkharaBuilder() {

    document
        .getElementById("parikkharaRahanSelect")
        .value = "";

    document
        .getElementById("parikkharaDukoteSelect")
        .value = "";

    document
        .getElementById("parikkharaBowlSelect")
        .value = "";

    document
        .getElementById("parikkharaKnifeSelect")
        .value = "";

    document
    .querySelectorAll(
        ".bowl-option, .knife-option"
    )
    .forEach(card => {

        card.classList.remove("selected");

    });

    updateParikkharaSelectedInfo(
    "parikkharaRahanSelect",
    "parikkharaRahanSelected",
    "parikkharaRahanPrice"
);

updateParikkharaSelectedInfo(
    "parikkharaDukoteSelect",
    "parikkharaDukoteSelected",
    "parikkharaDukotePrice"
);


    updateParikkharaTotal();
}


// ========================================
// OPEN BUILDER
// ========================================

function openParikkharaBuilder() {

    if (products.length === 0) {

        alert("Products are still loading.");

        return;
    }


    populateParikkharaOptions();

    resetParikkharaBuilder();


    document
        .getElementById("parikkharaModal")
        .style.display = "flex";
}


// ========================================
// CLOSE BUILDER
// ========================================

function closeParikkharaBuilder() {

    document
        .getElementById("parikkharaModal")
        .style.display = "none";
}


// ========================================
// CHECK REQUIRED PRODUCTS
// ========================================

function validateParikkharaBuilder() {

    const rahanId =
        document
            .getElementById("parikkharaRahanSelect")
            .value;


    const dukoteId =
        document
            .getElementById("parikkharaDukoteSelect")
            .value;


    const bowlId =
        document
            .getElementById("parikkharaBowlSelect")
            .value;


    const knifeId =
        document
            .getElementById("parikkharaKnifeSelect")
            .value;


    if (!rahanId) {

        alert("ရဟန်းဒွိစုံ ရွေးပါ။");

        return false;
    }


    if (!dukoteId) {

        alert("ဒုကုဋ် ရွေးပါ။");

        return false;
    }


    if (!bowlId) {

        alert("သပိတ် ရွေးပါ။");

        return false;
    }


    if (!knifeId) {

        alert("ဓားဘူး ရွေးပါ။");

        return false;
    }


    return true;
}


// ========================================
// BUILD COMPLETE PRODUCT ID LIST
// ========================================

function getCompleteParikkharaProductIds() {

    return [

        // 1 + 2. ရဟန်းဒွိစုံ
        document
            .getElementById("parikkharaRahanSelect")
            .value,

        // 3. ဒုကုဋ်
        document
            .getElementById("parikkharaDukoteSelect")
            .value,

        // 4. ခါးပန်းကြိုး
        "WW-0121",

        // 5. သပိတ်
        document
            .getElementById("parikkharaBowlSelect")
            .value,

        // သပိတ်လွယ်
        "WW-0084",

        // သပိတ်ခြေ
        "WW-0088",

        // 6. ရေစစ်
        "WW-0126",

        // 7. ဓားဘူး
        document
            .getElementById("parikkharaKnifeSelect")
            .value,

        // 8. အပ်နှင့်အပ်ချည်
        "WW-0127"

    ];
}


// ========================================
// CHECK STOCK BEFORE ADDING WHOLE SET
// ========================================

function checkParikkharaStock(productIds) {

    for (const productId of productIds) {

        const product =
            getProductById(productId);


        if (!product) {

            alert(
                `Product ${productId} was not found.`
            );

            return false;
        }


        const existingCartItem =
            cart.find(
                item =>
                    item.product_id === productId
            );


        const quantityAlreadyInCart =
            existingCartItem
                ? existingCartItem.quantity
                : 0;


        if (
            quantityAlreadyInCart + 1 >
            product.current_stock
        ) {

            alert(
                `${product.product_name} ` +
                "does not have enough stock."
            );

            return false;
        }
    }


    return true;
}


// ========================================
// ADD COMPLETE SET TO CART
// ========================================

function addParikkharaToCart() {

    // Check selections first
    if (!validateParikkharaBuilder()) {
        return;
    }


    const productIds =
        getCompleteParikkharaProductIds();


    // Check every component BEFORE adding anything
    if (!checkParikkharaStock(productIds)) {
        return;
    }


    // Add each real product to existing cart
    productIds.forEach(productId => {

        const product =
            getProductById(productId);

        addToCart(product);
    });


    closeParikkharaBuilder();


    alert(
        "ပရိက္ခရာ ၈-ပါး အစုံကို Current Sale ထဲ ထည့်ပြီးပါပြီ။"
    );
}

// ========================================
// SELECT သပိတ် / ဓားဘူး CARDS
// ========================================

function selectParikkharaCard(
    clickedCard,
    cardSelector,
    hiddenInputId
) {

    const productId =
        clickedCard.dataset.productId;

    const product =
        getProductById(productId);


    if (!product) {
        alert("Product not found.");
        return;
    }


    // Check real stock
    if (product.current_stock <= 0) {
        alert(
            `${product.product_name} is out of stock.`
        );
        return;
    }


    // Remove previous selection
    document
        .querySelectorAll(cardSelector)
        .forEach(card => {
            card.classList.remove("selected");
        });


    // Mark clicked card as selected
    clickedCard.classList.add("selected");


    // Save selected product ID
    document
        .getElementById(hiddenInputId)
        .value = productId;


    // Recalculate set total
    updateParikkharaTotal();
}


// ========================================
// သပိတ် CARD EVENTS
// ========================================

document
    .querySelectorAll(".bowl-option")
    .forEach(card => {

        card.addEventListener(
            "click",
            function () {

                selectParikkharaCard(
                    this,
                    ".bowl-option",
                    "parikkharaBowlSelect"
                );
            }
        );

    });


// ========================================
// ဓားဘူး CARD EVENTS
// ========================================

document
    .querySelectorAll(".knife-option")
    .forEach(card => {

        card.addEventListener(
            "click",
            function () {

                selectParikkharaCard(
                    this,
                    ".knife-option",
                    "parikkharaKnifeSelect"
                );
            }
        );

    });

// ========================================
// UPDATE RH / DK SELECTED INFORMATION
// ========================================

function updateParikkharaSelectedInfo(
    selectId,
    nameElementId,
    priceElementId
) {

    const productId =
        document.getElementById(selectId).value;

    const nameElement =
        document.getElementById(nameElementId);

    const priceElement =
        document.getElementById(priceElementId);


    if (!productId) {

        nameElement.textContent =
            "မရွေးရသေးပါ";

        priceElement.textContent =
            "—";

        return;
    }


    const product =
        getProductById(productId);


    if (!product) {

        nameElement.textContent =
            "Product not found";

        priceElement.textContent =
            "—";

        return;
    }


    nameElement.textContent =
        product.product_name;

    priceElement.textContent =
        Number(product.selling_price)
            .toLocaleString() + " MMK";
}
// ========================================
// BUILDER EVENT LISTENERS
// ========================================

document
    .getElementById("openParikkharaButton")
    .addEventListener(
        "click",
        openParikkharaBuilder
    );


document
    .getElementById("closeParikkharaButton")
    .addEventListener(
        "click",
        closeParikkharaBuilder
    );


document
    .getElementById("cancelParikkharaButton")
    .addEventListener(
        "click",
        closeParikkharaBuilder
    );


document
    .getElementById("addParikkharaButton")
    .addEventListener(
        "click",
        addParikkharaToCart
    );


// Live total

document
    .getElementById("parikkharaRahanSelect")
    .addEventListener(
        "change",
        function () {

            updateParikkharaSelectedInfo(
                "parikkharaRahanSelect",
                "parikkharaRahanSelected",
                "parikkharaRahanPrice"
            );

            updateParikkharaTotal();
        }
    );


document
    .getElementById("parikkharaDukoteSelect")
    .addEventListener(
        "change",
        function () {

            updateParikkharaSelectedInfo(
                "parikkharaDukoteSelect",
                "parikkharaDukoteSelected",
                "parikkharaDukotePrice"
            );

            updateParikkharaTotal();
        }
    );


document
    .getElementById("parikkharaBowlSelect")
    .addEventListener(
        "change",
        updateParikkharaTotal
    );


document
    .getElementById("parikkharaKnifeSelect")
    .addEventListener(
        "change",
        updateParikkharaTotal
    );


// Close when clicking dark background
document
    .getElementById("parikkharaModal")
    .addEventListener(
        "click",
        function (event) {

            if (event.target === this) {
                closeParikkharaBuilder();
            }
        }
    );
// ========================================
// START POS
// ========================================

loadProducts();