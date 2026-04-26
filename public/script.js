const socket = io();

const CHECKBOX_COUNT = 1000;
const container = document.getElementById("container");
const errorNotification = document.getElementById("error-notification");

// Function to show error notification
function showError(message) {
    errorNotification.textContent = message;
    errorNotification.classList.remove("hidden");
    
    // Auto-hide error after 5 seconds
    setTimeout(() => {
        errorNotification.classList.add("hidden");
    }, 5000);
}

// Function to hide error notification
function hideError() {
    errorNotification.classList.add("hidden");
}

socket.on("server:checkbox:change", ({ index, checked }) => {
    const input = document.getElementById(`checkbox-${index}`);
    if (input) input.checked = checked;
})

socket.on("server:error", (data) => {
    const errorMessage = data.error;
    showError(errorMessage);
})

window.addEventListener("load", async () => {
    const response = await fetch("/checkboxes", { method: 'GET' });
    const data = await response.json();

    if (data && data.checkboxes) {
        data.checkboxes.forEach((checked, index) => {
            const input = document.createElement("input");

            input.id = `checkbox-${index}`;
            input.checked = checked;
            input.type = "checkbox"

            input.addEventListener("change", (e) => {
                const checked = e.target.checked;
                socket.emit("client:checkbox:change", { index, checked });
            })

            container.appendChild(input);
        })
    }
})
